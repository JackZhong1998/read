import { SITE_NAME } from "./site";

const POSTER_WIDTH = 1080;
const POSTER_HEIGHT = 1440;

const COLORS = {
  bg: "#faf7f2",
  text: "#2a2520",
  muted: "#8a7f72",
  accent: "#c45c26",
  line: "#ddd4c8",
};

function loadFont(): Promise<void> {
  if (typeof document === "undefined") return Promise.resolve();
  const id = "poster-noto-serif";
  if (document.getElementById(id)) return Promise.resolve();
  return new Promise((resolve) => {
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@400;600;700&display=swap";
    link.onload = () => resolve();
    link.onerror = () => resolve();
    document.head.appendChild(link);
  });
}

function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number
): string[] {
  const paragraphs = text.split(/\n+/).filter(Boolean);
  const lines: string[] = [];

  for (const para of paragraphs) {
    let line = "";
    for (const char of para) {
      const test = line + char;
      if (ctx.measureText(test).width > maxWidth && line) {
        lines.push(line);
        line = char;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
  }

  return lines.length ? lines : [text];
}

export interface SharePosterOptions {
  quote: string;
  bookTitle: string;
  bookAuthor?: string;
  siteUrl: string;
  siteName?: string;
}

export async function generateSharePoster(options: SharePosterOptions): Promise<Blob> {
  await loadFont();

  const canvas = document.createElement("canvas");
  canvas.width = POSTER_WIDTH;
  canvas.height = POSTER_HEIGHT;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not supported");

  const siteName = options.siteName ?? SITE_NAME;
  const padding = 96;

  ctx.fillStyle = COLORS.bg;
  ctx.fillRect(0, 0, POSTER_WIDTH, POSTER_HEIGHT);

  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 2;
  ctx.strokeRect(64, 64, POSTER_WIDTH - 128, POSTER_HEIGHT - 128);

  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 120px "Noto Serif SC", "Songti SC", serif';
  ctx.fillText("\u201c", padding, 220);

  ctx.fillStyle = COLORS.text;
  ctx.font = '600 52px "Noto Serif SC", "Songti SC", serif';
  const quoteLines = wrapText(ctx, options.quote.trim(), POSTER_WIDTH - padding * 2, 80);
  let y = 340;
  const lineHeight = 88;
  for (const line of quoteLines.slice(0, 10)) {
    ctx.fillText(line, padding, y);
    y += lineHeight;
  }

  ctx.fillStyle = COLORS.accent;
  ctx.font = '700 100px "Noto Serif SC", "Songti SC", serif';
  ctx.textAlign = "right";
  ctx.fillText("\u201d", POSTER_WIDTH - padding, Math.min(y + 40, POSTER_HEIGHT - 360));
  ctx.textAlign = "left";

  const footerY = POSTER_HEIGHT - 280;
  ctx.strokeStyle = COLORS.line;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(padding, footerY);
  ctx.lineTo(POSTER_WIDTH - padding, footerY);
  ctx.stroke();

  ctx.fillStyle = COLORS.text;
  const titleFontSize = options.bookTitle.length > 20 ? 32 : options.bookTitle.length > 12 ? 36 : 40;
  ctx.font = `600 ${titleFontSize}px "Noto Serif SC", "Songti SC", serif`;
  const titleText = `《${options.bookTitle}》`;
  const titleLines = wrapText(ctx, titleText, POSTER_WIDTH - padding * 2, titleFontSize + 8);
  let titleY = footerY + 56;
  const titleLineHeight = titleFontSize + 12;
  for (const line of titleLines.slice(0, 3)) {
    ctx.fillText(line, padding, titleY);
    titleY += titleLineHeight;
  }

  if (options.bookAuthor) {
    ctx.fillStyle = COLORS.muted;
    ctx.font = '400 32px "Noto Serif SC", "Songti SC", serif';
    const authorLines = wrapText(
      ctx,
      options.bookAuthor,
      POSTER_WIDTH - padding * 2,
      40
    );
    let authorY = titleY + 16;
    for (const line of authorLines.slice(0, 2)) {
      ctx.fillText(line, padding, authorY);
      authorY += 40;
    }
  }

  ctx.fillStyle = COLORS.muted;
  ctx.font = '400 28px "Noto Serif SC", "Songti SC", sans-serif';
  ctx.fillText(siteName, padding, POSTER_HEIGHT - 120);

  ctx.fillStyle = COLORS.accent;
  ctx.font = '400 26px "Noto Serif SC", "Songti SC", sans-serif';
  const url = options.siteUrl.replace(/^https?:\/\//, "");
  ctx.fillText(url, padding, POSTER_HEIGHT - 72);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("Failed to create image"))),
      "image/png",
      1
    );
  });
}

export async function downloadPoster(blob: Blob, filename = "速读分享.png"): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function sharePoster(
  blob: Blob,
  title: string
): Promise<boolean> {
  const file = new File([blob], "速读分享.png", { type: "image/png" });
  if (navigator.share && navigator.canShare?.({ files: [file] })) {
    await navigator.share({
      files: [file],
      title,
      text: title,
    });
    return true;
  }
  return false;
}
