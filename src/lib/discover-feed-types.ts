import type { AgeGroup, Gender } from "./types";

export type BookBadge = "必读" | "Top" | "畅销" | "经典";

export interface DiscoverBookRef {
  title: string;
  author?: string;
  badge?: BookBadge | string;
  hook?: string;
  /** 豆瓣评分，运营背书用 */
  doubanRating?: number;
  /** Goodreads 均分 */
  goodreadsRating?: number;
}

export interface DiscoverFeedSegment {
  gender: Gender;
  ageGroup: AgeGroup;
  header: {
    title: string;
    subtitle: string;
  };
  oneTapStart: {
    primary: {
      book: DiscoverBookRef;
      badges: string[];
      hook: string;
      readMinutes: number;
      suitableFor: string;
      difficulty: 1 | 2 | 3;
      readScene: string;
    };
    secondary: DiscoverBookRef[];
  };
  problemClusters: {
    id: string;
    title: string;
    books: DiscoverBookRef[];
    ctaLabel: string;
  }[];
  zones: {
    mustRead: { copy: string; books: DiscoverBookRef[] };
    top: { copy: string; books: DiscoverBookRef[] };
    bestseller: { copy: string; books: DiscoverBookRef[] };
    classic: { copy: string; books: DiscoverBookRef[] };
  };
  shortHooks: {
    quiz: {
      title: string;
      options: { id: string; label: string; resultBook: string }[];
    };
    quotes: {
      quote_text: string;
      quote_source_chapter: string;
      quote_theme: string;
      bookTitle: string;
    }[];
    weeklyTasks: {
      rank: number;
      bookTitle: string;
      chapter: string;
      title: string;
    }[];
  };
  sevenDayPath: {
    days: { day: number; bookTitle: string; theme: string }[];
    ctaLabel: string;
  };
  footer: {
    refreshLabel: string;
    easyFilter: string;
    hardFilter: string;
  };
}
