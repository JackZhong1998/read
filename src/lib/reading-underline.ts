import type { ReadingNote } from "./types";

const HIGHLIGHT_NAME = "reading-underline";

let highlightStylesInjected = false;

/** PostCSS/Tailwind 无法解析 ::highlight，运行时注入样式 */
function ensureHighlightStyles(): void {
  if (highlightStylesInjected || typeof document === "undefined") return;
  highlightStylesInjected = true;
  const style = document.createElement("style");
  style.id = "reading-highlight-styles";
  style.textContent = `
    ::highlight(${HIGHLIGHT_NAME}) {
      text-decoration: underline;
      text-decoration-color: #c45c26;
      text-decoration-thickness: 2px;
      text-underline-offset: 3px;
    }
  `;
  document.head.appendChild(style);
}

/** 在容器内按文本与偏移提示查找 DOM Range */
export function findTextRangeInElement(
  root: HTMLElement,
  searchText: string,
  hintOffset?: number
): Range | null {
  const trimmed = searchText.trim();
  if (!trimmed) return null;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const nodes: { node: Text; start: number }[] = [];
  let fullText = "";

  let current = walker.nextNode();
  while (current) {
    const textNode = current as Text;
    nodes.push({ node: textNode, start: fullText.length });
    fullText += textNode.textContent ?? "";
    current = walker.nextNode();
  }

  let bestIdx = -1;
  let bestDist = Infinity;
  let searchFrom = 0;
  while (searchFrom <= fullText.length) {
    const idx = fullText.indexOf(trimmed, searchFrom);
    if (idx < 0) break;
    const dist = hintOffset !== undefined ? Math.abs(idx - hintOffset) : 0;
    if (hintOffset === undefined || dist < bestDist) {
      bestDist = dist;
      bestIdx = idx;
      if (hintOffset === undefined) break;
    }
    searchFrom = idx + 1;
  }

  if (bestIdx < 0) return null;

  const endIdx = bestIdx + trimmed.length;
  const startPos = locateTextPosition(nodes, bestIdx);
  const endPos = locateTextPosition(nodes, endIdx);
  if (!startPos || !endPos) return null;

  const range = document.createRange();
  range.setStart(startPos.node, startPos.offset);
  range.setEnd(endPos.node, endPos.offset);
  return range;
}

function locateTextPosition(
  nodes: { node: Text; start: number }[],
  absoluteOffset: number
): { node: Text; offset: number } | null {
  for (let i = 0; i < nodes.length; i++) {
    const { node, start } = nodes[i];
    const len = node.textContent?.length ?? 0;
    const end = start + len;
    if (absoluteOffset >= start && absoluteOffset <= end) {
      return { node, offset: absoluteOffset - start };
    }
  }
  const last = nodes[nodes.length - 1];
  if (!last) return null;
  return { node: last.node, offset: last.node.textContent?.length ?? 0 };
}

export function supportsCssHighlight(): boolean {
  return typeof CSS !== "undefined" && "highlights" in CSS;
}

/** 应用划线高亮，不修改 Markdown DOM 结构 */
export function applyReadingHighlights(
  container: HTMLElement,
  notes: ReadingNote[],
  pageIndex: number
): void {
  clearReadingHighlights();

  const ranges: Range[] = [];
  for (const note of notes) {
    const hint =
      note.pageIndex === pageIndex ? note.startOffset : undefined;
    const range = findTextRangeInElement(container, note.text, hint);
    if (range) ranges.push(range);
  }

  if (!ranges.length) return;

  if (supportsCssHighlight()) {
    ensureHighlightStyles();
    CSS.highlights.set(HIGHLIGHT_NAME, new Highlight(...ranges));
    return;
  }

  for (const range of ranges) {
    wrapRangeWithSpan(range);
  }
}

export function clearReadingHighlights(): void {
  if (supportsCssHighlight()) {
    CSS.highlights.delete(HIGHLIGHT_NAME);
  }
}

function wrapRangeWithSpan(range: Range): void {
  try {
    const span = document.createElement("span");
    span.className = "reading-underline";
    range.surroundContents(span);
  } catch {
    // 跨节点选区：逐文本节点包裹
    const walker = document.createTreeWalker(range.commonAncestorContainer, NodeFilter.SHOW_TEXT);
    let node = walker.nextNode() as Text | null;
    while (node) {
      if (range.intersectsNode(node)) {
        const nodeRange = document.createRange();
        nodeRange.selectNodeContents(node);
        if (range.compareBoundaryPoints(Range.START_TO_START, nodeRange) > 0) {
          nodeRange.setStart(range.startContainer, range.startOffset);
        }
        if (range.compareBoundaryPoints(Range.END_TO_END, nodeRange) < 0) {
          nodeRange.setEnd(range.endContainer, range.endOffset);
        }
        if (!nodeRange.collapsed) {
          try {
            const span = document.createElement("span");
            span.className = "reading-underline";
            nodeRange.surroundContents(span);
          } catch {
            // ignore partial overlap
          }
        }
      }
      node = walker.nextNode() as Text | null;
    }
  }
}

/** 点击位置是否落在某条笔记的划线区域 */
export function findNoteAtPoint(
  container: HTMLElement,
  notes: ReadingNote[],
  pageIndex: number,
  x: number,
  y: number
): ReadingNote | null {
  for (const note of notes) {
    const hint = note.pageIndex === pageIndex ? note.startOffset : undefined;
    const range = findTextRangeInElement(container, note.text, hint);
    if (!range) continue;
    const rects = range.getClientRects();
    for (let i = 0; i < rects.length; i++) {
      const rect = rects[i];
      if (x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom) {
        return note;
      }
    }
  }
  return null;
}
