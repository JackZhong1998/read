"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { ChatMessage, ReadBook, UserProfile } from "@/lib/types";
import { sanitizeChatForDisplay } from "@/lib/content-utils";
import {
  getMessages,
  getProfile,
  getReadBooks,
  saveMessages,
  saveProfile,
  saveReadBooks,
  addReadBook as storageAddReadBook,
} from "@/lib/storage";

interface AppContextValue {
  profile: UserProfile | null;
  setProfile: (p: UserProfile) => void;
  messages: ChatMessage[];
  setMessages: (m: ChatMessage[]) => void;
  addMessage: (m: ChatMessage) => void;
  readBooks: ReadBook[];
  setReadBooks: (b: ReadBook[]) => void;
  markBookAsRead: (book: ReadBook) => void;
  hydrated: boolean;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [profile, setProfileState] = useState<UserProfile | null>(null);
  const [messages, setMessagesState] = useState<ChatMessage[]>([]);
  const [readBooks, setReadBooksState] = useState<ReadBook[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfileState(getProfile());
    setMessagesState(
      getMessages().filter((m) => {
        if (m.role === "assistant" && m.type === "chat") {
          return Boolean(sanitizeChatForDisplay(m.content));
        }
        return true;
      })
    );
    setReadBooksState(getReadBooks());
    setHydrated(true);
  }, []);

  const setProfile = useCallback((p: UserProfile) => {
    setProfileState(p);
    saveProfile(p);
  }, []);

  const setMessages = useCallback((m: ChatMessage[]) => {
    setMessagesState(m);
    saveMessages(m);
  }, []);

  const addMessage = useCallback((m: ChatMessage) => {
    setMessagesState((prev) => {
      const next = [...prev, m];
      saveMessages(next);
      return next;
    });
  }, []);

  const setReadBooks = useCallback((b: ReadBook[]) => {
    setReadBooksState(b);
    saveReadBooks(b);
  }, []);

  const markBookAsRead = useCallback((book: ReadBook) => {
    storageAddReadBook(book);
    setReadBooksState(getReadBooks());
  }, []);

  return (
    <AppContext.Provider
      value={{
        profile,
        setProfile,
        messages,
        setMessages,
        addMessage,
        readBooks,
        setReadBooks,
        markBookAsRead,
        hydrated,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
