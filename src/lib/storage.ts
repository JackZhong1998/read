import { normalizeAgeGroup } from "./discover-data";
import type {
  BookCache,
  ChatMessage,
  DiscoverPreference,
  ReadBook,
  ReaderMemory,
  ReadingNote,
  UserProfile,
} from "./types";

const KEYS = {
  profile: "speedread_profile",
  messages: "speedread_messages",
  readBooks: "speedread_read_books",
  bookCache: "speedread_book_cache",
  readMode: "speedread_read_mode",
  suggestions: "speedread_suggestions",
  readerMemory: "speedread_reader_memory",
  pendingMessage: "speedread_pending_message",
  discoverPreference: "speedread_discover_preference",
  discoverFeedCache: "speedread_discover_feed_cache",
  readingNotes: "speedread_reading_notes",
} as const;

function safeGet<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function safeSet(key: string, value: unknown): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // quota exceeded etc.
  }
}

export function getProfile(): UserProfile | null {
  const raw = safeGet<UserProfile & { ageGroup: string }>(KEYS.profile);
  if (!raw) return null;
  const ageGroup = normalizeAgeGroup(raw.ageGroup);
  if (!ageGroup) return null;
  if (ageGroup !== raw.ageGroup) {
    const migrated = { ...raw, ageGroup };
    saveProfile(migrated);
    return migrated;
  }
  return raw as UserProfile;
}

export function saveProfile(profile: UserProfile): void {
  safeSet(KEYS.profile, profile);
}

export function getDiscoverPreference(): DiscoverPreference | null {
  const raw = safeGet<DiscoverPreference & { ageGroup: string }>(KEYS.discoverPreference);
  if (!raw) return null;
  const ageGroup = normalizeAgeGroup(raw.ageGroup);
  if (!ageGroup) return null;
  if (ageGroup !== raw.ageGroup) {
    const migrated = { ...raw, ageGroup };
    saveDiscoverPreference(migrated);
    return migrated;
  }
  return raw as DiscoverPreference;
}

export function saveDiscoverPreference(pref: DiscoverPreference): void {
  safeSet(KEYS.discoverPreference, pref);
}

export interface DiscoverFeedCache {
  segmentKey: string;
  feed: import("./discover-feed-types").DiscoverFeedSegment;
  updatedAt: number;
}

export function getDiscoverFeedCache(segmentKey: string): DiscoverFeedCache | null {
  const raw = safeGet<DiscoverFeedCache>(KEYS.discoverFeedCache);
  if (!raw || raw.segmentKey !== segmentKey) return null;
  return raw;
}

export function saveDiscoverFeedCache(cache: DiscoverFeedCache): void {
  safeSet(KEYS.discoverFeedCache, cache);
}

export function clearDiscoverFeedCache(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEYS.discoverFeedCache);
}

export function getMessages(): ChatMessage[] {
  return safeGet<ChatMessage[]>(KEYS.messages) ?? [];
}

export function saveMessages(messages: ChatMessage[]): void {
  safeSet(KEYS.messages, messages);
}

export function getReadBooks(): ReadBook[] {
  const raw = safeGet<ReadBook[]>(KEYS.readBooks) ?? [];
  return raw.map((b) => ({
    ...b,
    readType: b.readType ?? "jingdu",
    content: b.content ?? b.jingduContent ?? b.shenduContent ?? "",
  }));
}

export function saveReadBooks(books: ReadBook[]): void {
  safeSet(KEYS.readBooks, books);
}

export function addReadBook(book: ReadBook): void {
  const books = getReadBooks();
  const existing = books.findIndex(
    (b) => b.title === book.title && b.author === book.author && b.readType === book.readType
  );
  if (existing >= 0) {
    books[existing] = { ...books[existing], ...book };
  } else {
    books.unshift(book);
  }
  saveReadBooks(books);
}

export function upsertReadBookFromMessage(
  book: { title: string; author: string; intro?: string },
  readType: "jingdu" | "shendu",
  content: string,
  essence?: string
): ReadBook {
  const entry: ReadBook = {
    id: `${book.title}::${book.author}::${readType}`,
    title: book.title,
    author: book.author,
    intro: book.intro,
    readType,
    content,
    essence,
    readAt: Date.now(),
  };
  addReadBook(entry);
  return entry;
}

export function markBookCompleted(id: string): ReadBook | null {
  const books = getReadBooks();
  const idx = books.findIndex((b) => b.id === id);
  if (idx < 0) return null;
  books[idx] = { ...books[idx], completed: true };
  saveReadBooks(books);
  return books[idx];
}

export function getBookCache(): BookCache {
  return safeGet<BookCache>(KEYS.bookCache) ?? {};
}

export function saveBookCache(cache: BookCache): void {
  safeSet(KEYS.bookCache, cache);
}

export function cacheBookContent(
  bookKey: string,
  book: { title: string; author: string; intro?: string },
  type: "rec" | "jingdu" | "shendu",
  content: string
): void {
  const cache = getBookCache();
  cache[bookKey] = {
    ...cache[bookKey],
    book,
    [type]: content,
    updatedAt: Date.now(),
  };
  saveBookCache(cache);
}

export function getBookKey(title: string, author: string): string {
  return `${title}::${author}`;
}

export function getReadMode(): "page" | "scroll" {
  return safeGet<"page" | "scroll">(KEYS.readMode) ?? "scroll";
}

export function saveReadMode(mode: "page" | "scroll"): void {
  safeSet(KEYS.readMode, mode);
}

export interface SuggestionsCache {
  suggestions: string[];
  updatedAt: number;
  sourceType?: string;
}

export function getSuggestions(): string[] {
  const raw = safeGet<string[] | SuggestionsCache>(KEYS.suggestions);
  if (!raw) return [];
  if (Array.isArray(raw)) return raw;
  return raw.suggestions ?? [];
}

export function getSuggestionsCache(): SuggestionsCache | null {
  const raw = safeGet<string[] | SuggestionsCache>(KEYS.suggestions);
  if (!raw) return null;
  if (Array.isArray(raw)) {
    return raw.length ? { suggestions: raw, updatedAt: 0 } : null;
  }
  return raw.suggestions.length ? raw : null;
}

export function saveSuggestions(suggestions: string[], sourceType?: string): void {
  if (!suggestions.length) return;
  safeSet(KEYS.suggestions, {
    suggestions,
    updatedAt: Date.now(),
    sourceType,
  } satisfies SuggestionsCache);
}

export function getReaderMemory(): ReaderMemory | null {
  const raw = safeGet<ReaderMemory>(KEYS.readerMemory);
  if (!raw) return null;
  return {
    statedGoals: raw.statedGoals ?? [],
    themes: raw.themes ?? [],
    conversationNotes: raw.conversationNotes ?? [],
    conversationSummary: raw.conversationSummary ?? "",
    summarizedMessageCount: raw.summarizedMessageCount ?? 0,
    bookInsights: raw.bookInsights ?? {},
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

export function saveReaderMemory(memory: ReaderMemory): void {
  safeSet(KEYS.readerMemory, memory);
}

export function setPendingMessage(message: string): void {
  safeSet(KEYS.pendingMessage, message);
}

export function consumePendingMessage(): string | null {
  const message = safeGet<string>(KEYS.pendingMessage);
  if (message && typeof window !== "undefined") {
    localStorage.removeItem(KEYS.pendingMessage);
  }
  return message;
}

export function getReadingNotes(): ReadingNote[] {
  return safeGet<ReadingNote[]>(KEYS.readingNotes) ?? [];
}

export function saveReadingNotes(notes: ReadingNote[]): void {
  safeSet(KEYS.readingNotes, notes);
}

export function addReadingNote(note: ReadingNote): void {
  const notes = getReadingNotes();
  notes.unshift(note);
  saveReadingNotes(notes);
}

export function updateReadingNote(id: string, patch: Partial<Pick<ReadingNote, "comment" | "updatedAt">>): ReadingNote | null {
  const notes = getReadingNotes();
  const idx = notes.findIndex((n) => n.id === id);
  if (idx < 0) return null;
  notes[idx] = { ...notes[idx], ...patch, updatedAt: patch.updatedAt ?? Date.now() };
  saveReadingNotes(notes);
  return notes[idx];
}

export function deleteReadingNote(id: string): void {
  saveReadingNotes(getReadingNotes().filter((n) => n.id !== id));
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
