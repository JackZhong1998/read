import type { AgeGroup, Gender } from "./types";
import type { DiscoverFeedSegment } from "./discover-feed-types";
import { DISCOVER_FEEDS } from "@/data/discover";

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
  if (feed) return feed;
  // gender=other 暂复用 male 同年龄段内容
  if (gender === "other") {
    return FEED_MAP.get(`male-${ageGroup}`) ?? null;
  }
  return null;
}

export function listDiscoverFeeds(): DiscoverFeedSegment[] {
  return DISCOVER_FEEDS;
}

export function buildBookPrompt(bookTitle: string, context?: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  if (context) {
    return `我想读《${title}》。${context} 能帮我推荐这本书并开始精读吗？`;
  }
  return `我想读《${title}》，能帮我推荐这本书并开始精读吗？`;
}

export function buildQuizPrompt(bookTitle: string, quizTitle: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  const theme = quizTitle.replace(/^3\s*分钟测一测[：:]\s*/, "");
  return `我想读《${title}》，帮我做个 3 分钟小测验：${theme}，看看我在书里更像哪个角色？`;
}

export function buildJingduPrompt(bookTitle: string, chapter?: string): string {
  const title = bookTitle.replace(/[《》]/g, "");
  if (chapter) {
    return `请帮我精读《${title}》的${chapter}。`;
  }
  return `请帮我精读《${title}》。`;
}
