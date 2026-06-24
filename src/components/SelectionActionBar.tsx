"use client";

interface SelectionActionBarProps {
  x: number;
  y: number;
  onHighlight: () => void;
  onShare: () => void;
  onClose: () => void;
}

export default function SelectionActionBar({
  x,
  y,
  onHighlight,
  onShare,
  onClose,
}: SelectionActionBarProps) {
  const maxX = typeof window !== "undefined" ? window.innerWidth - 16 : x;
  const left = Math.min(Math.max(16, x), maxX);

  return (
    <div
      className="fixed inset-0 z-[58]"
      onClick={(e) => {
        e.stopPropagation();
        onClose();
      }}
    >
      <div
        className="absolute z-[59] flex items-center gap-1 rounded-full border border-black/8 bg-[#2a2520] p-1 shadow-lg"
        style={{
          left,
          top: Math.max(60, y - 52),
          transform: "translateX(-50%)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onHighlight}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white transition-colors hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 20h16M6 16l6-10 6 10" />
          </svg>
          划线做笔记
        </button>
        <div className="h-5 w-px bg-white/20" />
        <button
          type="button"
          onClick={onShare}
          className="flex items-center gap-1.5 rounded-full px-3 py-2 text-xs text-white transition-colors hover:bg-white/10"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" />
            <polyline points="16 6 12 2 8 6" />
            <line x1="12" y1="2" x2="12" y2="15" />
          </svg>
          分享
        </button>
      </div>
    </div>
  );
}
