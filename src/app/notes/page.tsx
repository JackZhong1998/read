"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import { useApp } from "@/context/AppContext";
import { formatNoteForCopy } from "@/lib/reading-notes";

export default function NotesPage() {
  const router = useRouter();
  const { readingNotes, profile, hydrated } = useApp();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace("/");
    }
  }, [hydrated, profile, router]);

  const handleCopy = async (noteId: string) => {
    const note = readingNotes.find((n) => n.id === noteId);
    if (!note) return;
    try {
      await navigator.clipboard.writeText(formatNoteForCopy(note));
      setCopiedId(noteId);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // clipboard unavailable
    }
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <AppNav subtitle={`共 ${readingNotes.length} 条笔记`} />

      <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
        {readingNotes.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 text-5xl opacity-40">📝</div>
            <p className="font-serif text-lg text-ink-light">还没有笔记</p>
            <p className="mt-2 text-sm text-ink-muted">
              在阅读时长按选中文字，即可划线并添加评论
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {readingNotes.map((note) => (
              <article
                key={note.id}
                className="rounded-2xl border border-paper bg-white p-4 transition-all hover:border-accent/20"
              >
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h3 className="truncate font-serif text-sm font-semibold text-ink">
                      {note.sourceTitle}
                    </h3>
                    {note.sourceAuthor && (
                      <p className="text-xs text-ink-muted">{note.sourceAuthor}</p>
                    )}
                  </div>
                  <time className="shrink-0 text-[11px] text-ink-muted">
                    {new Date(note.createdAt).toLocaleDateString("zh-CN")}
                  </time>
                </div>

                <blockquote className="border-l-2 border-accent/40 pl-3 text-sm leading-relaxed text-ink">
                  <span className="reading-underline-static">{note.text}</span>
                </blockquote>

                {note.comment?.trim() && (
                  <p className="mt-3 rounded-lg bg-cream/80 px-3 py-2 text-sm text-ink-muted">
                    {note.comment.trim()}
                  </p>
                )}

                <div className="mt-3 flex justify-end">
                  <button
                    type="button"
                    onClick={() => handleCopy(note.id)}
                    className="inline-flex items-center gap-1.5 rounded-full border border-paper px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/30 hover:text-accent"
                  >
                    {copiedId === note.id ? (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                        已复制
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <rect x="9" y="9" width="13" height="13" rx="2" />
                          <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                        </svg>
                        复制
                      </>
                    )}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
