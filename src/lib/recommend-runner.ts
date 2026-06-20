import "server-only";

import { randomUUID } from "crypto";
import {
  detectReadingIntent,
  extractBookFromContext,
  extractStreamingRecommendFields,
  isReadingContentLeak,
  normalizeChatContent,
  parseRecommendResponse,
} from "@/lib/content-utils";
import {
  callMoonshotStream,
  parseJsonFromText,
  READING_TOOLS,
  type ChatMessageParam,
} from "@/lib/moonshot";
import { fillPrompt, RECOMMEND_SYSTEM_PROMPT } from "@/lib/prompts";
import { generateJingdu, generateShendu } from "@/lib/reading-tools";
import type { BookInfo, ReadBook, RecommendStreamEvent, UserProfile } from "@/lib/types";

export interface RecommendResultItem {
  type: "chat" | "rec" | "jingdu" | "shendu";
  content: string;
  book?: BookInfo;
}

export type { RecommendStreamEvent };

class StreamMessageEmitter {
  private activeIds = new Map<"chat" | "rec" | "jingdu" | "shendu", string>();
  private lengths = new Map<"chat" | "rec" | "jingdu" | "shendu", number>();
  private finishedTypes = new Set<"chat" | "rec" | "jingdu" | "shendu">();

  constructor(private emit: (event: RecommendStreamEvent) => void) {}

  pushDelta(
    type: "chat" | "rec" | "jingdu" | "shendu",
    nextText: string,
    book?: BookInfo
  ) {
    if (this.finishedTypes.has(type)) return;

    const prevLen = this.lengths.get(type) ?? 0;
    if (nextText.length <= prevLen) return;

    const delta = nextText.slice(prevLen);
    this.lengths.set(type, nextText.length);

    let id = this.activeIds.get(type);
    if (!id) {
      id = randomUUID();
      this.activeIds.set(type, id);
      this.emit({ event: "message_start", id, type, book });
    }

    this.emit({ event: "message_delta", id, delta });
  }

  finish(
    type: "chat" | "rec" | "jingdu" | "shendu",
    content: string,
    book?: BookInfo
  ): RecommendResultItem | null {
    const trimmed = content.trim();
    if (!trimmed || this.finishedTypes.has(type)) return null;

    const id = this.activeIds.get(type) ?? randomUUID();
    if (!this.activeIds.has(type)) {
      this.emit({ event: "message_start", id, type, book });
    }
    this.emit({ event: "message_done", id, type, content: trimmed, book });
    this.activeIds.delete(type);
    this.lengths.delete(type);
    this.finishedTypes.add(type);

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
  const item = streamEmitter.finish("chat", chatText);
  if (item) results.push(item);
}

async function runTool(
  fnName: "jingdu" | "shendu",
  book: BookInfo,
  profile: UserProfile,
  readBooks: ReadBook[],
  results: RecommendResultItem[],
  streamEmitter: StreamMessageEmitter,
  emit: (event: RecommendStreamEvent) => void,
  messages: ChatMessageParam[],
  toolCallId: string
) {
  emit({ event: "tool_loading", tool: fnName, book });

  let displayBuffer = "";
  const onDisplayDelta = (delta: string) => {
    displayBuffer += delta;
    streamEmitter.pushDelta(fnName, displayBuffer, book);
  };

  const toolResult =
    fnName === "jingdu"
      ? await generateJingdu(profile, book, readBooks ?? [], onDisplayDelta)
      : await generateShendu(profile, book, readBooks ?? [], onDisplayDelta);

  const resultItem = streamEmitter.finish(fnName, toolResult, book);
  if (resultItem) results.push(resultItem);

  messages.push({
    role: "tool",
    tool_call_id: toolCallId,
    name: fnName,
    content: toolResult,
  });

  return toolResult;
}

export async function runRecommendWithEvents(
  message: string,
  history: Array<{ role: "user" | "assistant"; content: string }>,
  profile: UserProfile,
  readBooks: ReadBook[],
  emit: (event: RecommendStreamEvent) => void
): Promise<RecommendResultItem[]> {
  const systemPrompt = fillPrompt(RECOMMEND_SYSTEM_PROMPT, profile, readBooks ?? []);
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
  let hadToolResults = false;

  while (iterations < maxIterations) {
    iterations++;

    let accumulated = "";
    const prevFields = { chat: "", rec: "" };

    const assistantMsg = await callMoonshotStream(messages, {
      tools: READING_TOOLS,
      disableThinking: true,
      maxTokens: 4096,
      onContentDelta: (delta) => {
        accumulated += delta;
        const fields = extractStreamingRecommendFields(accumulated);
        if (fields.chat.length > prevFields.chat.length) {
          const chatText = normalizeChatContent(fields.chat);
          if (chatText && !isReadingContentLeak(chatText)) {
            streamEmitter.pushDelta("chat", chatText);
            prevFields.chat = fields.chat;
          }
        }
        if (fields.rec.length > prevFields.rec.length) {
          streamEmitter.pushDelta("rec", fields.rec);
          prevFields.rec = fields.rec;
        }
      },
    });

    const finishReason = assistantMsg.finish_reason;
    const toolCalls = assistantMsg.tool_calls;

    if (finishReason === "tool_calls" && toolCalls?.length) {
      messages.push({
        role: "assistant",
        content: assistantMsg.content ?? "",
        tool_calls: toolCalls,
        reasoning_content: assistantMsg.reasoning_content,
      });

      if (assistantMsg.content?.trim()) {
        emitChatFromRaw(assistantMsg.content.trim(), results, streamEmitter);
      }

      for (const toolCall of toolCalls) {
        const fnName = toolCall.function.name as "jingdu" | "shendu";
        const args = JSON.parse(toolCall.function.arguments) as {
          title: string;
          author: string;
          intro?: string;
        };
        const book: BookInfo = {
          title: args.title,
          author: args.author,
          intro: args.intro,
        };

        const toolKey = `${fnName}:${book.title}:${book.author}`;
        if (executedTools.has(toolKey)) continue;
        executedTools.add(toolKey);

        await runTool(
          fnName,
          book,
          profile,
          readBooks,
          results,
          streamEmitter,
          emit,
          messages,
          toolCall.id
        );
        hadToolResults = true;
      }
      break;
    }

    const content = assistantMsg.content ?? accumulated;
    const parsed = parseRecommendResponse(content) ?? parseJsonFromText<{
      chat: string;
      rec: string;
      book?: BookInfo;
    }>(content);

    if (parsed) {
      if (parsed.chat?.trim()) {
        const chatText = normalizeChatContent(parsed.chat.trim());
        if (chatText && !isReadingContentLeak(chatText)) {
          const item = streamEmitter.finish("chat", chatText);
          if (item) results.push(item);
        }
      }
      if (parsed.rec?.trim() && !hadToolResults) {
        const item = streamEmitter.finish("rec", parsed.rec.trim(), parsed.book);
        if (item) results.push(item);
      }
    } else if (content.trim() && !hadToolResults) {
      emitChatFromRaw(content.trim(), results, streamEmitter);
    }

    if (!hadToolResults) {
      const intent = detectReadingIntent(message);
      if (intent) {
        const book = extractBookFromContext(message, history, readBooks);
        if (book?.title && book.author) {
          const toolKey = `${intent}:${book.title}:${book.author}`;
          if (!executedTools.has(toolKey)) {
            executedTools.add(toolKey);
            await runTool(
              intent,
              book,
              profile,
              readBooks,
              results,
              streamEmitter,
              emit,
              messages,
              `fallback-${toolKey}`
            );
            hadToolResults = true;
            break;
          }
        }
      }
    }

    break;
  }

  return results;
}
