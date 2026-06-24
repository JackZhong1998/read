"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { useApp } from "@/context/AppContext";
import { normalizeReadingContent, normalizeChatContent, isReadingContentLeak } from "@/lib/content-utils";
import {
  archiveOverflowMessages,
  buildAgentHistory,
  emptyReaderMemory,
  extractEssence,
  syncMemoryFromReadBooks,
} from "@/lib/memory";
import {
  cacheBookContent,
  getBookCache,
  getBookKey,
  getReaderMemory,
  getSuggestions,
  saveReaderMemory,
  saveSuggestions,
  upsertReadBookFromMessage,
} from "@/lib/storage";
import { buildSuggestionsContext } from "@/lib/suggestion-utils";
import type { RecommendStreamEvent, ChatMessage } from "@/lib/types";

function formatRequestError(error: unknown): string {
  if (!(error instanceof Error)) return "出了点问题，请稍后再试";
  if (error.message === "Failed to fetch" || error.name === "AbortError") {
    return "网络连接中断，请重试";
  }
  if (/服务暂时不可用/.test(error.message)) {
    return "服务正在编译，请稍后重试";
  }
  return error.message;
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  if (error.message === "Failed to fetch" || error.name === "AbortError") return true;
  if (/服务暂时不可用|服务正在编译/.test(error.message)) return true;
  return false;
}

async function consumeRecommendStream(
  res: Response,
  onEvent: (event: RecommendStreamEvent) => void
) {
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
}

export function useChatMessenger() {
  const { profile, messages, setMessages, readBooks, markBookAsRead } = useApp();
  const [loading, setLoading] = useState(false);
  const [streamingActive, setStreamingActive] = useState(false);
  const [toolLoading, setToolLoading] = useState<{
    tool: "tuijian" | "jingdu" | "shendu";
    bookTitle?: string;
  } | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);

  const hasConversation = messages.some((m) => m.role === "user");

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
        const normalizedLast =
          contentType === "jingdu" || contentType === "shendu" || contentType === "rec"
            ? normalizeReadingContent(lastContent)
            : lastContent;
        const context = buildSuggestionsContext(
          contentType,
          normalizedLast,
          currentMessages,
          readBooks,
          getBookCache()
        );
        const res = await fetch("/api/suggestions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            context,
            profile,
            contentType,
            readBooks,
          }),
        });
        if (!res.ok) {
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
      } catch {
        setSuggestions(getSuggestions());
      } finally {
        setSuggestionsLoading(false);
      }
    },
    [profile, readBooks, updateSuggestions]
  );

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
    (item: { id: string; type: string; book?: ChatMessage["book"] }, base: ChatMessage[]) => {
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

  const sendMessage = useCallback(
    async (text: string) => {
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
      persistMemoryArchive(currentMessages);

      setLoading(true);
      setStreamingActive(false);
      setToolLoading(null);
      setSuggestions([]);

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
            // ignore
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
          } else if (event.event === "error") {
            throw new Error(event.message);
          }
        });

        return { lastItem, sugSource };
      };

      try {
        let result: {
          lastItem: { type: string; content: string } | null;
          sugSource: { type: string; content: string } | null;
        };
        try {
          result = await runOnce();
        } catch (firstError) {
          if (!isRetryableNetworkError(firstError)) throw firstError;
          await new Promise((r) => setTimeout(r, 800));
          result = await runOnce();
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
      }
    },
    [
      profile,
      loading,
      readBooks,
      messages,
      setMessages,
      fetchSuggestions,
      finalizeAssistantMessage,
      appendStreamingDelta,
      startStreamingMessage,
      persistMemoryArchive,
    ]
  );

  const suggestionsBootstrappedRef = useRef(false);
  useEffect(() => {
    setSuggestions(getSuggestions());
  }, []);

  useEffect(() => {
    if (!profile || suggestionsBootstrappedRef.current) return;
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
  }, [profile, messages, fetchSuggestions]);

  return {
    profile,
    messages,
    loading,
    streamingActive,
    toolLoading,
    suggestions,
    suggestionsLoading,
    hasConversation,
    sendMessage,
  };
}
