import { parseJsonFromText } from "./json-utils";
import type { BookInfo } from "./types";

export const AI_NAME = "读书先生";

interface ReadingContentJson {
  content?: string;
  body?: string;
}

export interface RecommendJson {
  chat?: string;
  rec?: string;
  book?: BookInfo;
}

/** 解析精读/深读 JSON 输出，提取 Markdown 正文；兼容旧版纯 Markdown */
export function normalizeReadingContent(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";

  const parsed = parseJsonFromText<ReadingContentJson>(trimmed);
  if (parsed) {
    const md = (parsed.content ?? parsed.body ?? "").trim();
    if (md) return md;
  }

  return trimmed;
}

/** 从不完整 JSON 中提取字符串字段的当前值（支持流式输出） */
export function extractPartialJsonStringField(raw: string, field: string): string | null {
  const marker = `"${field}"`;
  const startIdx = raw.indexOf(marker);
  if (startIdx === -1) return null;

  let i = startIdx + marker.length;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== ":") return null;
  i += 1;
  while (i < raw.length && /\s/.test(raw[i]!)) i += 1;
  if (raw[i] !== '"') return null;
  i += 1;

  let result = "";
  while (i < raw.length) {
    const ch = raw[i]!;
    if (ch === "\\") {
      if (i + 1 >= raw.length) break;
      const next = raw[i + 1]!;
      switch (next) {
        case "n":
          result += "\n";
          break;
        case "r":
          result += "\r";
          break;
        case "t":
          result += "\t";
          break;
        case '"':
          result += '"';
          break;
        case "\\":
          result += "\\";
          break;
        default:
          result += next;
      }
      i += 2;
      continue;
    }
    if (ch === '"') break;
    result += ch;
    i += 1;
  }

  return result;
}

/** 流式输出时提取可读正文（精读/深读/推荐 JSON 的 content 字段） */
export function extractStreamingReadingDisplay(raw: string): string {
  const partial = extractPartialJsonStringField(raw, "content");
  if (partial !== null) return partial;
  return "";
}

/** 流式输出时提取推荐 JSON 的 chat / rec 字段 */
export function extractStreamingRecommendFields(raw: string): { chat: string; rec: string } {
  return {
    chat: extractPartialJsonStringField(raw, "chat") ?? "",
    rec: extractPartialJsonStringField(raw, "rec") ?? "",
  };
}
/** 解析推荐 Agent 的 JSON 响应 */
export function parseRecommendResponse(raw: string): RecommendJson | null {
  const trimmed = raw.trim();
  if (!trimmed.startsWith("{")) return null;
  return parseJsonFromText<RecommendJson>(trimmed);
}

/** 判断 chat 内容是否误混入了精读/深读/推荐正文 */
export function isReadingContentLeak(content: string): boolean {
  const c = content.trim();
  if (!c) return false;
  if (/^\[(jingdu|shendu|rec)\]/i.test(c)) return true;
  if (/^#{1,3}\s/m.test(c) || /\n##\s/.test(c) || /\n###\s/.test(c)) return true;
  if (c.length > 160 && (c.includes("**") || c.includes("---") || c.includes("\n\n"))) return true;
  return false;
}

/** 从 chat 内容中提取可读文本，避免展示 JSON 或精读/深读正文 */
export function normalizeChatContent(content: string): string {
  const trimmed = content.trim();
  if (!trimmed) return "";

  const parsed = parseRecommendResponse(trimmed);
  if (parsed?.chat?.trim()) {
    const chat = parsed.chat.trim();
    return isReadingContentLeak(chat) ? "" : chat;
  }

  if (parsed && ("rec" in parsed || "book" in parsed)) return "";

  if (isReadingContentLeak(trimmed)) return "";

  return trimmed;
}

/** 对话区/尾页展示用：过滤误写入的精读深读正文 */
export function sanitizeChatForDisplay(content: string): string {
  return normalizeChatContent(content);
}

/** 检测用户消息中的精读/深读意图 */
export function detectReadingIntent(message: string): "jingdu" | "shendu" | null {
  if (/深读|深度解读|深度阅读|深入读|深度理解/.test(message)) return "shendu";
  if (/精读|速读|快速读|精读书/.test(message)) return "jingdu";
  return null;
}

/** 从用户消息及上下文中提取书籍信息 */
export function extractBookFromContext(
  userMessage: string,
  history: Array<{ role: string; content: string }>,
  readBooks: Array<{ title: string; author: string; intro?: string }>
): BookInfo | null {
  const titleMatch = userMessage.match(/[《「【]([^》」】]+)[》」】]/);
  if (!titleMatch) return null;
  const queryTitle = titleMatch[1].trim();

  const authorInMsg = userMessage.match(/[》」】]\s*[·•—\-|]\s*([^\s，。！？；、《》]+)/);
  if (authorInMsg) {
    return { title: queryTitle, author: authorInMsg[1].trim() };
  }

  for (const book of readBooks) {
    if (book.title.includes(queryTitle) || queryTitle.includes(book.title)) {
      return { title: book.title, author: book.author, intro: book.intro };
    }
  }

  const allText = [...history.map((h) => h.content), userMessage].join("\n");
  for (const book of readBooks) {
    if (allText.includes(book.title)) {
      return { title: book.title, author: book.author, intro: book.intro };
    }
  }

  const escaped = queryTitle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const authorPatterns = [
    new RegExp(`《${escaped}》[^\\n]{0,40}[·•—\\-|]\\s*([^\\n，。！？；]+)`),
    new RegExp(`\\*\\*《${escaped}》\\*\\*[^\\n]{0,20}[—\\-]\\s*([^\\n，。！？；]+)`),
  ];
  for (const pattern of authorPatterns) {
    const m = allText.match(pattern);
    if (m?.[1]) return { title: queryTitle, author: m[1].trim() };
  }

  return null;
}
