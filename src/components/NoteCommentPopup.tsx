"use client";

import { useEffect, useRef, useState } from "react";

interface NoteCommentPopupProps {
  x: number;
  y: number;
  noteId: string;
  initialComment?: string;
  onSave: (noteId: string, comment: string) => void;
  onClose: () => void;
}

const AUTO_DISMISS_MS = 6000;

export default function NoteCommentPopup({
  x,
  y,
  noteId,
  initialComment = "",
  onSave,
  onClose,
}: NoteCommentPopupProps) {
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState(initialComment);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    setComment(initialComment);
    setOpen(false);
  }, [initialComment, noteId]);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
      return;
    }
    const timer = window.setTimeout(onClose, AUTO_DISMISS_MS);
    return () => window.clearTimeout(timer);
  }, [open, onClose, noteId]);

  const handleSave = () => {
    onSave(noteId, comment.trim());
    setOpen(false);
    onClose();
  };

  if (open) {
    return (
      <div
        className="fixed inset-0 z-[60]"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
      >
        <div
          className="absolute z-[61] w-[min(280px,calc(100vw-32px))] rounded-xl border border-black/8 bg-[#faf7f2] p-3 shadow-lg"
          style={{
            left: Math.min(x, typeof window !== "undefined" ? window.innerWidth - 296 : x),
            top: Math.min(y + 8, typeof window !== "undefined" ? window.innerHeight - 200 : y),
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <p className="mb-2 text-xs text-[#8a7f72]">添加评论</p>
          <textarea
            ref={inputRef}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="写下你的想法..."
            rows={3}
            className="w-full resize-none rounded-lg border border-black/8 bg-white px-3 py-2 text-sm text-[#2a2520] outline-none focus:border-[#c45c26]/40"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-full px-3 py-1 text-xs text-[#8a7f72]"
            >
              取消
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-full bg-[#c45c26] px-3 py-1 text-xs text-white"
            >
              保存
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[55]" onClick={onClose}>
      <button
        type="button"
        className="absolute flex h-8 w-8 items-center justify-center rounded-full bg-[#c45c26] text-white shadow-md transition-transform active:scale-95"
        style={{
          left: x,
          top: y,
          transform: "translate(-50%, -100%)",
        }}
        onClick={(e) => {
          e.stopPropagation();
          setOpen(true);
        }}
        aria-label="添加评论"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      </button>
    </div>
  );
}
