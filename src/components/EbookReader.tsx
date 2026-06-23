"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { ChatMessage } from "@/lib/types";
import {
  buildPagedBook,
  buildReaderChapters,
  formatTailDialogueMarkdown,
  getChapterAtPage,
  getLastAssistantChat,
  resolveNavPage,
  type PageBook,
  type ReaderNavIntent,
} from "@/lib/reader-utils";
import { destroyPaginationMeasurer } from "@/lib/reader-pagination";
import MarkdownContent from "./MarkdownContent";
import ReaderTailPanel from "./ReaderTailPanel";
import ToolLoadingBanner from "./ToolLoadingBanner";
import LoadingDots from "./LoadingDots";

interface EbookReaderProps {
  messages: ChatMessage[];
  suggestions?: string[];
  suggestionsLoading?: boolean;
  chatLoading?: boolean;
  toolLoading?: { tool: "tuijian" | "jingdu" | "shendu"; bookTitle?: string } | null;
  onSendMessage?: (text: string) => void;
  onClose: () => void;
  onReachEnd?: (msg: ChatMessage) => void;
  navIntent?: ReaderNavIntent | null;
  withTailPage?: boolean;
  withWaitingChapter?: boolean;
}

const KIND_ICONS: Record<string, string> = {
  dialogue: "💬",
  rec: "📚",
  jingdu: "⚡",
  shendu: "🔍",
  waiting: "⏳",
};

function readViewport() {
  if (typeof window === "undefined") return { w: 375, h: 560 };
  return { w: window.innerWidth, h: Math.max(400, window.innerHeight - 120) };
}

export default function EbookReader({
  messages,
  suggestions = [],
  suggestionsLoading,
  chatLoading,
  toolLoading,
  onSendMessage,
  onClose,
  onReachEnd,
  navIntent,
  withTailPage = false,
  withWaitingChapter = false,
}: EbookReaderProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [showChrome, setShowChrome] = useState(true);
  const [showTOC, setShowTOC] = useState(false);
  const [pageLayout, setPageLayout] = useState(readViewport);
  const viewportRef = useRef<HTMLDivElement>(null);
  const markedChaptersRef = useRef<Set<string>>(new Set());
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const appliedNavSeqRef = useRef(0);
  /** 记录最近一次导航目标，分页重算后重新定位 */
  const navAnchorRef = useRef<{ chapterId: string; seq: number } | null>(null);
  const userPagedRef = useRef(false);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const lastAssistantChat = useMemo(() => getLastAssistantChat(messages), [messages]);

  const { chapters, tailDialogueContent } = useMemo(
    () =>
      buildReaderChapters(messages, {
        includeWaitingChapter: withWaitingChapter,
        mergeTailDialogue: withTailPage,
      }),
    [messages, withWaitingChapter, withTailPage]
  );

  const tailDialogueMarkdown = useMemo(
    () => formatTailDialogueMarkdown(tailDialogueContent || lastAssistantChat),
    [tailDialogueContent, lastAssistantChat]
  );

  const charPagedBook = useMemo(
    () =>
      buildPagedBook(chapters, pageLayout, {
        includeTailPage: withTailPage,
        useDomMeasure: false,
      }),
    [chapters, pageLayout, withTailPage]
  );

  const [domPagedBook, setDomPagedBook] = useState<PageBook | null>(null);

  useEffect(() => {
    setDomPagedBook(
      buildPagedBook(chapters, pageLayout, {
        includeTailPage: withTailPage,
      })
    );
  }, [chapters, pageLayout, withTailPage]);

  const { pages, chapterStarts, tailPageIndex } = domPagedBook ?? charPagedBook;

  const totalPages = pages.length;
  const isTailPage = withTailPage && tailPageIndex !== undefined && currentPage === tailPageIndex;
  const isWaitingChapter =
    getChapterAtPage(chapters, chapterStarts, currentPage)?.kind === "waiting";
  const isOverlayPage = isTailPage || isWaitingChapter;
  const currentChapter = isTailPage
    ? undefined
    : getChapterAtPage(chapters, chapterStarts, currentPage);

  const applyNavToChapter = useCallback(
    (chapterId: string, seq: number) => {
      const page = resolveNavPage(chapters, chapterStarts, chapterId, tailPageIndex);
      if (page < 0) return false;
      setCurrentPage(page);
      appliedNavSeqRef.current = seq;
      navAnchorRef.current = { chapterId, seq };
      userPagedRef.current = false;
      return true;
    },
    [chapters, chapterStarts, tailPageIndex]
  );

  const goToChapter = useCallback(
    (chapterId: string) => {
      const page = resolveNavPage(chapters, chapterStarts, chapterId, tailPageIndex);
      if (page >= 0) {
        userPagedRef.current = true;
        setCurrentPage(page);
      }
    },
    [chapters, chapterStarts, tailPageIndex]
  );

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;

    const update = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 0 && h > 0) {
        setPageLayout((prev) => (prev.w === w && prev.h === h ? prev : { w, h }));
      }
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener("resize", update);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", update);
    };
  }, []);

  useEffect(
    () => () => {
      queueMicrotask(() => destroyPaginationMeasurer());
    },
    []
  );

  // 导航意图：seq 变化时定位；章节尚未就绪则等待下一帧
  useEffect(() => {
    if (!navIntent || navIntent.seq === appliedNavSeqRef.current) return;
    applyNavToChapter(navIntent.chapterId, navIntent.seq);
  }, [navIntent, applyNavToChapter]);

  // 视口变化导致分页重算后，若用户未手动翻页，则重新定位到导航目标
  useEffect(() => {
    const anchor = navAnchorRef.current;
    if (!anchor || userPagedRef.current) return;
    if (navIntent?.seq !== anchor.seq) return;
    applyNavToChapter(anchor.chapterId, anchor.seq);
  }, [chapterStarts, pages.length, pageLayout, navIntent?.seq, applyNavToChapter]);

  useEffect(() => {
    setCurrentPage((p) => (p >= pages.length ? Math.max(0, pages.length - 1) : p));
  }, [pages.length]);

  useEffect(() => {
    if (!currentChapter || !onReachEnd || isOverlayPage) return;
    const idx = chapters.indexOf(currentChapter);
    const chapterEnd =
      idx < chapters.length - 1
        ? (chapterStarts[chapters[idx + 1]?.id] ?? totalPages) - 1
        : withTailPage && tailPageIndex !== undefined
          ? tailPageIndex - 1
          : totalPages - 1;

    if (
      currentPage >= chapterEnd &&
      currentChapter.kind === "jingdu" &&
      currentChapter.messageId &&
      !markedChaptersRef.current.has(currentChapter.id)
    ) {
      const msg = messages.find((m) => m.id === currentChapter.messageId);
      if (msg) {
        markedChaptersRef.current.add(currentChapter.id);
        onReachEnd(msg);
      }
    }
  }, [
    currentPage,
    currentChapter,
    chapters,
    chapterStarts,
    totalPages,
    messages,
    onReachEnd,
    isOverlayPage,
    withTailPage,
    tailPageIndex,
  ]);

  const flashChrome = useCallback(() => {
    setShowChrome(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      setShowChrome(false);
      setShowTOC(false);
    }, 3000);
  }, []);

  const goNext = useCallback(() => {
    userPagedRef.current = true;
    setCurrentPage((p) => Math.min(p + 1, totalPages - 1));
    flashChrome();
  }, [totalPages, flashChrome]);

  const goPrev = useCallback(() => {
    userPagedRef.current = true;
    setCurrentPage((p) => Math.max(p - 1, 0));
    flashChrome();
  }, [flashChrome]);

  const jumpToChapter = useCallback(
    (chapterId: string) => {
      goToChapter(chapterId);
      setShowTOC(false);
      flashChrome();
    },
    [goToChapter, flashChrome]
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (isOverlayPage) {
        if ((e.key === "ArrowLeft" || e.key === "ArrowUp") && currentPage > 0) goPrev();
        if (e.key === "Escape") {
          if (showTOC) setShowTOC(false);
          else onClose();
        }
        return;
      }
      if (e.key === "ArrowRight" || e.key === "ArrowDown") goNext();
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") goPrev();
      if (e.key === "Escape") {
        if (showTOC) setShowTOC(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goNext, goPrev, onClose, showTOC, isOverlayPage, currentPage]);

  useEffect(() => {
    flashChrome();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [flashChrome]);

  const canGoPrev = currentPage > 0;

  const handleTap = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const ratio = x / rect.width;
    flashChrome();
    if (isTailPage) {
      if (ratio < 0.28 && canGoPrev) goPrev();
      return;
    }
    if (isWaitingChapter) {
      if (ratio < 0.28 && canGoPrev) goPrev();
      return;
    }
    if (ratio < 0.28) goPrev();
    else if (ratio > 0.72) goNext();
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const touch = e.touches[0];
    if (!touch) return;
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;

    const touch = e.changedTouches[0];
    if (!touch) return;

    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);

    if (absDx < 48 || absDx < absDy * 1.2) return;

    flashChrome();
    if (dx < 0) {
      if (isOverlayPage && !isTailPage) return;
      if (!isTailPage) goNext();
    } else if (canGoPrev) {
      goPrev();
    }
  };

  const tocTitle = isTailPage
    ? "💬 对话"
    : currentChapter
      ? `${KIND_ICONS[currentChapter.kind] ?? ""} ${currentChapter.title}`
      : "目录";

  return (
    <div className="ebook-reader fixed inset-0 z-50 flex flex-col bg-cream text-[#2a2520]">
      <div
        className={`absolute inset-x-0 top-0 z-30 flex items-center justify-between px-3 pt-[max(8px,env(safe-area-inset-top))] pb-2 transition-opacity duration-300 safe-top ${
          showChrome ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
          className="rounded-full bg-black/5 px-3 py-1.5 text-xs text-[#5c5348] backdrop-blur-sm"
        >
          关闭
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowTOC((v) => !v);
          }}
          className="max-w-[45%] truncate rounded-full bg-black/5 px-3 py-1.5 text-xs text-[#5c5348] backdrop-blur-sm"
        >
          {tocTitle}
        </button>
        <div className="flex items-center gap-2">
          {withTailPage && !isOverlayPage && tailPageIndex !== undefined && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                goToChapter("tail");
                flashChrome();
              }}
              className="rounded-full bg-[#c45c26]/10 px-2.5 py-1 text-xs text-[#c45c26]"
            >
              对话
            </button>
          )}
          <span className="text-xs tabular-nums text-[#8a7f72]">
            {currentPage + 1}/{totalPages}
          </span>
        </div>
      </div>

      {showTOC && showChrome && (
        <div className="absolute inset-x-0 top-[calc(env(safe-area-inset-top)+40px)] z-40 mx-3 rounded-xl bg-[#faf7f2]/95 shadow-lg backdrop-blur-md md:mx-auto md:max-w-sm">
          <div className="max-h-64 overflow-y-auto p-2">
            {chapters.map((ch) => (
              <button
                key={ch.id}
                onClick={() => jumpToChapter(ch.id)}
                className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  currentChapter?.id === ch.id
                    ? "bg-[#e8e0d4] text-[#2a2520]"
                    : "text-[#5c5348] hover:bg-[#ede8df]"
                }`}
              >
                <span className="shrink-0">{KIND_ICONS[ch.kind] ?? "·"}</span>
                <span className="line-clamp-2">{ch.title}</span>
              </button>
            ))}
            {withTailPage && tailPageIndex !== undefined && (
              <button
                onClick={() => {
                  goToChapter("tail");
                  setShowTOC(false);
                  flashChrome();
                }}
                className={`flex w-full items-start gap-2 rounded-lg px-3 py-2.5 text-left text-sm transition-colors ${
                  isTailPage
                    ? "bg-[#e8e0d4] text-[#2a2520]"
                    : "text-[#5c5348] hover:bg-[#ede8df]"
                }`}
              >
                <span className="shrink-0">💬</span>
                <span>对话</span>
              </button>
            )}
          </div>
        </div>
      )}

      <div
        className="relative flex flex-1 overflow-hidden"
        onClick={handleTap}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="ebook-page relative mx-auto flex h-full min-h-0 w-full max-w-full flex-col pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))] pt-[max(1.75rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pl-[max(28px,env(safe-area-inset-left))] sm:pr-[max(28px,env(safe-area-inset-right))] md:max-w-2xl md:px-10 md:pt-10 lg:max-w-3xl">
          <div
            ref={viewportRef}
            className="flex min-h-0 flex-1 flex-col overflow-hidden"
            aria-hidden={isOverlayPage}
          >
            {!isOverlayPage && (
              <div className="h-full min-h-0 overflow-hidden">
                <MarkdownContent content={pages[currentPage] ?? ""} className="ebook-prose" />
              </div>
            )}
          </div>

          {isWaitingChapter && (
            <div
              className="absolute inset-0 z-[1] flex flex-col items-center justify-center gap-4 bg-cream pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))] pt-[max(1.75rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pl-[max(28px,env(safe-area-inset-left))] sm:pr-[max(28px,env(safe-area-inset-right))] md:px-10 md:pt-10"
              onClick={(e) => e.stopPropagation()}
            >
              {canGoPrev && (
                <button
                  type="button"
                  onClick={goPrev}
                  className="absolute left-3 top-8 text-xs text-[#8a7f72] hover:text-[#3d362e] sm:left-5 md:left-6 md:top-10"
                >
                  ← 上一页
                </button>
              )}
              <h2 className="text-sm tracking-widest text-[#8a7f72]">正在生成内容</h2>
              {toolLoading ? (
                <ToolLoadingBanner tool={toolLoading.tool} bookTitle={toolLoading.bookTitle} />
              ) : (
                <LoadingDots text="正在思考..." />
              )}
            </div>
          )}

          {isTailPage && onSendMessage && (
            <div className="absolute inset-0 z-[1] flex min-h-0 flex-col pl-[max(24px,env(safe-area-inset-left))] pr-[max(24px,env(safe-area-inset-right))] pt-[max(1.75rem,calc(env(safe-area-inset-top)+0.75rem))] pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pl-[max(28px,env(safe-area-inset-left))] sm:pr-[max(28px,env(safe-area-inset-right))] md:px-10 md:pt-10">
              <ReaderTailPanel
                dialogueMarkdown={tailDialogueMarkdown}
                suggestions={suggestions}
                suggestionsLoading={suggestionsLoading}
                chatLoading={chatLoading}
                onSelectSuggestion={onSendMessage}
                onSend={onSendMessage}
                onTapBlank={flashChrome}
              />
            </div>
          )}
        </div>
        {(isTailPage || isWaitingChapter) && canGoPrev ? (
          <div
            className="absolute inset-y-0 left-0 z-10 w-[28%]"
            onClick={(e) => {
              e.stopPropagation();
              goPrev();
            }}
            aria-label="上一页"
          />
        ) : !isOverlayPage ? (
          <>
            <div className="pointer-events-none absolute inset-y-0 left-0 w-[28%]" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-[28%]" />
          </>
        ) : null}
      </div>

      <div
        className={`px-4 pb-[max(12px,env(safe-area-inset-bottom))] transition-opacity duration-300 safe-bottom ${
          showChrome ? "opacity-100" : "opacity-0"
        }`}
      >
        <div className="mx-auto h-0.5 max-w-2xl overflow-hidden rounded-full bg-black/8">
          <div
            className="h-full bg-[#8a7f72]/50 transition-all duration-300"
            style={{ width: `${((currentPage + 1) / totalPages) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
}
