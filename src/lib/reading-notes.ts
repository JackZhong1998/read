import type { ReaderChapter } from "./reader-utils";
import type { ReadingNote } from "./types";

export interface HighlightRange {
  start: number;
  end: number;
  noteId: string;
}

export interface ContentPart {
  text: string;
  noteId?: string;
}

/** 将 Markdown 转为用于匹配的纯文本 */
export function stripMarkdown(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, "")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/__([^_]+)__/g, "$1")
    .replace(/_([^_]+)_/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^>\s?/gm, "")
    .replace(/^[-*+]\s+/gm, "")
    .replace(/^\d+\.\s+/gm, "")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

/** 从 DOM Range 计算容器内文本偏移 */
export function getRangeOffsetsInContainer(
  container: HTMLElement,
  range: Range
): { start: number; end: number } | null {
  if (!container.contains(range.commonAncestorContainer)) return null;
  const pre = document.createRange();
  pre.selectNodeContents(container);
  pre.setEnd(range.startContainer, range.startOffset);
  const start = pre.toString().length;
  const end = start + range.toString().length;
  return { start, end };
}

/** 根据页内容在章节全文中定位页起始偏移 */
export function resolvePageStartInChapter(
  chapterMd: string,
  pageContent: string
): number {
  if (!pageContent) return 0;
  const snippet = pageContent.slice(0, Math.min(48, pageContent.length));
  const idx = chapterMd.indexOf(snippet);
  return idx >= 0 ? idx : 0;
}

/** 获取与当前页内容重叠的划线区间（相对页内纯文本偏移） */
export function getPageHighlightRanges(
  pagePlainText: string,
  notes: ReadingNote[],
  chapterId: string,
  pageIndex: number
): HighlightRange[] {
  const ranges: HighlightRange[] = [];

  for (const note of notes) {
    if (note.chapterId !== chapterId) continue;

    let start = note.startOffset;
    let end = note.endOffset;

    if (note.pageIndex !== undefined && note.pageIndex !== pageIndex) {
      const idx = pagePlainText.indexOf(note.text);
      if (idx < 0) continue;
      start = idx;
      end = idx + note.text.length;
    }

    if (end <= start || start >= pagePlainText.length) continue;
    start = Math.max(0, start);
    end = Math.min(pagePlainText.length, end);
    ranges.push({ start, end, noteId: note.id });
  }

  return ranges.sort((a, b) => a.start - b.start);
}

/** 将内容按高亮区间切分为片段 */
export function splitContentWithHighlights(
  content: string,
  ranges: HighlightRange[]
): ContentPart[] {
  if (!ranges.length) return [{ text: content }];

  const parts: ContentPart[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start > cursor) {
      parts.push({ text: content.slice(cursor, range.start) });
    }
    parts.push({
      text: content.slice(range.start, range.end),
      noteId: range.noteId,
    });
    cursor = range.end;
  }

  if (cursor < content.length) {
    parts.push({ text: content.slice(cursor) });
  }

  return parts.filter((p) => p.text.length > 0);
}

/** 在章节全文中定位选区偏移（回退方案） */
export function findSelectionOffsets(
  chapterMd: string,
  pageContent: string,
  pageStartInChapter: number,
  selectedText: string
): { startOffset: number; endOffset: number } | null {
  const trimmed = selectedText.trim();
  if (!trimmed) return null;

  const pagePlain = stripMarkdown(pageContent);
  const idxInPage = pagePlain.indexOf(trimmed);
  if (idxInPage >= 0) {
    return { startOffset: idxInPage, endOffset: idxInPage + trimmed.length };
  }

  const chapterPlain = stripMarkdown(chapterMd);
  const idxInChapter = chapterPlain.indexOf(trimmed);
  if (idxInChapter >= 0) {
    return { startOffset: idxInChapter, endOffset: idxInChapter + trimmed.length };
  }

  return null;
}

/** 格式化笔记用于复制 */
export function formatNoteForCopy(note: ReadingNote): string {
  const lines = [note.text];
  if (note.comment?.trim()) {
    lines.push("", `评论：${note.comment.trim()}`);
  }
  return lines.join("\n");
}

/** 从章节与页信息解析 source 元数据 */
export function resolveNoteSource(
  chapter: ReaderChapter | undefined,
  messages: { id: string; book?: { title: string; author: string } }[]
): { sourceId: string; sourceTitle: string; sourceAuthor?: string } {
  const msg = chapter?.messageId
    ? messages.find((m) => m.id === chapter.messageId)
    : undefined;
  const book = msg?.book;
  return {
    sourceId: chapter?.messageId ?? chapter?.id ?? "unknown",
    sourceTitle: book?.title ?? chapter?.title ?? "阅读笔记",
    sourceAuthor: book?.author,
  };
}
