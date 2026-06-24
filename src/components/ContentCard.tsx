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
      <div className="flex items-center justify-between gap-2 px-3 pt-2.5 pb-1">
        <span className="text-xs font-medium tracking-wide text-ink-muted uppercase">
          {TYPE_LABELS[type]}
        </span>
        {book && (
          <span className="truncate text-xs text-ink-muted">
            《{book.title}》· {book.author}
          </span>
        )}
      </div>

      <div className="px-3 pb-3">
        <div className="relative max-h-[min(52vh,280px)] min-h-[168px] overflow-hidden rounded-xl bg-white/70">
          <div
            className={`h-full max-h-[min(52vh,280px)] min-h-[168px] overflow-y-auto px-3.5 py-3 pb-10 scrollbar-hide ${streaming ? "" : ""}`}
          >
            <MarkdownContent content={displayContent} className="card-prose" />
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle" />
            )}
          </div>
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-12 rounded-b-xl bg-gradient-to-t from-white/95 via-white/60 to-transparent" />
          <button
            type="button"
            onClick={onFullscreen}
            className="absolute right-2.5 bottom-2.5 z-10 flex items-center gap-1 rounded-full bg-ink/92 px-2.5 py-1.5 text-[11px] text-cream shadow-sm backdrop-blur-sm transition-all hover:bg-ink-light active:scale-95"
          >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
          </svg>
          全屏
        </button>
        </div>
      </div>
    </div>
  );
}
