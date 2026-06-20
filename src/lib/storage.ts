import type { BookCache, ChatMessage, ReadBook, UserProfile } from "./types";

const KEYS = {
  profile: "speedread_profile",
  messages: "speedread_messages",
  readBooks: "speedread_read_books",
  bookCache: "speedread_book_cache",
  readMode: "speedread_read_mode",
  suggestions: "speedread_suggestions",
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
  return safeGet<UserProfile>(KEYS.profile);
}

export function saveProfile(profile: UserProfile): void {
  safeSet(KEYS.profile, profile);
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
  content: string
): ReadBook {
  const entry: ReadBook = {
    id: `${book.title}::${book.author}::${readType}`,
    title: book.title,
    author: book.author,
    intro: book.intro,
    readType,
    content,
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

export function getSuggestions(): string[] {
  return safeGet<string[]>(KEYS.suggestions) ?? [];
}

export function saveSuggestions(suggestions: string[]): void {
  safeSet(KEYS.suggestions, suggestions);
}

export function clearAllData(): void {
  if (typeof window === "undefined") return;
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k));
}
