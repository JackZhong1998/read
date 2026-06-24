import { AI_NAME, isReadingContentLeak, normalizeChatContent, normalizeReadingContent } from "./content-utils";
import { paginateMarkdownByHeight } from "./reader-pagination";
import type { ChatMessage } from "./types";

export type ChapterKind = "dialogue" | "rec" | "jingdu" | "shendu" | "waiting";

export interface ReaderChapter {
  id: string;
  kind: ChapterKind;
  title: string;
  content: string;
  messageId?: string;
}

export interface ReaderNavIntent {
  chapterId: string;
  seq: number;
}

const KIND_LABELS: Record<Exclude<ChapterKind, "dialogue" | "waiting">, string> = {
  rec: "书籍推荐",
  jingdu: "精读",
  shendu: "深读",
};

function isDialogue(msg: ChatMessage): boolean {
  return msg.role === "user" || msg.type === "chat";
}

function formatDialogueContent(messages: ChatMessage[]): string {
  return messages
    .map((m) => {
      if (m.role === "user") return `**我：** ${m.content}`;
      return `**${AI_NAME}：** ${m.content}`;
    })
    .join("\n\n");
}

export function getLastAssistantChat(messages: ChatMessage[]): string {
  const last = [...messages].reverse().find((m) => {
    if (m.role !== "assistant" || m.type !== "chat") return false;
    const text = normalizeChatContent(m.content);
    return Boolean(text) && !isReadingContentLeak(text);
  });
  return last ? normalizeChatContent(last.content) : "";
}

function createContentChapter(msg: ChatMessage): ReaderChapter {
  const bookLabel = msg.book ? `《${msg.book.title}》· ${msg.book.author}` : "";
  const label = KIND_LABELS[msg.type as keyof typeof KIND_LABELS] ?? msg.type;
  const body =
    msg.type === "jingdu" || msg.type === "shendu"
      ? normalizeReadingContent(msg.content)
      : msg.content;
  return {
    id: msg.id,
    kind: msg.type as "rec" | "jingdu" | "shendu",
    title: bookLabel ? `${label} · ${bookLabel}` : label,
    content: body,
    messageId: msg.id,
  };
}

function findLastContentMessageIndex(messages: ChatMessage[]): number {
  for (let i = messages.length - 1; i >= 0; i--) {
    const t = messages[i].type;
    if (t === "rec" || t === "jingdu" || t === "shendu") return i;
  }
  return -1;
}

function findLastContentChapterIndex(chapters: ReaderChapter[]): number {
  for (let i = chapters.length - 1; i >= 0; i--) {
    const k = chapters[i].kind;
    if (k === "rec" || k === "jingdu" || k === "shendu") return i;
  }
  return -1;
}

/** 内容章节之后的消息，用于尾页对话区 */
export function buildTailDialogueContent(messages: ChatMessage[]): string {
  const lastContentIdx = findLastContentMessageIndex(messages);
  if (lastContentIdx < 0) return getLastAssistantChat(messages);

  const trailing = messages.slice(lastContentIdx + 1).filter(isDialogue);
  if (trailing.length > 0) {
    return formatDialogueContent(trailing);
  }

  return "";
}

/** 尾页对话区 Markdown：与阅读页对话章节格式一致 */
export function formatTailDialogueMarkdown(content: string): string {
  const text = content.trim();
  if (!text) return "";
  if (/\*\*(我|读书先生)：\*\*/.test(text)) return text;
  return `**${AI_NAME}：** ${text}`;
}

export function buildReaderChapters(
  messages: ChatMessage[],
  options?: { includeWaitingChapter?: boolean; mergeTailDialogue?: boolean }
): { chapters: ReaderChapter[]; tailDialogueContent: string } {
  const chapters: ReaderChapter[] = [];
  let dialogueBuffer: ChatMessage[] = [];
  const lastContentMsgIdx = options?.mergeTailDialogue
    ? findLastContentMessageIndex(messages)
    : -1;

  const flushDialogue = () => {
    if (dialogueBuffer.length === 0) return;
    chapters.push({
      id: `dialogue-${dialogueBuffer[0].id}`,
      kind: "dialogue",
      title: "对话",
      content: formatDialogueContent(dialogueBuffer),
      messageId: dialogueBuffer[0].id,
    });
    dialogueBuffer = [];
  };

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (options?.mergeTailDialogue && lastContentMsgIdx >= 0 && i > lastContentMsgIdx && isDialogue(msg)) {
      continue;
    }
    if (isDialogue(msg)) {
      dialogueBuffer.push(msg);
    } else {
      flushDialogue();
      chapters.push(createContentChapter(msg));
    }
  }
  flushDialogue();

  let tailDialogueContent = "";
  if (options?.mergeTailDialogue) {
    const lastContentChapterIdx = findLastContentChapterIndex(chapters);
    const tailParts: string[] = [];
    const kept: ReaderChapter[] = [];

    for (let i = 0; i < chapters.length; i++) {
      const ch = chapters[i];
      if (lastContentChapterIdx >= 0 && i > lastContentChapterIdx && ch.kind === "dialogue") {
        tailParts.push(ch.content);
      } else {
        kept.push(ch);
      }
    }

    tailDialogueContent = tailParts.join("\n\n\n");
    if (!tailDialogueContent) {
      tailDialogueContent = buildTailDialogueContent(messages);
    }

    chapters.length = 0;
    chapters.push(...kept);
  }

  if (options?.includeWaitingChapter) {
    chapters.push({
      id: "waiting",
      kind: "waiting",
      title: "加载中",
      content: "",
    });
  }

  return { chapters, tailDialogueContent };
}

export function chapterToMarkdown(chapter: ReaderChapter): string {
  if (chapter.kind === "waiting") return "";
  // 推荐/精读/深读：标题已在顶栏展示，正文直接分页，避免首屏只有标题
  if (chapter.kind === "rec" || chapter.kind === "jingdu" || chapter.kind === "shendu") {
    return chapter.content;
  }
  return `# ${chapter.title}\n\n${chapter.content}`;
}

/** 解析导航目标章节的起始页码 */
export function resolveNavPage(
  chapters: ReaderChapter[],
  chapterStarts: Record<string, number>,
  chapterId: string,
  tailPageIndex?: number
): number {
  if (chapterId === "tail") {
    return tailPageIndex ?? -1;
  }
  if (chapterId === "waiting") {
    return chapterStarts.waiting ?? -1;
  }
  const cid = resolveChapterId(chapters, chapterId) ?? chapterId;
  return chapterStarts[cid] ?? -1;
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

export function paginateParagraphs(paragraphs: string[], charsPerPage: number): string[] {
  const pages: string[] = [];
  let current = "";

  for (const p of paragraphs) {
    let remaining = p;

    while (remaining) {
      const separator = current ? "\n\n" : "";
      const block = `${separator}${remaining}`;

      if (current.length + block.length <= charsPerPage) {
        current += block;
        remaining = "";
        break;
      }

      if (current) {
        const room = charsPerPage - current.length - separator.length;
        if (room > 0) {
          const head = remaining.slice(0, room);
          current += separator + head;
          pages.push(current.trim());
          current = "";
          remaining = remaining.slice(head.length).trimStart();
          continue;
        }
        pages.push(current.trim());
        current = "";
        continue;
      }

      if (remaining.length > charsPerPage) {
        pages.push(remaining.slice(0, charsPerPage));
        remaining = remaining.slice(charsPerPage);
      } else {
        current = remaining;
        remaining = "";
      }
    }
  }

  if (current.trim()) pages.push(current.trim());
  return pages.length ? pages : [""];
}

export interface ReaderLayout {
  w: number;
  h: number;
}

export function getCharsPerPage(width: number, height: number): number {
  const isMobile = width < 768;
  const isTablet = width >= 768 && width < 1024;
  const area = width * height;

  if (isMobile) return Math.floor(area / 920);
  if (isTablet) return Math.floor(area / 850);
  return Math.floor(area / 780);
}

export interface PageBook {
  pages: string[];
  chapterStarts: Record<string, number>;
  chapters: ReaderChapter[];
  /** 内容末尾的尾页：AI 回复 + Sug + 对话框 */
  tailPageIndex?: number;
  tailChat?: string;
}

export function buildPagedBook(
  chapters: ReaderChapter[],
  layout: ReaderLayout,
  options?: { includeTailPage?: boolean; tailChat?: string; useDomMeasure?: boolean }
): PageBook {
  const pages: string[] = [];
  const chapterStarts: Record<string, number> = {};
  const useDomMeasure =
    options?.useDomMeasure !== false && layout.h > 0 && layout.w > 0;

  for (const chapter of chapters) {
    chapterStarts[chapter.id] = pages.length;
    if (chapter.kind === "waiting") {
      pages.push("");
      continue;
    }
    const md = chapterToMarkdown(chapter);
    const charsPerPage = getCharsPerPage(layout.w, layout.h);
    const charPages = paginateParagraphs(splitParagraphs(md), charsPerPage);
    const chapterPages = useDomMeasure
      ? paginateMarkdownByHeight(md, layout.h, layout.w)
      : charPages;
    // DOM 高度测量偶发失败时，退回字符分页，避免整章挤在一页
    const domFailed =
      useDomMeasure &&
      chapterPages.length === 1 &&
      charPages.length > 1 &&
      md.length > charsPerPage * 0.5;
    pages.push(...(domFailed ? charPages : chapterPages));
  }

  if (pages.length === 0) pages.push("");

  let tailPageIndex: number | undefined;
  if (options?.includeTailPage) {
    tailPageIndex = pages.length;
    pages.push("");
  }

  return {
    pages,
    chapterStarts,
    chapters,
    tailPageIndex,
    tailChat: options?.tailChat,
  };
}

export function findChapterPage(
  chapterStarts: Record<string, number>,
  chapterId: string
): number {
  return chapterStarts[chapterId] ?? -1;
}

export function getChapterAtPage(
  chapters: ReaderChapter[],
  chapterStarts: Record<string, number>,
  pageIndex: number
): ReaderChapter | undefined {
  let active: ReaderChapter | undefined;
  for (const ch of chapters) {
    const start = chapterStarts[ch.id];
    if (start !== undefined && start <= pageIndex) active = ch;
  }
  return active;
}

export function isReadableMessage(msg: ChatMessage): boolean {
  return msg.type === "rec" || msg.type === "jingdu" || msg.type === "shendu";
}

export function resolveChapterId(
  chapters: ReaderChapter[],
  messageId: string
): string | undefined {
  const direct = chapters.find((c) => c.id === messageId || c.messageId === messageId);
  if (direct) return direct.id;

  const msgIndex = chapters.findIndex((c) => c.messageId === messageId);
  if (msgIndex >= 0) return chapters[msgIndex].id;

  return chapters.find((c) => c.kind === "dialogue" && c.messageId === messageId)?.id;
}

export function resolveNavChapterId(
  chapters: ReaderChapter[],
  chapterId: string
): string | undefined {
  if (chapterId === "waiting") {
    return chapters.some((c) => c.id === "waiting") ? "waiting" : undefined;
  }
  return resolveChapterId(chapters, chapterId) ?? undefined;
}

/** 等待页应展示的流式/已返回内容（当前轮用户消息之后的助手回复） */
export function getWaitingOverlayContent(messages: ChatMessage[]): {
  kind: "chat" | "rec" | "jingdu" | "shendu";
  content: string;
  title?: string;
  streaming?: boolean;
} | null {
  const lastUserIdx = messages.map((m) => m.role).lastIndexOf("user");
  if (lastUserIdx < 0) return null;
  const recent = messages.slice(lastUserIdx + 1);

  const contentMsg = [...recent].reverse().find(
    (m) =>
      m.role === "assistant" &&
      (m.type === "rec" || m.type === "jingdu" || m.type === "shendu") &&
      m.content.trim()
  );
  if (contentMsg) {
    const label = KIND_LABELS[contentMsg.type as keyof typeof KIND_LABELS] ?? contentMsg.type;
    const bookLabel = contentMsg.book
      ? `《${contentMsg.book.title}》· ${contentMsg.book.author}`
      : "";
    return {
      kind: contentMsg.type as "rec" | "jingdu" | "shendu",
      content:
        contentMsg.type === "jingdu" || contentMsg.type === "shendu"
          ? normalizeReadingContent(contentMsg.content)
          : contentMsg.content,
      title: bookLabel ? `${label} · ${bookLabel}` : label,
      streaming: contentMsg.streaming,
    };
  }

  const dialogues = recent.filter(isDialogue);
  if (dialogues.length > 0) {
    const text = formatDialogueContent(dialogues.filter((m) => m.content.trim()));
    if (text.trim()) {
      return {
        kind: "chat",
        content: text,
        streaming: dialogues.some((m) => m.role === "assistant" && m.streaming),
      };
    }
  }

  return null;
}
