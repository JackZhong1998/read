import { normalizeReadingContent } from "./content-utils";
import { extractBookTitlesFromMarkdown } from "./memory";
import type { BookCache, ChatMessage, ReadBook } from "./types";

const CHAT_SNIPPET_LIMIT = 400;
const CACHED_READING_LIMIT = 2000;

function readingTypeLabel(type: ChatMessage["type"]): string {
  if (type === "rec") return "书籍推荐（速读）";
  if (type === "jingdu") return "精读";
  if (type === "shendu") return "深读";
  return type;
}

function formatReadingMessage(m: ChatMessage): string {
  const body = normalizeReadingContent(m.content);
  const book = m.book ? `《${m.book.title}》·${m.book.author}` : "";
  const header = book
    ? `【${readingTypeLabel(m.type)} ${book}】`
    : `【${readingTypeLabel(m.type)}】`;
  return `${header}\n${body}`;
}

function formatBookCacheSection(bookCache: BookCache, relevantTitles: string[]): string {
  const blocks: string[] = [];

  for (const entry of Object.values(bookCache)) {
    const { book, rec, jingdu, shendu } = entry;
    if (
      relevantTitles.length > 0 &&
      !relevantTitles.some(
        (title) => book.title.includes(title) || title.includes(book.title)
      )
    ) {
      continue;
    }

    const parts: string[] = [];
    if (rec) {
      parts.push(
        `推荐摘要：\n${normalizeReadingContent(rec).slice(0, CACHED_READING_LIMIT)}`
      );
    }
    if (jingdu) {
      parts.push(
        `精读摘要：\n${normalizeReadingContent(jingdu).slice(0, CACHED_READING_LIMIT)}`
      );
    }
    if (shendu) {
      parts.push(
        `深读摘要：\n${normalizeReadingContent(shendu).slice(0, CACHED_READING_LIMIT)}`
      );
    }
    if (!parts.length) continue;

    blocks.push(`### 《${book.title}》·${book.author}\n${parts.join("\n\n")}`);
  }

  return blocks.join("\n\n");
}

/** 为 Sug 推荐 Agent 组装完整阅读上下文（含推荐/精读/深读正文与缓存） */
export function buildSuggestionsContext(
  contentType: string,
  lastContent: string,
  messages: ChatMessage[],
  readBooks: ReadBook[],
  bookCache?: BookCache
): string {
  const sections: string[] = [];

  const dialogue = messages
    .slice(-8)
    .filter((m) => !m.streaming && (m.type === "chat" || m.role === "user"))
    .map((m) => `${m.role}/${m.type}: ${m.content.slice(0, CHAT_SNIPPET_LIMIT)}`)
    .join("\n");
  if (dialogue) {
    sections.push(`【近期对话】\n${dialogue}`);
  }

  const readingMessages = messages.filter(
    (m) =>
      !m.streaming &&
      (m.type === "rec" || m.type === "jingdu" || m.type === "shendu")
  );
  if (readingMessages.length) {
    sections.push(
      `【会话中的阅读内容（推荐/精读/深读全文）】\n${readingMessages
        .map(formatReadingMessage)
        .join("\n\n---\n\n")}`
    );
  }

  const normalizedLastForType =
    lastContent &&
    (contentType === "rec" || contentType === "jingdu" || contentType === "shendu")
      ? lastContent
      : "";
  const lastReading = readingMessages[readingMessages.length - 1];
  const lastAlreadyIncluded =
    normalizedLastForType &&
    lastReading &&
    normalizeReadingContent(lastReading.content) === normalizedLastForType;

  if (normalizedLastForType && !lastAlreadyIncluded) {
    sections.push(
      `【当前触发的最新内容（${readingTypeLabel(contentType as ChatMessage["type"])}）】\n${normalizedLastForType}`
    );
  } else if (lastContent && !normalizedLastForType) {
    sections.push(`【当前最新回复】\n${lastContent.slice(0, CHAT_SNIPPET_LIMIT)}`);
  }

  const titleSource =
    contentType === "rec" && normalizedLastForType
      ? normalizedLastForType
      : readingMessages.map((m) => normalizeReadingContent(m.content)).join("\n");
  const relevantTitles = extractBookTitlesFromMarkdown(titleSource);

  if (bookCache && Object.keys(bookCache).length > 0) {
    const cacheSection = formatBookCacheSection(bookCache, relevantTitles);
    if (cacheSection) {
      sections.push(`【相关书籍缓存（推荐/精读/深读）】\n${cacheSection}`);
    }
  }

  if (readBooks.length) {
    const readList = readBooks
      .map((b) => {
        const label = b.readType === "jingdu" ? "已精读" : "已深读";
        const essence = b.essence ? `，精髓：${b.essence}` : "";
        return `- 《${b.title}》·${b.author}（${label}${essence}）`;
      })
      .join("\n");
    sections.push(`【读者已读书籍】\n${readList}`);
  }

  return sections.join("\n\n");
}

/** 对话页 Sug 展示：去掉竖线后的简介，只保留行动与书名 */
export function formatSuggestionForChatDisplay(suggestion: string): string {
  const trimmed = suggestion.trim();
  if (!trimmed) return trimmed;
  const pipeIdx = trimmed.search(/[｜|]/);
  if (pipeIdx === -1) return trimmed;
  return trimmed.slice(0, pipeIdx).trim();
}

export function formatSuggestionItem(item: unknown): string | null {
  if (typeof item === "string" && item.trim()) return item.trim();
  if (item && typeof item === "object") {
    const obj = item as Record<string, unknown>;
    const action = obj.action ?? obj.text ?? obj.label;
    const intro = obj.intro ?? obj.description ?? obj.subtitle;
    if (typeof action === "string" && action.trim()) {
      if (typeof intro === "string" && intro.trim()) {
        return `${action.trim()}｜${intro.trim()}`;
      }
      return action.trim();
    }
  }
  return null;
}
