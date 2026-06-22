import "server-only";

import { randomUUID } from "crypto";
import {
  detectReadingIntent,
  extractBookFromContext,
  isReadingContentLeak,
  normalizeChatContent,
} from "@/lib/content-utils";
import { AGENT_TOOLS, callMoonshotStream, type ChatMessageParam } from "@/lib/moonshot";
import { compressToolResult } from "@/lib/memory";
import { fillPrompt, MAIN_AGENT_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateJingdu, generateShendu, generateTuijian } from "@/lib/reading-tools";
import type { BookInfo, ReadBook, ReaderMemory, RecommendStreamEvent, UserProfile } from "@/lib/types";

export interface RecommendResultItem {
  type: "chat" | "rec" | "jingdu" | "shendu";
  content: string;
  book?: BookInfo;
}

export type { RecommendStreamEvent };

type AgentToolName = "tuijian" | "jingdu" | "shendu";
type ContentMessageType = "rec" | "jingdu" | "shendu";

interface ChatSlot {
  id: string;
  length: number;
  finished: boolean;
}

class StreamMessageEmitter {
  private chatSlots: ChatSlot[] = [];
  private activeChatIndex = -1;
  private contentActiveIds = new Map<ContentMessageType, string>();
  private contentLengths = new Map<ContentMessageType, number>();
  private contentFinished = new Set<ContentMessageType>();

  constructor(private emit: (event: RecommendStreamEvent) => void) {}

  private ensureActiveChat(): ChatSlot {
    const current = this.chatSlots[this.activeChatIndex];
    if (current && !current.finished) return current;

    const id = randomUUID();
    const slot: ChatSlot = { id, length: 0, finished: false };
    this.chatSlots.push(slot);
    this.activeChatIndex = this.chatSlots.length - 1;
    this.emit({ event: "message_start", id, type: "chat" });
    return slot;
  }

  pushChatDelta(nextText: string) {
    const slot = this.ensureActiveChat();
    if (nextText.length <= slot.length) return;

    const delta = nextText.slice(slot.length);
    slot.length = nextText.length;
    this.emit({ event: "message_delta", id: slot.id, delta });
  }

  finishActiveChat(content: string): RecommendResultItem | null {
    const trimmed = content.trim();
    if (!trimmed) return null;

    const slot = this.ensureActiveChat();
    if (slot.finished) return null;

    this.emit({ event: "message_done", id: slot.id, type: "chat", content: trimmed });
    slot.finished = true;

    return { type: "chat", content: trimmed };
  }

  /** 工具调用前放弃未完成的空 chat 流，避免与收尾话合并 */
  abandonIncompleteChat() {
    const slot = this.chatSlots[this.activeChatIndex];
    if (!slot || slot.finished) return;
    slot.finished = true;
    this.activeChatIndex = -1;
  }

  pushContentDelta(type: ContentMessageType, nextText: string, book?: BookInfo) {
    if (this.contentFinished.has(type)) return;

    const prevLen = this.contentLengths.get(type) ?? 0;
    if (nextText.length <= prevLen) return;

    const delta = nextText.slice(prevLen);
    this.contentLengths.set(type, nextText.length);

    let id = this.contentActiveIds.get(type);
    if (!id) {
      id = randomUUID();
      this.contentActiveIds.set(type, id);
      this.emit({ event: "message_start", id, type, book });
    }

    this.emit({ event: "message_delta", id, delta });
  }

  finishContent(
    type: ContentMessageType,
    content: string,
    book?: BookInfo
  ): RecommendResultItem | null {
    const trimmed = content.trim();
    if (!trimmed || this.contentFinished.has(type)) return null;

    const id = this.contentActiveIds.get(type) ?? randomUUID();
    if (!this.contentActiveIds.has(type)) {
      this.emit({ event: "message_start", id, type, book });
    }
    this.emit({ event: "message_done", id, type, content: trimmed, book });
    this.contentActiveIds.delete(type);
    this.contentLengths.delete(type);
    this.contentFinished.add(type);

    return { type, content: trimmed, book };
  }
}

function emitChatFromRaw(
  raw: string,
  results: RecommendResultItem[],
  streamEmitter: StreamMessageEmitter
) {
  const chatText = normalizeChatContent(raw);
  if (!chatText || isReadingContentLeak(chatText)) return;
  const item = streamEmitter.finishActiveChat(chatText);
  if (item) results.push(item);
}

async function runTool(
  fnName: AgentToolName,
  args: { direction?: string; title?: string; author?: string; intro?: string },
  profile: UserProfile,
  readBooks: ReadBook[],
  results: RecommendResultItem[],
  streamEmitter: StreamMessageEmitter,
  emit: (event: RecommendStreamEvent) => void,
  messages: ChatMessageParam[],
  toolCallId: string
) {
  if (fnName === "tuijian") {
    const direction = args.direction?.trim();
    if (!direction) return;

    emit({ event: "tool_loading", tool: "tuijian" });

    let displayBuffer = "";
    const onDisplayDelta = (delta: string) => {
      displayBuffer += delta;
      streamEmitter.pushContentDelta("rec", displayBuffer);
    };

    const toolResult = await generateTuijian(profile, direction, readBooks ?? [], onDisplayDelta);
    const resultItem = streamEmitter.finishContent("rec", toolResult);
    if (resultItem) results.push(resultItem);

    messages.push({
      role: "tool",
      tool_call_id: toolCallId,
      name: fnName,
      content: compressToolResult("tuijian", toolResult),
    });
    return;
  }

  const book: BookInfo = {
    title: args.title ?? "",
    author: args.author ?? "",
    intro: args.intro,
  };
  if (!book.title || !book.author) return;

  emit({ event: "tool_loading", tool: fnName, book });

  let displayBuffer = "";
  const onDisplayDelta = (delta: string) => {
    displayBuffer += delta;
    streamEmitter.pushContentDelta(fnName, displayBuffer, book);
  };

  const toolResult =
    fnName === "jingdu"
      ? await generateJingdu(profile, book, readBooks ?? [], onDisplayDelta)
      : await generateShendu(profile, book, readBooks ?? [], onDisplayDelta);

  const resultItem = streamEmitter.finishContent(fnName, toolResult, book);
  if (resultItem) results.push(resultItem);

  messages.push({
    role: "tool",
    tool_call_id: toolCallId,
    name: fnName,
    content: compressToolResult(fnName, toolResult, book),
  });
}

export async function runRecommendWithEvents(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  profile: UserProfile,
  readBooks: ReadBook[],
  emit: (event: RecommendStreamEvent) => void,
  readerMemory?: ReaderMemory | null
): Promise<RecommendResultItem[]> {
  const systemPrompt = fillPrompt(
    MAIN_AGENT_SYSTEM_PROMPT,
    profile,
    readBooks ?? [],
    readerMemory
  );
  const messages: ChatMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...(history ?? []).map((h) => ({
      role: h.role as "user" | "assistant",
      content: h.content,
    })),
    { role: "user", content: message },
  ];

  const results: RecommendResultItem[] = [];
  const streamEmitter = new StreamMessageEmitter(emit);
  let iterations = 0;
  const maxIterations = 5;
  const executedTools = new Set<string>();
  let pendingFollowUp = false;

  while (iterations < maxIterations) {
    iterations++;

    let accumulated = "";
    const isFollowUpRound = pendingFollowUp;
    pendingFollowUp = false;

    const assistantMsg = await callMoonshotStream(messages, {
      tools: isFollowUpRound ? undefined : AGENT_TOOLS,
      disableThinking: true,
      maxTokens: isFollowUpRound ? 256 : 1024,
      onContentDelta: (delta) => {
        accumulated += delta;
        const chatText = normalizeChatContent(accumulated);
        if (chatText && !isReadingContentLeak(chatText)) {
          streamEmitter.pushChatDelta(chatText);
        }
      },
    });

    const finishReason = assistantMsg.finish_reason;
    const toolCalls = assistantMsg.tool_calls;

    if (!isFollowUpRound && finishReason === "tool_calls" && toolCalls?.length) {
      messages.push({
        role: "assistant",
        content: assistantMsg.content ?? "",
        tool_calls: toolCalls,
        reasoning_content: assistantMsg.reasoning_content,
      });

      const rawChat = (assistantMsg.content ?? accumulated).trim();
      if (rawChat) {
        emitChatFromRaw(rawChat, results, streamEmitter);
      } else {
        streamEmitter.abandonIncompleteChat();
      }

      for (const toolCall of toolCalls) {
        const fnName = toolCall.function.name as AgentToolName;
        const args = JSON.parse(toolCall.function.arguments) as {
          direction?: string;
          title?: string;
          author?: string;
          intro?: string;
        };

        const toolKey =
          fnName === "tuijian"
            ? `tuijian:${args.direction ?? ""}`
            : `${fnName}:${args.title}:${args.author}`;
        if (executedTools.has(toolKey)) continue;
        executedTools.add(toolKey);

        await runTool(
          fnName,
          args,
          profile,
          readBooks,
          results,
          streamEmitter,
          emit,
          messages,
          toolCall.id
        );
      }

      pendingFollowUp = true;
      continue;
    }

    const content = (assistantMsg.content ?? accumulated).trim();
    if (content) {
      messages.push({
        role: "assistant",
        content,
        reasoning_content: assistantMsg.reasoning_content,
      });
      emitChatFromRaw(content, results, streamEmitter);
    }

    if (!isFollowUpRound && !pendingFollowUp) {
      const intent = detectReadingIntent(message);
      if (intent) {
        const book = extractBookFromContext(message, history, readBooks);
        if (book?.title && book.author) {
          const toolKey = `${intent}:${book.title}:${book.author}`;
          if (!executedTools.has(toolKey)) {
            executedTools.add(toolKey);
            const fallbackId = `fallback-${toolKey}`;

            messages.push({
              role: "assistant",
              content: "",
              tool_calls: [
                {
                  id: fallbackId,
                  type: "function",
                  function: {
                    name: intent,
                    arguments: JSON.stringify({
                      title: book.title,
                      author: book.author,
                      intro: book.intro,
                    }),
                  },
                },
              ],
            });

            await runTool(
              intent,
              { title: book.title, author: book.author, intro: book.intro },
              profile,
              readBooks,
              results,
              streamEmitter,
              emit,
              messages,
              fallbackId
            );

            pendingFollowUp = true;
            continue;
          }
        }
      }
    }

    break;
  }

  return results;
}
