"use client";

import type { BookInfo } from "@/lib/types";
import { normalizeReadingContent } from "@/lib/content-utils";
import MarkdownContent from "./MarkdownContent";

interface ContentCardProps {
  type: "rec" | "jingdu" | "shendu";
  content: string;
  book?: BookInfo;
  onFullscreen: () => void;
  streaming?: boolean;
}

const TYPE_LABELS = {
  rec: "📚 书籍推荐",
  jingdu: "⚡ 精读",
  shendu: "🔍 深读",
};

const TYPE_COLORS = {
  rec: "border-accent/30 bg-gradient-to-br from-white to-accent/5",
  jingdu: "border-sage/30 bg-gradient-to-br from-white to-sage/5",
  shendu: "border-gold/30 bg-gradient-to-br from-white to-gold/5",
};

export default function ContentCard({ type, content, book, onFullscreen, streaming }: ContentCardProps) {
  const displayContent = normalizeReadingContent(content);

  return (
    <div
      className={`overflow-hidden rounded-2xl border ${TYPE_COLORS[type]} shadow-sm ${streaming ? "" : "animate-fade-in"}`}
    >
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          {TYPE_LABELS[type]}
        </span>
        {book && (
          <span className="text-xs text-ink-muted">
            《{book.title}》· {book.author}
          </span>
        )}
      </div>

      <div className="relative mx-4 mb-3">
        <div
          className={`max-h-48 overflow-y-auto rounded-xl bg-white/60 p-4 scrollbar-hide ${streaming ? "min-h-48" : ""}`}
        >
          <MarkdownContent content={displayContent} />
          {streaming && (
            <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle" />
          )}
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-gradient-to-t from-white/90 to-transparent" />
      </div>

      <div className="flex justify-end px-4 pb-4">
        <button
          onClick={onFullscreen}
          className="flex items-center gap-1.5 rounded-full bg-ink px-4 py-2 text-xs text-cream transition-all hover:bg-ink-light active:scale-95"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          全屏阅读
        </button>
      </div>
    </div>
  );
}
