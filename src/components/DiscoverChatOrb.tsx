"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setPendingMessage } from "@/lib/storage";

interface DiscoverChatOrbProps {
  hasProfile: boolean;
  onNeedProfile: () => void;
}

export default function DiscoverChatOrb({ hasProfile, onNeedProfile }: DiscoverChatOrbProps) {
  const router = useRouter();
  const [expanded, setExpanded] = useState(false);
  const [text, setText] = useState("");
  const [keyboardOffset, setKeyboardOffset] = useState(0);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!expanded) {
      setKeyboardOffset(0);
      return;
    }

    const vv = window.visualViewport;
    if (!vv) return;

    const syncKeyboard = () => {
      const offset = Math.max(0, window.innerHeight - vv.height - vv.offsetTop);
      setKeyboardOffset(offset);
    };

    syncKeyboard();
    vv.addEventListener("resize", syncKeyboard);
    vv.addEventListener("scroll", syncKeyboard);
    return () => {
      vv.removeEventListener("resize", syncKeyboard);
      vv.removeEventListener("scroll", syncKeyboard);
    };
  }, [expanded]);

  useEffect(() => {
    if (!expanded) return;
    const timer = window.setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(timer);
  }, [expanded]);

  const handleOpen = useCallback(() => {
    setExpanded(true);
  }, []);

  const handleClose = useCallback(() => {
    setExpanded(false);
    setText("");
    inputRef.current?.blur();
  }, []);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    if (!hasProfile) {
      onNeedProfile();
      return;
    }
    setPendingMessage(trimmed);
    handleClose();
    router.push("/chat");
  }, [text, hasProfile, onNeedProfile, handleClose, router]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {!expanded && (
        <button
          type="button"
          onClick={handleOpen}
          className="fixed bottom-6 right-5 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-accent text-xs font-bold text-white shadow-md shadow-accent/25 transition-transform hover:scale-105 active:scale-95 sm:bottom-8 sm:right-8"
          aria-label="打开 AI 输入"
        >
          AI
        </button>
      )}

      {expanded && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-40 bg-ink/10"
            aria-label="关闭输入"
            onClick={handleClose}
          />
          <div
            ref={panelRef}
            className="fixed left-0 right-0 z-50 px-4 pb-4 transition-[bottom] duration-150"
            style={{ bottom: keyboardOffset }}
          >
            <div className="mx-auto w-full max-w-2xl">
              <div className="rounded-2xl border border-paper bg-white p-3 shadow-xl">
                <textarea
                  ref={inputRef}
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="请问你想读什么书？"
                  rows={2}
                  className="w-full resize-none bg-transparent text-sm text-ink placeholder:text-ink-muted focus:outline-none"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <p className="text-[11px] text-ink-muted">也可以描述心情、困惑或书名</p>
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={!text.trim()}
                    className="shrink-0 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-40"
                  >
                    发送
                  </button>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
