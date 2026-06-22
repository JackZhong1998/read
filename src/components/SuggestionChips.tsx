"use client";

interface SuggestionChipsProps {
  suggestions: string[];
  onSelect: (text: string) => void;
  loading?: boolean;
  variant?: "chips" | "reader";
  padded?: boolean;
}

export default function SuggestionChips({
  suggestions,
  onSelect,
  loading,
  variant = "chips",
  padded = true,
}: SuggestionChipsProps) {
  const chipPad = padded ? "px-4" : "";
  if (loading) {
    if (variant === "reader") {
      return (
        <div className="space-y-2 px-3 py-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 animate-pulse rounded-lg bg-[#e8e0d4]/60" />
          ))}
        </div>
      );
    }
    return (
      <div className={`flex gap-2 overflow-x-auto py-2 scrollbar-hide ${chipPad}`}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-9 w-28 shrink-0 animate-pulse rounded-full bg-paper" />
        ))}
      </div>
    );
  }

  if (!suggestions.length) return null;

  if (variant === "reader") {
    return (
      <div className="space-y-1.5">
        {suggestions.map((s, i) => (
          <button
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(s);
            }}
            className="w-full rounded-lg border border-[#d4cbbf] bg-[#faf7f2] px-4 py-2.5 text-left text-sm leading-snug text-[#3d362e] transition-all hover:border-[#c45c26]/40 hover:bg-white active:scale-[0.99]"
          >
            {s}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex gap-2 overflow-x-auto py-2 scrollbar-hide ${chipPad}`}>
      {suggestions.map((s, i) => (
        <button
          key={i}
          onClick={() => onSelect(s)}
          className="shrink-0 rounded-full border border-accent/20 bg-white/80 px-4 py-2 text-sm text-ink-light transition-all hover:border-accent hover:bg-accent/5 active:scale-95"
        >
          {s}
        </button>
      ))}
    </div>
  );
}
