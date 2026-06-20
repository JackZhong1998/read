"use client";

interface LoadingDotsProps {
  text?: string;
}

export default function LoadingDots({ text }: LoadingDotsProps) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 animate-fade-in">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-accent/60 animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
      {text && <span className="text-sm text-ink-muted">{text}</span>}
    </div>
  );
}
