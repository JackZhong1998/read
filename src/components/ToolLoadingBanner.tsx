"use client";

interface ToolLoadingProps {
  tool: "tuijian" | "jingdu" | "shendu";
  bookTitle?: string;
}

const LABELS = {
  tuijian: "书籍推荐",
  jingdu: "精读",
  shendu: "深读",
};

export default function ToolLoadingBanner({ tool, bookTitle }: ToolLoadingProps) {
  const message =
    tool === "tuijian"
      ? "正在为你挑选书籍…"
      : `正在为${bookTitle ? `《${bookTitle}》` : "这本书"}生成${LABELS[tool]}内容…`;

  return (
    <div className="flex items-center gap-3 px-4 py-3 animate-fade-in">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-sage/70 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      <span className="text-sm text-ink-muted">{message}</span>
    </div>
  );
}
