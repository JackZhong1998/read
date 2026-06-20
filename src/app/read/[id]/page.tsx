"use client";

import { useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import EbookReader from "@/components/EbookReader";
import { normalizeReadingContent } from "@/lib/content-utils";
import type { ChatMessage } from "@/lib/types";

export default function ReadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { readBooks, profile, hydrated } = useApp();

  const book = useMemo(() => {
    const id = decodeURIComponent(params.id as string);
    return readBooks.find((b) => b.id === id) ?? null;
  }, [readBooks, params.id]);

  const readerMessages: ChatMessage[] = useMemo(() => {
    if (!book) return [];
    return [
      {
        id: book.id,
        role: "assistant",
        type: book.readType,
        content: normalizeReadingContent(book.content),
        book: { title: book.title, author: book.author, intro: book.intro },
        timestamp: book.readAt,
      },
    ];
  }, [book]);

  useEffect(() => {
    if (hydrated && !profile) {
      router.replace("/");
    } else if (hydrated && !book) {
      router.replace("/read");
    }
  }, [hydrated, profile, book, router]);

  if (!hydrated || !book) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <EbookReader
      messages={readerMessages}
      navIntent={{ chapterId: book.id, seq: 1 }}
      onClose={() => router.push("/read")}
    />
  );
}
