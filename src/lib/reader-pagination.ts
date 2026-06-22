let measureEl: HTMLDivElement | null = null;

function getMeasurer(): HTMLDivElement | null {
  if (typeof document === "undefined") return null;
  if (!measureEl) {
    measureEl = document.createElement("div");
    measureEl.className = "markdown-body ebook-prose";
    measureEl.style.cssText =
      "position:fixed;left:-10000px;top:0;visibility:hidden;pointer-events:none;overflow:visible;";
    document.body.appendChild(measureEl);
  }
  return measureEl;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderInline(text: string): string {
  return escapeHtml(text)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>");
}

/** 轻量 Markdown → HTML，仅用于离屏高度测量，避免在客户端引入 react-dom/server */
function markdownToMeasureHtml(markdown: string): string {
  const blocks = markdown.trim().split(/\n{2,}/);
  const html: string[] = [];

  for (const raw of blocks) {
    const block = raw.trim();
    if (!block) continue;

    const heading = block.match(/^(#{1,6})\s+(.+)$/);
    if (heading && !block.includes("\n")) {
      const level = Math.min(heading[1].length, 3);
      html.push(`<h${level}>${renderInline(heading[2])}</h${level}>`);
      continue;
    }

    const lines = block.split("\n");
    if (lines.every((l) => /^>\s?/.test(l))) {
      const body = lines.map((l) => l.replace(/^>\s?/, "")).join("\n");
      html.push(`<blockquote><p>${renderInline(body).replace(/\n/g, "<br>")}</p></blockquote>`);
      continue;
    }

    if (lines.every((l) => /^[-*]\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^[-*]\s+/, ""))}</li>`)
        .join("");
      html.push(`<ul>${items}</ul>`);
      continue;
    }

    if (lines.every((l) => /^\d+\.\s+/.test(l))) {
      const items = lines
        .map((l) => `<li>${renderInline(l.replace(/^\d+\.\s+/, ""))}</li>`)
        .join("");
      html.push(`<ol>${items}</ol>`);
      continue;
    }

    html.push(`<p>${lines.map((l) => renderInline(l)).join("<br>")}</p>`);
  }

  return html.join("");
}

export function measureMarkdownHeight(markdown: string, width: number): number {
  const el = getMeasurer();
  if (!el || !markdown.trim()) return 0;
  el.style.width = `${width}px`;
  el.innerHTML = markdownToMeasureHtml(markdown);
  void el.offsetHeight;
  return el.getBoundingClientRect().height || el.scrollHeight || el.offsetHeight;
}

export function splitMarkdownBlocks(text: string): string[] {
  const trimmed = text.trim();
  if (!trimmed) return [];

  const lines = trimmed.split("\n");
  const blocks: string[] = [];
  let current: string[] = [];

  const flush = () => {
    const joined = current.join("\n").trim();
    if (joined) blocks.push(joined);
    current = [];
  };

  for (const line of lines) {
    if (!line.trim()) {
      flush();
      continue;
    }
    if (current.length > 0 && /^#{1,6}\s/.test(line)) {
      flush();
    }
    current.push(line);
  }
  flush();

  const result: string[] = [];
  for (const block of blocks) {
    if (block.length > 500) {
      result.push(...splitLongText(block, 320));
    } else {
      result.push(block);
    }
  }

  return result.length ? result : [trimmed];
}

function splitLongText(text: string, maxChars: number): string[] {
  const lines = text.split("\n");
  if (lines.length > 1) {
    const chunks: string[] = [];
    let current = "";
    for (const line of lines) {
      const next = current ? `${current}\n${line}` : line;
      if (next.length > maxChars && current) {
        chunks.push(current);
        current = line;
      } else {
        current = next;
      }
    }
    if (current.trim()) chunks.push(current.trim());
    return chunks.length ? chunks : [text];
  }

  const sentences =
    text.match(/[^。！？.!?\n]+[。！？.!?]?/g)?.map((s) => s.trim()).filter(Boolean) ?? [text];
  const chunks: string[] = [];
  let current = "";
  for (const sentence of sentences) {
    const next = current ? `${current}${sentence}` : sentence;
    if (next.length > maxChars && current) {
      chunks.push(current);
      current = sentence;
    } else {
      current = next;
    }
  }
  if (current.trim()) chunks.push(current.trim());
  return chunks.length ? chunks : [text];
}

function splitBlockToFit(block: string, maxHeight: number, width: number): string[] {
  if (measureMarkdownHeight(block, width) <= maxHeight) return [block];

  let lo = 1;
  let hi = block.length;
  let best = 0;

  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const slice = block.slice(0, mid).trim();
    if (!slice) break;
    if (measureMarkdownHeight(slice, width) <= maxHeight) {
      best = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }

  if (best <= 0) return [block];

  const first = block.slice(0, best).trim();
  const rest = block.slice(best).trim();
  if (!rest) return [first];
  return [first, ...splitBlockToFit(rest, maxHeight, width)];
}

function joinBlocks(blocks: string[]): string {
  return blocks.join("\n\n");
}

export function paginateMarkdownByHeight(
  markdown: string,
  maxHeight: number,
  width: number
): string[] {
  const trimmed = markdown.trim();
  if (!trimmed) return [""];
  if (maxHeight <= 0 || width <= 0) return [trimmed];

  const blocks = splitMarkdownBlocks(trimmed);
  const pages: string[] = [];
  let current: string[] = [];

  for (const rawBlock of blocks) {
    const parts = splitBlockToFit(rawBlock, maxHeight, width);
    for (const part of parts) {
      const candidate = current.length ? joinBlocks([...current, part]) : part;
      if (measureMarkdownHeight(candidate, width) > maxHeight && current.length > 0) {
        pages.push(joinBlocks(current));
        current = [part];
      } else {
        current.push(part);
      }
    }
  }

  if (current.length) pages.push(joinBlocks(current));
  return pages.length ? pages : [trimmed];
}

export function destroyPaginationMeasurer(): void {
  if (measureEl) {
    measureEl.remove();
    measureEl = null;
  }
}
