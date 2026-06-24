"use client";

import type { DiscoverBookRef, DiscoverFeedSegment } from "@/lib/discover-feed-types";
import { DISCOVER_PAGE_HEADER, type DiscoverRefreshIntent } from "@/lib/discover-feed";

const BADGE_STYLES: Record<string, string> = {
  必读: "bg-accent/15 text-accent",
  Top: "bg-amber-100 text-amber-800",
  畅销: "bg-sage/15 text-sage",
  经典: "bg-ink/8 text-ink-muted",
};

function BookCover({ title, size = "md" }: { title: string; size?: "sm" | "md" | "lg" }) {
  const dims = size === "lg" ? "h-36 w-28" : size === "md" ? "h-20 w-16" : "h-14 w-11";
  const short = title.replace(/[《》]/g, "").slice(0, 4);
  return (
    <div
      className={`${dims} flex shrink-0 items-center justify-center rounded-lg bg-gradient-to-b from-accent/20 to-accent/5 shadow-inner`}
    >
      <span className="px-1 text-center font-serif text-[10px] font-bold leading-tight text-accent/90">
        {short}
      </span>
    </div>
  );
}

function Badge({ label }: { label: string }) {
  const style = BADGE_STYLES[label] ?? "bg-paper text-ink-muted";
  return (
    <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${style}`}>{label}</span>
  );
}

function Stars({ count }: { count: 1 | 2 | 3 }) {
  return <span className="text-xs text-amber-500">{"★".repeat(count)}{"☆".repeat(3 - count)}</span>;
}

interface DiscoverFeedViewProps {
  feed: DiscoverFeedSegment;
  onStartBook: (title: string, context?: string) => void;
  onStartQuiz: (bookTitle: string, quizTitle: string) => void;
  onSwitchSegment: () => void;
  onRefresh?: (intent?: DiscoverRefreshIntent, userPreference?: string) => void;
  refreshing?: boolean;
}

export default function DiscoverFeedView({
  feed,
  onStartBook,
  onStartQuiz,
  onSwitchSegment,
  onRefresh,
  refreshing,
}: DiscoverFeedViewProps) {
  const { oneTapStart, problemClusters, zones, shortHooks, sevenDayPath, footer } = feed;

  return (
    <div className="flex flex-col gap-8 pb-10">
      {/* Header */}
      <section className="animate-fade-in">
        <div>
          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
            {DISCOVER_PAGE_HEADER.title}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
            {DISCOVER_PAGE_HEADER.subtitle}
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {onRefresh && (
            <button
              type="button"
              onClick={() => onRefresh("default")}
              disabled={refreshing}
              className="flex items-center gap-1 rounded-full border border-paper bg-white px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-accent disabled:opacity-50"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={refreshing ? "animate-spin" : ""}
              >
                <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />
              </svg>
              刷新
            </button>
          )}
          <button
            type="button"
            onClick={onSwitchSegment}
            className="rounded-full border border-paper bg-white px-3 py-1.5 text-xs text-ink-muted transition-colors hover:border-accent/40 hover:text-accent"
          >
            切换人群
          </button>
        </div>
      </section>

      {/* One-tap Start */}
      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-ink">今天就读这一页</h2>
        <div className="overflow-hidden rounded-2xl border border-paper bg-white shadow-sm">
          <div className="flex gap-4 p-4">
            <BookCover title={oneTapStart.primary.book.title} size="lg" />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap gap-1.5">
                {oneTapStart.primary.badges.map((b) => (
                  <Badge key={b} label={b} />
                ))}
              </div>
              <h3 className="mt-2 font-serif text-xl font-bold text-ink">
                《{oneTapStart.primary.book.title}》
              </h3>
              <p className="mt-1 text-sm font-medium text-accent">{oneTapStart.primary.hook}</p>
              <p className="mt-2 text-xs text-ink-muted">
                适合：{oneTapStart.primary.suitableFor} · 难度：<Stars count={oneTapStart.primary.difficulty} /> ·
                场景：{oneTapStart.primary.readScene}
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => onStartBook(oneTapStart.primary.book.title, oneTapStart.primary.hook)}
                  className="rounded-full bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
                >
                  开始精读（{oneTapStart.primary.readMinutes} 分钟）
                </button>
                <button
                  type="button"
                  onClick={() => onStartBook(oneTapStart.primary.book.title, "先看 3 分钟摘要")}
                  className="rounded-full border border-paper px-4 py-2 text-sm text-ink-muted hover:border-accent/30"
                >
                  先看 3 分钟摘要
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-3 flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {oneTapStart.secondary.map((book) => (
            <button
              key={book.title}
              type="button"
              onClick={() => onStartBook(book.title, book.hook)}
              className="flex min-w-[200px] shrink-0 items-center gap-3 rounded-xl border border-paper bg-white p-3 text-left transition-all hover:border-accent/25 hover:shadow-sm"
            >
              <BookCover title={book.title} size="sm" />
              <div className="min-w-0">
                {book.badge && <Badge label={book.badge} />}
                <p className="mt-1 font-serif text-sm font-bold text-ink">《{book.title}》</p>
                {book.hook && <p className="mt-0.5 line-clamp-2 text-xs text-ink-muted">{book.hook}</p>}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* Problem Clusters */}
      <section>
        <h2 className="mb-3 font-serif text-lg font-semibold text-ink">你今天想解决什么？</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {problemClusters.map((cluster) => (
            <div key={cluster.id} className="rounded-2xl border border-paper bg-white p-4">
              <h3 className="font-serif text-[15px] font-semibold text-ink">{cluster.title}</h3>
              <ul className="mt-3 space-y-2">
                {cluster.books.map((book) => (
                  <li key={book.title}>
                    <button
                      type="button"
                      onClick={() => onStartBook(book.title)}
                      className="flex w-full items-center justify-between gap-2 text-left text-sm hover:text-accent"
                    >
                      <span>《{book.title}》</span>
                      {book.badge && <Badge label={book.badge} />}
                    </button>
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => onStartBook(cluster.books[0]?.title ?? "", cluster.title)}
                className="mt-3 text-xs font-medium text-accent hover:underline"
              >
                {cluster.ctaLabel}
              </button>
            </div>
          ))}
        </div>
      </section>

      {/* Operation Zones */}
      <section className="space-y-5">
        <ZoneBlock
          title="必读"
          copy={zones.mustRead.copy}
          books={zones.mustRead.books}
          onStartBook={onStartBook}
        />
        <ZoneBlock title="Top" copy={zones.top.copy} books={zones.top.books} onStartBook={onStartBook} showRatings />
        <ZoneBlock
          title="畅销"
          copy={zones.bestseller.copy}
          books={zones.bestseller.books}
          onStartBook={onStartBook}
        />
        <ZoneBlock
          title="经典"
          copy={zones.classic.copy}
          books={zones.classic.books}
          onStartBook={onStartBook}
        />
      </section>

      {/* Short Hooks */}
      <section className="space-y-5">
        <div className="rounded-2xl border border-paper bg-white p-4">
          <h3 className="font-serif text-[15px] font-semibold text-ink">{shortHooks.quiz.title}</h3>
          <div className="mt-3 grid grid-cols-2 gap-2">
            {shortHooks.quiz.options.map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => onStartQuiz(opt.resultBook, shortHooks.quiz.title)}
                className="rounded-xl border border-paper px-3 py-2.5 text-sm text-ink transition-colors hover:border-accent/30 hover:bg-accent/5"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <h3 className="mb-2 text-sm font-medium text-ink-muted">今日金句</h3>
          <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {shortHooks.quotes.map((q, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onStartBook(q.bookTitle, `想精读这一章：${q.quote_source_chapter}`)}
                className="flex min-w-[260px] shrink-0 flex-col rounded-2xl border border-paper bg-white p-4 text-left hover:border-accent/25"
              >
                <p className="font-serif text-sm leading-relaxed text-ink">「{q.quote_text}」</p>
                <p className="mt-2 text-xs text-ink-muted">
                  — {q.bookTitle} · {q.quote_source_chapter}
                </p>
                <span className="mt-3 text-xs font-medium text-accent">去精读这一章 →</span>
              </button>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-paper bg-white p-4">
          <h3 className="text-sm font-medium text-ink-muted">本周热门精读任务</h3>
          <ol className="mt-3 space-y-3">
            {shortHooks.weeklyTasks.map((task) => (
              <li key={task.rank}>
                <button
                  type="button"
                  onClick={() => onStartBook(task.bookTitle, `精读${task.chapter}：${task.title}`)}
                  className="flex w-full items-start gap-3 text-left hover:text-accent"
                >
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent/12 text-xs font-bold text-accent">
                    {task.rank}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-ink">
                      {task.bookTitle}｜{task.chapter}：{task.title}
                    </p>
                  </div>
                </button>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 7-day Path */}
      <section className="rounded-2xl border border-accent/20 bg-accent/5 p-5">
        <h2 className="font-serif text-lg font-semibold text-ink">7 天游泳道</h2>
        <ol className="mt-4 space-y-2">
          {sevenDayPath.days.map((d) => (
            <li key={d.day} className="flex items-baseline gap-2 text-sm">
              <span className="w-14 shrink-0 font-medium text-accent">Day {d.day}</span>
              <span className="text-ink">
                {d.bookTitle === "复盘" ? d.bookTitle : `《${d.bookTitle}》`} — {d.theme}
              </span>
            </li>
          ))}
        </ol>
        <button
          type="button"
          onClick={() => onStartBook(sevenDayPath.days[0]?.bookTitle ?? "", "开始 7 天精读路线")}
          className="mt-5 w-full rounded-full bg-accent py-3 text-sm font-medium text-white hover:bg-accent-dark sm:w-auto sm:px-8"
        >
          {sevenDayPath.ctaLabel}
        </button>
      </section>

      {/* Footer */}
      <section className="flex flex-wrap gap-2 border-t border-paper pt-6">
        <button
          type="button"
          onClick={() => onRefresh?.("default", footer.refreshLabel)}
          disabled={!onRefresh || refreshing}
          className="rounded-full border border-paper bg-white px-4 py-2 text-xs text-ink-muted hover:border-accent/30 disabled:opacity-50"
        >
          {footer.refreshLabel}
        </button>
        <button
          type="button"
          onClick={() => onRefresh?.("easy", footer.easyFilter)}
          disabled={!onRefresh || refreshing}
          className="rounded-full border border-paper bg-white px-4 py-2 text-xs text-ink-muted hover:border-accent/30 disabled:opacity-50"
        >
          {footer.easyFilter}
        </button>
        <button
          type="button"
          onClick={() => onRefresh?.("hard", footer.hardFilter)}
          disabled={!onRefresh || refreshing}
          className="rounded-full border border-paper bg-white px-4 py-2 text-xs text-ink-muted hover:border-accent/30 disabled:opacity-50"
        >
          {footer.hardFilter}
        </button>
      </section>
    </div>
  );
}

function ZoneBlock({
  title,
  copy,
  books,
  onStartBook,
  showRatings,
}: {
  title: string;
  copy: string;
  books: DiscoverBookRef[];
  onStartBook: (title: string, context?: string) => void;
  showRatings?: boolean;
}) {
  return (
    <div>
      <div className="mb-2 flex items-baseline gap-2">
        <h3 className="font-serif text-base font-semibold text-ink">{title}</h3>
        <p className="text-xs text-ink-muted">{copy}</p>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {books.map((book) => (
          <button
            key={book.title}
            type="button"
            onClick={() => onStartBook(book.title)}
            className="flex min-w-[120px] shrink-0 flex-col items-center gap-2 rounded-xl border border-paper bg-white p-3 transition-all hover:border-accent/25"
          >
            <BookCover title={book.title} size="sm" />
            <p className="text-center font-serif text-xs font-bold text-ink">《{book.title}》</p>
            {showRatings && (book.doubanRating || book.goodreadsRating) && (
              <p className="text-[10px] text-ink-muted">
                {book.doubanRating && `豆瓣 ${book.doubanRating}`}
                {book.doubanRating && book.goodreadsRating && " · "}
                {book.goodreadsRating && `GR ${book.goodreadsRating}`}
              </p>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
