"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/context/AppContext";
import ChatInput from "@/components/ChatInput";
import EbookReader from "@/components/EbookReader";
import LoadingDots from "@/components/LoadingDots";
import MessageList from "@/components/MessageList";
import SuggestionChips from "@/components/SuggestionChips";
import Toast from "@/components/Toast";
import ToolLoadingBanner from "@/components/ToolLoadingBanner";
import { TopicQuestionsCenter, TopicQuestionsDrawer } from "@/components/TopicQuestionsPanel";
import { getTopicQuestions } from "@/lib/questions";
import { normalizeReadingContent, normalizeChatContent, isReadingContentLeak } from "@/lib/content-utils";
import type { ReaderNavIntent } from "@/lib/reader-utils";
import {
  cacheBookContent,
  getBookKey,
  getSuggestions,
  markBookCompleted,
  saveSuggestions,
  upsertReadBookFromMessage,
} from "@/lib/storage";
import type { RecommendStreamEvent, ChatMessage } from "@/lib/types";

export default function ChatPage() {
  const router = useRouter();
  const { profile, messages, setMessages, readBooks, markBookAsRead, hydrated } = useApp();
  const [loading, setLoading] = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);
  const [toolLoading, setToolLoading] = useState<{
    tool: "jingdu" | "shendu";
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
  const toastedBooksRef = useRef<Set<string>>(new Set());

  const hasConversation = messages.some((m) => m.role === "user");

  useEffect(() => {
    if (hydrated) {
      setSuggestions(getSuggestions());
    }
  }, [hydrated]);

  const updateSuggestions = useCallback((next: string[]) => {
    setSuggestions(next);
    saveSuggestions(next);
  }, []);

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

  useEffect(() => {
    if (!readerOpen) {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    }
  }, [messages, loading, readerOpen, toolLoading]);

  const requestReaderNav = useCallback((chapterId: string) => {
    readerNavSeqRef.current += 1;
    setReaderNav({ chapterId, seq: readerNavSeqRef.current });
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
              m.type === "jingdu" || m.type === "shendu"
                ? normalizeReadingContent(m.content)
                : m.content;
            return `${m.role}/${m.type}: ${body.slice(0, 200)}`;
          })
          .join("\n");
        const normalizedLast =
          contentType === "jingdu" || contentType === "shendu"
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
        const data = await res.json();
        updateSuggestions(data.suggestions ?? []);
      } catch {
        updateSuggestions([]);
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [profile, readBooks, updateSuggestions]
  );

  const syncReadBook = useCallback(
    (item: { type: string; content: string; book?: ChatMessage["book"] }) => {
      if (!item.book || (item.type !== "jingdu" && item.type !== "shendu")) return;
      const entry = upsertReadBookFromMessage(
        item.book,
        item.type as "jingdu" | "shendu",
        item.content
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
    return error.message;
  };

  const isRetryableNetworkError = (error: unknown): boolean => {
    if (!(error instanceof Error)) return false;
    return error.message === "Failed to fetch" || error.name === "AbortError";
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
      setLoading(true);
      setStreamingActive(false);
      setToolLoading(null);
      setSuggestions([]);
      saveSuggestions([]);

      if (fromReader) {
        setReaderWaiting(true);
        requestReaderNav("waiting");
      }

      let readerNavigated = false;

      const history = currentMessages.map((m) => ({
        role: m.role,
        content:
          m.type === "chat" || m.role === "user"
            ? m.content
            : `[${m.type}] ${(m.type === "jingdu" || m.type === "shendu"
                ? normalizeReadingContent(m.content)
                : m.content
              ).slice(0, 80)}...(正文已生成，勿重复输出)`,
      }));

      const requestPayload = {
        message: text,
        history,
        profile,
        readBooks,
        stream: true,
      };

      const runOnce = async () => {
        const res = await fetch("/api/recommend", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(requestPayload),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "请求失败");
        }

        let lastItem: { type: string; content: string } | null = null;
        let sugSource: { type: string; content: string } | null = null;

        await consumeRecommendStream(res, (event) => {
          if (event.event === "tool_loading") {
            setToolLoading({ tool: event.tool, bookTitle: event.book.title });
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
          await new Promise((r) => setTimeout(r, 400));
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
            sugItem.type === "jingdu" || sugItem.type === "shendu"
              ? normalizeReadingContent(sugItem.content)
              : sugItem.content;
          await fetchSuggestions(sugItem.type, sugContent, currentMessages);
        }
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
    [profile, loading, readBooks, messages, setMessages, fetchSuggestions, finalizeAssistantMessage, appendStreamingDelta, startStreamingMessage, findNavChapterId, requestReaderNav]
  );

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
      <header className="flex items-center justify-between border-b border-paper bg-white/90 px-4 py-3 backdrop-blur-sm safe-top">
        <div>
          <h1 className="font-serif text-lg font-bold text-ink">速读</h1>
          <p className="text-xs text-ink-muted">已读 {readBooks.length} 篇</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowQuestionDrawer(true)}
            className="rounded-full border border-paper px-3 py-1.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
          >
            推荐问题
          </button>
          <button
            onClick={() => router.push("/read")}
            className="rounded-full border border-paper px-3 py-1.5 text-xs text-ink-muted hover:border-accent hover:text-accent"
          >
            已读书目
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex flex-1 flex-col overflow-y-auto">
        {!hasConversation && !loading ? (
          <TopicQuestionsCenter
            questions={questions}
            onSelect={(q) => sendMessage(q.prompt)}
            disabled={loading}
          />
        ) : (
          <>
            <MessageList
              messages={messages}
              onFullscreen={(msg) => {
                setReaderOpen(true);
                requestReaderNav(msg.id);
              }}
            />
            {toolLoading && (
              <ToolLoadingBanner tool={toolLoading.tool} bookTitle={toolLoading.bookTitle} />
            )}
            {loading && !toolLoading && !streamingActive && <LoadingDots text="正在思考..." />}
          </>
        )}
      </div>

      {!readerOpen && (
        <div className="border-t border-paper bg-white/95 backdrop-blur-sm">
          <SuggestionChips
            suggestions={suggestions}
            onSelect={sendMessage}
            loading={suggestionsLoading}
          />
          <ChatInput onSend={sendMessage} disabled={loading} />
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
