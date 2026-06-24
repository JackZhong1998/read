"use client";

import { forwardRef, useLayoutEffect } from "react";
import type { ReadingNote } from "@/lib/types";
import { applyReadingHighlights, clearReadingHighlights } from "@/lib/reading-underline";
import MarkdownContent from "./MarkdownContent";

interface MarkdownWithNotesProps {
  content: string;
  className?: string;
  notes: ReadingNote[];
  pageIndex: number;
}

const MarkdownWithNotes = forwardRef<HTMLDivElement, MarkdownWithNotesProps>(
  function MarkdownWithNotes({ content, className = "", notes, pageIndex }, ref) {
    useLayoutEffect(() => {
      const el = ref && typeof ref !== "function" ? ref.current : null;
      if (!el || !notes.length) {
        clearReadingHighlights();
        return;
      }

      applyReadingHighlights(el, notes, pageIndex);

      return () => {
        clearReadingHighlights();
        el.querySelectorAll("span.reading-underline").forEach((span) => {
          const parent = span.parentNode;
          if (!parent) return;
          while (span.firstChild) parent.insertBefore(span.firstChild, span);
          parent.removeChild(span);
        });
      };
    }, [content, notes, pageIndex, ref]);

    return (
      <div ref={ref} className="h-full min-h-0 overflow-hidden">
        <MarkdownContent content={content} className={className} />
      </div>
    );
  }
);

export default MarkdownWithNotes;
