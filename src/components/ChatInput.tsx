"use client";

import { useRef, useState } from "react";

interface ChatInputProps {
  onSend: (text: string) => void;
  disabled?: boolean;
  placeholder?: string;
  padded?: boolean;
  bare?: boolean;
}

export default function ChatInput({ onSend, disabled, placeholder, padded = true, bare = false }: ChatInputProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    onSend(trimmed);
    setText("");
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div
      className={
        bare
          ? "pt-1 pb-2 safe-bottom"
          : `bg-white/90 backdrop-blur-sm py-3 safe-bottom ${padded ? "border-t border-paper px-4" : ""}`
      }
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-end gap-2">
        <textarea
          ref={inputRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled}
          placeholder={placeholder ?? "说说你的想法..."}
          rows={1}
          className={`flex-1 resize-none rounded-2xl border px-4 py-3 text-sm text-ink placeholder:text-ink-muted focus:border-accent focus:outline-none disabled:opacity-50 ${
            bare ? "border-[#b8aea0] bg-white" : "border-paper bg-cream"
          }`}
          style={{ maxHeight: "120px" }}
        />
        <button
          onClick={handleSend}
          disabled={disabled || !text.trim()}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-white transition-all hover:bg-accent-dark disabled:opacity-40 active:scale-95"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
