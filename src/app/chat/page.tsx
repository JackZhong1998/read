"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/context/AppContext";
import AppNav from "@/components/AppNav";
import ChatInput from "@/components/ChatInput";
import EbookReader from "@/components/EbookReader";
import LoadingDots from "@/components/LoadingDots";
import MessageList from "@/components/MessageList";
import SuggestionChips from "@/components/SuggestionChips";
import Toast from "@/components/Toast";
import ToolLoadingBanner from "@/components/ToolLoadingBanner";
import { TopicQuestionsDrawer } from "@/components/TopicQuestionsPanel";
import { getTopicQuestions } from "@/lib/questions";
import { normalizeReadingContent, normalizeChatContent, isReadingContentLeak } from "@/lib/content-utils";
import type { ReaderNavIntent } from "@/lib/reader-utils";
import {
  archiveOverflowMessages,
  buildAgentHistory,
  emptyReaderMemory,
  extractEssence,
  syncMemoryFromReadBooks,
} from "@/lib/memory";
import {
  cacheBookContent,
  consumePendingMessage,
  getBookKey,
  getReaderMemory,
  getSuggestions,
  markBookCompleted,
  saveReaderMemory,
  saveSuggestions,
  upsertReadBookFromMessage,
} from "@/lib/storage";
import type { RecommendStreamEvent, ChatMessage } from "@/lib/types";

const CHAT_SHELL = "mx-auto w-full max-w-lg px-5 sm:px-6 md:max-w-xl md:px-10 lg:max-w-2xl lg:px-12";

export default function ChatPage() {
  const router = useRouter();
  const { profile, messages, setMessages, readBooks, markBookAsRead, hydrated } = useApp();
  const [loading, setLoading] = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);
  const [toolLoading, setToolLoading] = useState<{
    tool: "tuijian" | "jingdu" | "shendu";
    bookTitle?: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [readerOpen, setReaderOpen] = useState(false);
  const [readerNav, setReaderNav] = useState<ReaderNavIntent | null>(null);
  const [readerWaiting, setReaderWaiting] = useState(false);
  const readerNavSeqRef = useRef(0);
  const [showQuestionDrawer, setShowQuestionDrawer] = useState(false);
  const [toast, setToast] = useState({ visible: false, message: "" });
  const scrollRef = useRef<HTMLDivElement>(null);
  const stickToBottomRef = useRef(true);
  const scrollGuardReadyRef = useRef(false);
  const scrollRafRef = useRef<number | null>(null);
  const toastedBooksRef = useRef<Set<string>>(new Set());

  const hasConversation = messages.some((m) => m.role === "user");

  const suggestionsBootstrappedRef = useRef(false);
  const memoryBootstrappedRef = useRef(false);

  const updateSuggestions = useCallback((next: string[], sourceType?: string) => {
    setSuggestions(next);
    if (next.length > 0) {
      saveSuggestions(next, sourceType);
    }
  }, []);

  const fetchSuggestions = useCallback(
    async (contentType: string, lastContent: string, currentMessages: ChatMessage[]) => {
      if (!profile) return;
      setSuggestionsLoading(true);
      try {
        const context = currentMessages
          .slice(-8)
          .map((m) => {
            const body =
              m.type === "jingdu" || m.type === "shendu" || m.type === "rec"
                ? normalizeReadingContent(m.content)
                : m.content;
            return `${m.role}/${m.type}: ${body.slice(0, 200)}`;
          })
          .join("\n");
        const normalizedLast =
          contentType === "jingdu" || contentType === "shendu" || contentType === "rec"
            ? normalizeReadingContent(lastContent)
            : lastContent;
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context: context + "\n" + normalizedLast,
            profile,
            contentType,
            readBooks,
          }),
        });
        if (!res.ok) {
          console.error("Suggestions API failed:", res.status);
          setSuggestions(getSuggestions());
          return;
        }
        const data = (await res.json()) as { suggestions?: string[] };
        const next = data.suggestions ?? [];
        if (next.length > 0) {
          updateSuggestions(next, contentType);
        } else {
          setSuggestions(getSuggestions());
        }
      } catch (error) {
        console.error("Suggestions fetch error:", error);
        setSuggestions(getSuggestions());
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [profile, readBooks, updateSuggestions]
  );

  useEffect(() => {
    if (!hydrated) return;
    setSuggestions(getSuggestions());
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated || memoryBootstrappedRef.current) return;
    memoryBootstrappedRef.current = true;

    let memory = getReaderMemory() ?? emptyReaderMemory();
    memory = archiveOverflowMessages(memory, messages);
    memory = syncMemoryFromReadBooks(memory, readBooks);
    saveReaderMemory(memory);
  }, [hydrated, messages, readBooks]);

  useEffect(() => {
    if (!hydrated || !profile || suggestionsBootstrappedRef.current) return;
    suggestionsBootstrappedRef.current = true;

    if (getSuggestions().length > 0) return;

    const lastAssistant = [...messages]
      .reverse()
      .find((m) => m.role === "assistant" && !m.streaming);
    if (!lastAssistant) return;

    const content =
      lastAssistant.type === "jingdu" ||
      lastAssistant.type === "shendu" ||
      lastAssistant.type === "rec"
        ? normalizeReadingContent(lastAssistant.content)
        : lastAssistant.content;

    void fetchSuggestions(lastAssistant.type, content, messages);
  }, [hydrated, profile, messages, fetchSuggestions]);

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace("/");
    }
  }, [hydrated, profile, router]);

  // 预热 API 路由，避免首条消息触发编译 + HMR 全页重载导致 fetch 中断
  useEffect(() => {
    if (!hydrated) return;
    void fetch("/api/recommend").catch(() => {});
    void fetch("/api/suggestions").catch(() => {});
  }, [hydrated]);

  useLayoutEffect(() => {
    if (!hydrated || readerOpen || !hasConversation) return;
    const el = scrollRef.current;
    const content = el?.firstElementChild;
    if (!el || !content) return;

    scrollGuardReadyRef.current = false;
    stickToBottomRef.current = true;

    const snap = () => {
      el.scrollTop = el.scrollHeight;
    };

    snap();

    const ro = new ResizeObserver(() => {
      if (!scrollGuardReadyRef.current) snap();
    });
    ro.observe(content);

    const doneTimer = window.setTimeout(() => {
      snap();
      scrollGuardReadyRef.current = true;
      ro.disconnect();
    }, 150);

    return () => {
      ro.disconnect();
      clearTimeout(doneTimer);
    };
  }, [hydrated, hasConversation, readerOpen]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      if (!scrollGuardReadyRef.current) return;
      stickToBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 96;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [hydrated]);

  useEffect(() => {
    if (readerOpen) return;
    const el = scrollRef.current;
    if (!el || !stickToBottomRef.current) return;

    const isStreaming =
      streamingActive || messages.some((m) => m.role === "assistant" && m.streaming);

    if (isStreaming) {
      if (scrollRafRef.current != null) cancelAnimationFrame(scrollRafRef.current);
      scrollRafRef.current = requestAnimationFrame(() => {
        scrollRafRef.current = null;
        const box = scrollRef.current;
        if (!box || !stickToBottomRef.current) return;
        box.scrollTop = box.scrollHeight;
      });
      return () => {
        if (scrollRafRef.current != null) {
          cancelAnimationFrame(scrollRafRef.current);
          scrollRafRef.current = null;
        }
      };
    }

    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages, loading, readerOpen, toolLoading, streamingActive]);

  const requestReaderNav = useCallback((chapterId: string) => {
    readerNavSeqRef.current += 1;
    setReaderNav({ chapterId, seq: readerNavSeqRef.current });
  }, []);

  const persistMemoryArchive = useCallback(
    (msgs: ChatMessage[]) => {
      let memory = archiveOverflowMessages(getReaderMemory() ?? emptyReaderMemory(), msgs);
      memory = syncMemoryFromReadBooks(memory, readBooks);
      saveReaderMemory(memory);
      return memory;
    },
    [readBooks]
  );

  const syncReadBook = useCallback(
    (item: { type: string; content: string; book?: ChatMessage["book"] }) => {
      if (!item.book || (item.type !== "jingdu" && item.type !== "shendu")) return;
      const essence = extractEssence(item.type as "jingdu" | "shendu", item.content);
      const entry = upsertReadBookFromMessage(
        item.book,
        item.type as "jingdu" | "shendu",
        item.content,
        essence
      );
      markBookAsRead(entry);
    },
    [markBookAsRead]
  );

  const finalizeAssistantMessage = useCallback(
    (
      item: { id: string; type: string; content: string; book?: ChatMessage["book"] },
      base: ChatMessage[]
    ) => {
      const content =
        item.type === "jingdu" || item.type === "shendu"
          ? normalizeReadingContent(item.content)
          : item.type === "chat"
            ? normalizeChatContent(item.content)
            : item.content;

      if (item.type === "chat" && (!content || isReadingContentLeak(content))) {
        return base.filter((m) => m.id !== item.id);
      }

      const existingIdx = base.findIndex((m) => m.id === item.id);
      let next: ChatMessage[];

      if (existingIdx >= 0) {
        next = base.map((m) =>
          m.id === item.id ? { ...m, content, streaming: false } : m
        );
      } else {
        if (item.type === "jingdu" || item.type === "shendu") {
          const dup = base.some(
            (m) =>
              m.type === item.type &&
              m.book?.title === item.book?.title &&
              m.book?.author === item.book?.author
          );
          if (dup) return base;
        }

        const msg: ChatMessage = {
          id: item.id,
          role: "assistant",
          type: item.type as ChatMessage["type"],
          content,
          book: item.book,
          timestamp: Date.now(),
          streaming: false,
        };
        next = [...base, msg];
      }

      setMessages(next);
      syncReadBook({ type: item.type, content, book: item.book });
      if (item.book && content) {
        cacheBookContent(
          getBookKey(item.book.title, item.book.author),
          item.book,
          item.type as "rec" | "jingdu" | "shendu",
          content
        );
      }
      return next;
    },
    [setMessages, syncReadBook]
  );

  const appendStreamingDelta = useCallback(
    (id: string, delta: string, base: ChatMessage[]) => {
      const existingIdx = base.findIndex((m) => m.id === id);
      if (existingIdx < 0) return base;
      const next = base.map((m) =>
        m.id === id ? { ...m, content: m.content + delta, streaming: true } : m
      );
      setMessages(next);
      return next;
    },
    [setMessages]
  );

  const startStreamingMessage = useCallback(
    (
      item: { id: string; type: string; book?: ChatMessage["book"] },
      base: ChatMessage[]
    ) => {
      if (base.some((m) => m.id === item.id)) return base;

      if (item.type === "jingdu" || item.type === "shendu") {
        const dup = base.some(
          (m) =>
            m.type === item.type &&
            m.book?.title === item.book?.title &&
            m.book?.author === item.book?.author
        );
        if (dup) return base;
      }

      const msg: ChatMessage = {
        id: item.id,
        role: "assistant",
        type: item.type as ChatMessage["type"],
        content: "",
        book: item.book,
        timestamp: Date.now(),
        streaming: true,
      };
      const next = [...base, msg];
      setMessages(next);
      return next;
    },
    [setMessages]
  );

  const findNavChapterId = useCallback((msgs: ChatMessage[]): string => {
    const lastContent = [...msgs].reverse().find(
      (m) =>
        m.role === "assistant" &&
        (m.type === "jingdu" || m.type === "shendu" || m.type === "rec")
    );
    return lastContent?.id ?? "tail";
  }, []);

  const formatRequestError = (error: unknown): string => {
    if (!(error instanceof Error)) return "出了点问题，请稍后再试";
    if (error.message === "Failed to fetch" || error.name === "AbortError") {
      return "网络连接中断，请重试";
    }
    if (/服务暂时不可用/.test(error.message)) {
      return "服务正在编译，请稍后重试";
    }
    return error.message;
  };

  const isRetryableNetworkError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    if (error.message === "Failed to fetch" || error.name === "AbortError") return true;
    if (/服务暂时不可用|服务正在编译/.test(error.message)) return true;
    return false;
  };

  const consumeRecommendStream = async (
    res: Response,
    onEvent: (event: RecommendStreamEvent) => void
  ) => {
    const reader = res.body?.getReader();
    if (!reader) throw new Error("无法读取响应流");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.trim()) continue;
        let event: RecommendStreamEvent;
        try {
          event = JSON.parse(line) as RecommendStreamEvent;
        } catch {
          continue;
        }
        onEvent(event);
      }
    }
  };

  const sendMessage = useCallback(
    async (text: string, fromReader = false) => {
      if (!profile || loading) return;

      const userMsg: ChatMessage = {
        id: uuidv4(),
        role: "user",
        type: "chat",
        content: text,
        timestamp: Date.now(),
      };
      let currentMessages = [...messages, userMsg];
      setMessages(currentMessages);
      stickToBottomRef.current = true;

      persistMemoryArchive(currentMessages);

      setLoading(true);
      setStreamingActive(false);
      setToolLoading(null);
      setSuggestions([]);

      if (fromReader) {
        setReaderWaiting(true);
        requestReaderNav("waiting");
      }

      let readerNavigated = false;

      const history = buildAgentHistory(currentMessages);

      const readerMemory = getReaderMemory() ?? emptyReaderMemory();

      const requestPayload = {
        message: text,
        history,
        profile,
        readBooks,
        readerMemory,
        stream: true,
      };

      const runOnce = async () => {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          let errMsg = `服务暂时不可用 (${res.status})`;
          try {
            const err = await res.json();
            errMsg = err.error ?? errMsg;
          } catch {
            // dev 模式下 HMR 可能返回 HTML 错误页
          }
          throw new Error(errMsg);
        }

        let lastItem: { type: string; content: string } | null = null;
        let sugSource: { type: string; content: string } | null = null;

        await consumeRecommendStream(res, (event) => {
          if (event.event === "tool_loading") {
            setToolLoading({ tool: event.tool, bookTitle: event.book?.title });
          } else if (event.event === "message_start") {
            setToolLoading(null);
            setStreamingActive(true);
            currentMessages = startStreamingMessage(
              { id: event.id, type: event.type, book: event.book },
              currentMessages
            );
            if (
              fromReader &&
              (event.type === "jingdu" || event.type === "shendu")
            ) {
              setReaderWaiting(false);
              requestReaderNav(event.id);
              readerNavigated = true;
            }
          } else if (event.event === "message_delta") {
            setToolLoading(null);
            setStreamingActive(true);
            currentMessages = appendStreamingDelta(event.id, event.delta, currentMessages);
          } else if (event.event === "message_done") {
            currentMessages = finalizeAssistantMessage(
              {
                id: event.id,
                type: event.type,
                content: event.content,
                book: event.book,
              },
              currentMessages
            );
            lastItem = { type: event.type, content: event.content };
            if (event.type === "rec" || event.type === "jingdu" || event.type === "shendu") {
              sugSource = lastItem;
            }
            if (
              fromReader &&
              (event.type === "jingdu" || event.type === "shendu")
            ) {
              setReaderWaiting(false);
              const target = currentMessages.find((m) => m.id === event.id);
              if (target) {
                requestReaderNav(target.id);
                readerNavigated = true;
              }
            }
          } else if (event.event === "error") {
            throw new Error(event.message);
          }
        });

        return { lastItem, sugSource };
      };

      try {
        let result: { lastItem: { type: string; content: string } | null; sugSource: { type: string; content: string } | null };
        try {
          result = await runOnce();
        } catch (firstError) {
          if (!isRetryableNetworkError(firstError)) throw firstError;
          await new Promise((r) => setTimeout(r, 800));
          result = await runOnce();
        }

        if (fromReader) {
          setReaderWaiting(false);
          if (!readerNavigated) {
            requestReaderNav(findNavChapterId(currentMessages));
          }
        }

        const sugItem = result.sugSource ?? result.lastItem;
        if (sugItem) {
          const sugContent =
            sugItem.type === "jingdu" || sugItem.type === "shendu" || sugItem.type === "rec"
              ? normalizeReadingContent(sugItem.content)
              : sugItem.content;
          await fetchSuggestions(sugItem.type, sugContent, currentMessages);
        }

        persistMemoryArchive(currentMessages);
      } catch (error) {
        setMessages([
          ...currentMessages,
          {
            id: uuidv4(),
            role: "assistant",
            type: "chat",
            content: formatRequestError(error),
            timestamp: Date.now(),
          },
        ]);
      } finally {
        setLoading(false);
        setStreamingActive(false);
        setToolLoading(null);
        setReaderWaiting(false);
      }
    },
    [profile, loading, readBooks, messages, setMessages, fetchSuggestions, finalizeAssistantMessage, appendStreamingDelta, startStreamingMessage, findNavChapterId, requestReaderNav, persistMemoryArchive]
  );

  const pendingSentRef = useRef(false);
  useEffect(() => {
    if (!hydrated || !profile || pendingSentRef.current || loading) return;
    const pending = consumePendingMessage();
    if (pending) {
      pendingSentRef.current = true;
      void sendMessage(pending);
    }
  }, [hydrated, profile, loading, sendMessage]);

  const handleReachEnd = useCallback(
    (msg: ChatMessage) => {
      if (!msg.book || msg.type !== "jingdu") return;
      const bookId = `${msg.book.title}::${msg.book.author}::jingdu`;
      if (toastedBooksRef.current.has(bookId)) return;

      const completed = markBookCompleted(bookId);
      if (completed) {
        markBookAsRead(completed);
        toastedBooksRef.current.add(bookId);
        setToast({
          visible: true,
          message: `恭喜！你又读完一本《${msg.book.title}》，向前迈进了一步 🎉`,
        });
      }
    },
    [markBookAsRead]
  );

  if (!hydrated || !profile) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  const questions = getTopicQuestions(profile.gender, profile.ageGroup);

  return (
    <div className="flex h-dvh flex-col bg-cream">
      <AppNav subtitle={`已读 ${readBooks.length} 篇`} />

      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        <div className={CHAT_SHELL}>
        {!hasConversation && !loading ? (
          <div className="flex flex-1 flex-col items-center justify-center px-2 py-12">
            <div className="mb-6 text-center">
              <div className="mb-3 text-4xl">🌿</div>
              <p className="font-serif text-lg text-ink-light">从一个困惑开始</p>
              <p className="mt-1 text-sm text-ink-muted">在发现页找到共鸣，或直接输入你的问题</p>
            </div>
            <button
              onClick={() => router.push("/discover")}
              className="mb-4 rounded-full bg-accent px-6 py-3 text-sm text-white hover:bg-accent-dark"
            >
              去发现解忧书单
            </button>
            <button
              onClick={() => setShowQuestionDrawer(true)}
              className="text-sm text-ink-muted underline-offset-2 hover:text-accent hover:underline"
            >
              查看我的年龄段困惑
            </button>
          </div>
        ) : (
          <>
            <MessageList
              messages={messages}
              onFullscreen={(msg) => {
                setReaderOpen(true);
                requestReaderNav(msg.id);
              }}
            />
            {(toolLoading || (loading && !streamingActive)) && (
              <div className="min-h-[52px]">
                {toolLoading ? (
                  <ToolLoadingBanner tool={toolLoading.tool} bookTitle={toolLoading.bookTitle} />
                ) : (
                  <LoadingDots text="正在思考..." />
                )}
              </div>
            )}
          </>
        )}
        </div>
      </div>

      {!readerOpen && (
        <div className="border-t border-paper bg-white/95 backdrop-blur-sm">
          <div className={CHAT_SHELL}>
          <SuggestionChips
            suggestions={suggestions}
            onSelect={sendMessage}
            loading={suggestionsLoading}
            padded={false}
          />
          <ChatInput onSend={sendMessage} disabled={loading} padded={false} />
          </div>
        </div>
      )}

      {readerOpen && (
        <EbookReader
          key={readerNav?.seq ?? "reader"}
          messages={messages}
          suggestions={suggestions}
          suggestionsLoading={suggestionsLoading}
          chatLoading={loading}
          toolLoading={toolLoading}
          onSendMessage={(text) => sendMessage(text, true)}
          withTailPage
          withWaitingChapter={readerWaiting}
          navIntent={readerNav}
          onClose={() => {
            setReaderOpen(false);
            setReaderNav(null);
            setReaderWaiting(false);
            readerNavSeqRef.current = 0;
          }}
          onReachEnd={handleReachEnd}
        />
      )}

      {showQuestionDrawer && (
        <TopicQuestionsDrawer
          questions={questions}
          onSelect={(q) => sendMessage(q.prompt)}
          disabled={loading}
          onClose={() => setShowQuestionDrawer(false)}
        />
      )}

      <Toast
        message={toast.message}
        visible={toast.visible}
        onClose={() => setToast({ visible: false, message: "" })}
      />
    </div>
  );
}
