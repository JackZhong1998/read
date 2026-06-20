"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";

const TYPE_BADGE = {
  jingdu: { label: "精读", className: "bg-sage/10 text-sage" },
  shendu: { label: "深读", className: "bg-gold/10 text-gold" },
};

export default function ReadListPage() {
  const router = useRouter();
  const { readBooks, profile, hydrated } = useApp();

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace("/");
    }
  }, [hydrated, profile, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-cream">
      <header className="flex items-center gap-3 border-b border-paper bg-white/90 px-4 py-4 backdrop-blur-sm safe-top">
        <Link href="/chat" className="text-ink-muted hover:text-ink">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
        </Link>
        <div>
          <h1 className="font-serif text-xl font-bold text-ink">已读书目</h1>
          <p className="text-xs text-ink-muted">共 {readBooks.length} 篇精读 / 深读</p>
        </div>
      </header>

      <div className="px-4 py-6">
        {readBooks.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="mb-4 text-5xl opacity-40">📚</div>
            <p className="font-serif text-lg text-ink-light">还没有精读或深读记录</p>
            <p className="mt-2 text-sm text-ink-muted">开始对话，找到你的第一本书吧</p>
            <Link
              href="/chat"
              className="mt-6 rounded-full bg-accent px-6 py-3 text-sm text-white hover:bg-accent-dark"
            >
              去对话
            </Link>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {readBooks.map((book) => {
              const badge = TYPE_BADGE[book.readType] ?? TYPE_BADGE.jingdu;
              return (
                <Link
                  key={book.id}
                  href={`/read/${encodeURIComponent(book.id)}`}
                  className="flex items-start gap-4 rounded-2xl border border-paper bg-white p-4 transition-all hover:border-accent/30 hover:shadow-sm active:scale-[0.99]"
                >
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent/10 text-xl">
                    {book.readType === "shendu" ? "🔍" : "⚡"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-serif text-base font-semibold text-ink truncate">
                        {book.title}
                      </h3>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] ${badge.className}`}>
                        {badge.label}
                      </span>
                      {book.completed && (
                        <span className="shrink-0 rounded-full bg-accent/10 px-2 py-0.5 text-[10px] text-accent">
                          已读完
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-ink-muted">{book.author}</p>
                    <p className="mt-1 text-xs text-ink-muted">
                      {new Date(book.readAt).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mt-1 shrink-0 text-ink-muted">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
