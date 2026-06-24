import type { AgeGroup, Gender } from "./types";
import type { DiscoverBookRef, DiscoverFeedSegment } from "./discover-feed-types";
import { DISCOVER_FEEDS } from "@/data/discover";

export const DISCOVER_PAGE_HEADER = {
  title: "AI推荐：个人专属书单",
  subtitle: "用的越多，让 AI 更了解你，推荐更加精准",
} as const;

export function applyDiscoverHeader(feed: DiscoverFeedSegment): DiscoverFeedSegment {
  return { ...feed, header: { ...DISCOVER_PAGE_HEADER } };
}

export type DiscoverRefreshIntent = "default" | "easy" | "hard";

export function collectMutableSectionTitles(feed: DiscoverFeedSegment): string[] {
  const titles = new Set<string>();
  titles.add(feed.oneTapStart.primary.book.title);
  feed.oneTapStart.secondary.forEach((b) => titles.add(b.title));
  feed.problemClusters.forEach((c) => c.books.forEach((b) => titles.add(b.title)));
  feed.shortHooks.quotes.forEach((q) => titles.add(q.bookTitle));
  feed.shortHooks.weeklyTasks.forEach((t) => titles.add(t.bookTitle));
  feed.shortHooks.quiz.options.forEach((o) => titles.add(o.resultBook));
  feed.sevenDayPath.days.forEach((d) => titles.add(d.bookTitle));
  return [...titles];
}

export function collectZoneBookPool(feed: DiscoverFeedSegment): DiscoverBookRef[] {
  const seen = new Set<string>();
  const pool: DiscoverBookRef[] = [];
  for (const zone of Object.values(feed.zones)) {
    for (const book of zone.books) {
      if (!seen.has(book.title)) {
        seen.add(book.title);
        pool.push(book);
      }
    }
  }
  return pool;
}

function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j]!, copy[i]!];
  }
  return copy;
}

/** AI 不可用时的本地换一批：保留运营区，其余区块明显换书 */
export function shuffleDiscoverFeed(
  feed: DiscoverFeedSegment,
  options?: {
    currentFeed?: DiscoverFeedSegment;
    intent?: DiscoverRefreshIntent;
    userPreference?: string;
  }
): DiscoverFeedSegment {
  const base = applyDiscoverHeader(feed);
  const avoid = new Set(
    options?.currentFeed ? collectMutableSectionTitles(options.currentFeed) : []
  );
  const pool = shuffleArray(
    collectZoneBookPool(base).filter((b) => !avoid.has(b.title))
  );
  const fallbackPool = collectZoneBookPool(base);

  const pickBook = (index: number): DiscoverBookRef =>
    pool[index] ?? shuffleArray(fallbackPool)[index % fallbackPool.length]!;

  const intentHook =
    options?.intent === "easy"
      ? "轻松好读，不费脑子"
      : options?.intent === "hard"
        ? "硬核进阶，值得深啃"
        : undefined;

  const primary = pickBook(0);
  const secondaries = [pickBook(1), pickBook(2), pickBook(3)].map((b) => ({
    title: b.title,
    author: b.author,
    badge: b.badge,
    hook: intentHook ?? b.hook,
  }));

  const clusterThemes =
    options?.intent === "easy"
      ? ["想放松充电", "睡前轻松读", "治愈系困惑", "不费力的成长"]
      : options?.intent === "hard"
        ? ["想硬核突破", "深度思考向", "进阶挑战", "啃大部头也值得"]
        : base.problemClusters.map((c) => c.title);

  return {
    ...base,
    oneTapStart: {
      primary: {
        ...base.oneTapStart.primary,
        book: { title: primary.title, author: primary.author },
        hook: intentHook ?? primary.hook ?? base.oneTapStart.primary.hook,
        difficulty:
          options?.intent === "easy"
            ? 1
            : options?.intent === "hard"
              ? 3
              : base.oneTapStart.primary.difficulty,
      },
      secondary: secondaries,
    },
    problemClusters: base.problemClusters.map((cluster, i) => ({
      ...cluster,
      title: clusterThemes[i] ?? cluster.title,
      books: shuffleArray(collectZoneBookPool(base))
        .filter((b) => b.title !== primary.title)
        .slice(0, 3),
    })),
    zones: base.zones,
    shortHooks: {
      quiz: {
        ...base.shortHooks.quiz,
        title:
          options?.userPreference?.trim() ||
          (options?.intent === "easy"
            ? "3 分钟测一测：你现在需要哪种轻松读物？"
            : options?.intent === "hard"
              ? "3 分钟测一测：你准备好啃哪种硬书？"
              : base.shortHooks.quiz.title),
      },
      quotes: shuffleArray(base.shortHooks.quotes),
      weeklyTasks: shuffleArray(base.shortHooks.weeklyTasks),
    },
    sevenDayPath: {
      ...base.sevenDayPath,
      days: base.sevenDayPath.days.map((d, i) => ({
        ...d,
        bookTitle: pickBook(i % (pool.length || 1)).title,
        theme: options?.userPreference?.trim() || d.theme,
      })),
    },
  };
}

const FEED_MAP = new Map<string, DiscoverFeedSegment>(
  DISCOVER_FEEDS.map((feed) => [segmentKey(feed.gender, feed.ageGroup), feed])
);

export function segmentKey(gender: Gender, ageGroup: AgeGroup): string {
  const g = gender === "female" ? "female" : gender === "other" ? "other" : "male";
  return `${g}-${ageGroup}`;
}

export function getDiscoverFeed(gender: Gender, ageGroup: AgeGroup): DiscoverFeedSegment | null {
  const key = segmentKey(gender, ageGroup);
  const feed = FEED_MAP.get(key);
  if (feed) return applyDiscoverHeader(feed);
  // gender=other 暂复用 male 同年龄段内容
  if (gender === "other") {
    const fallback = FEED_MAP.get(`male-${ageGroup}`);
    return fallback ? applyDiscoverHeader(fallback) : null;
  }
  return null;
}

export function listDiscoverFeeds(): DiscoverFeedSegment[] {
  return DISCOVER_FEEDS;
}

export function buildBookPrompt(bookTitle: string, context?: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  if (context) {
    return `我想读《${title}》。${context} 能帮我总结推荐这本书吗？`;
  }
  return `我想读《${title}》，能帮我总结这本书吗？`;
}

export function buildQuizPrompt(bookTitle: string, quizTitle: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  const theme = quizTitle.replace(/^3\s*分钟测一测[：:]\s*/, "");
  return `我想读这个主题的书：${theme}`;
}

export function buildJingduPrompt(bookTitle: string, chapter?: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  if (chapter) {
    return `请帮我精读《${title}》的${chapter}。`;
  }
  return `请帮我精读《${title}》。`;
}
