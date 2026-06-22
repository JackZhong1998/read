"use client";

import type { DiscoverItem } from "@/lib/discover-data";

interface DiscoverItemCardProps {
  item: DiscoverItem;
  index: number;
  onStartChat: (item: DiscoverItem) => void;
}

export default function DiscoverItemCard({ item, index, onStartChat }: DiscoverItemCardProps) {
  return (
    <button
      type="button"
      onClick={() => onStartChat(item)}
      className="w-full overflow-hidden rounded-2xl border border-paper bg-white text-left shadow-sm transition-all hover:border-accent/25 hover:shadow-md active:scale-[0.99]"
    >
      <div className="flex gap-3 border-b border-paper/80 bg-cream/40 px-4 py-4">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent/12 font-serif text-xs font-bold text-accent">
          {index + 1}
        </span>
        <p className="font-serif text-[15px] leading-relaxed text-ink sm:text-base">{item.question}</p>
      </div>

      <div className="flex gap-4 p-4">
        <div className="flex h-14 w-11 shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-accent/15 to-accent/5 shadow-inner">
          <span className="font-serif text-[10px] font-bold leading-tight text-accent/80">解忧</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-medium uppercase tracking-wider text-sage">推荐书籍</p>
          <h3 className="mt-1 font-serif text-lg font-bold text-ink">{item.bookTitle}</h3>
          <p className="mt-2 text-sm leading-relaxed text-ink-light">{item.tagline}</p>
        </div>
      </div>
    </button>
  );
}
