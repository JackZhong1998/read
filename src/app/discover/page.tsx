"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import DiscoverChatOrb from "@/components/DiscoverChatOrb";
import DiscoverFeedView from "@/components/DiscoverFeedView";
import DiscoverItemCard from "@/components/DiscoverItemCard";
import PullToRefresh from "@/components/PullToRefresh";
import { useApp } from "@/context/AppContext";
import { AGE_GROUP_OPTIONS, getDiscoverItems, type DiscoverItem } from "@/lib/discover-data";
import type { DiscoverFeedSegment } from "@/lib/discover-feed-types";
import { buildBookPrompt, buildQuizPrompt, getDiscoverFeed, segmentKey, applyDiscoverHeader, DISCOVER_PAGE_HEADER, type DiscoverRefreshIntent } from "@/lib/discover-feed";
import {
  clearDiscoverFeedCache,
  getDiscoverFeedCache,
  getDiscoverPreference,
  getMessages,
  getReaderMemory,
  saveDiscoverFeedCache,
  saveDiscoverPreference,
  setPendingMessage,
} from "@/lib/storage";
import type { AgeGroup, DiscoverPreference, Gender, UserProfile } from "@/lib/types";

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male", label: "男生", emoji: "👨" },
  { value: "female", label: "女生", emoji: "👩" },
  { value: "other", label: "其他", emoji: "🧑" },
];

function toDiscoverGender(gender: Gender): Gender {
  return gender;
}

function profileToPreference(profile: { gender: Gender; ageGroup: AgeGroup; createdAt: number }): DiscoverPreference {
  return {
    gender: toDiscoverGender(profile.gender),
    ageGroup: profile.ageGroup,
    savedAt: profile.createdAt,
  };
}

function effectiveProfile(
  profile: UserProfile | null,
  pref: DiscoverPreference
): UserProfile {
  return (
    profile ?? {
      gender: pref.gender,
      ageGroup: pref.ageGroup,
      createdAt: pref.savedAt,
    }
  );
}

export default function DiscoverPage() {
  const router = useRouter();
  const { profile, setProfile, hydrated, readBooks } = useApp();
  const [savedPref, setSavedPref] = useState<DiscoverPreference | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);
  const [showSwitcher, setShowSwitcher] = useState(false);
  const [feed, setFeed] = useState<DiscoverFeedSegment | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!hydrated || prefsLoaded) return;
    const stored = getDiscoverPreference();
    if (stored) {
      setSavedPref(stored);
      setPrefsLoaded(true);
      return;
    }
    if (profile) {
      const migrated = profileToPreference(profile);
      saveDiscoverPreference(migrated);
      setSavedPref(migrated);
    }
    setPrefsLoaded(true);
  }, [hydrated, profile, prefsLoaded]);

  const staticFeed = useMemo(
    () => (savedPref ? getDiscoverFeed(savedPref.gender, savedPref.ageGroup) : null),
    [savedPref]
  );

  useEffect(() => {
    if (!savedPref) return;
    const key = segmentKey(savedPref.gender, savedPref.ageGroup);
    const cached = getDiscoverFeedCache(key);
    if (cached) {
      setFeed(applyDiscoverHeader(cached.feed));
      return;
    }
    setFeed(staticFeed);
  }, [savedPref, staticFeed]);

  useEffect(() => {
    if (!hydrated) return;
    void fetch("/api/discover-feed").catch(() => {});
  }, [hydrated]);

  const legacyItems = useMemo(
    () => (savedPref && !feed ? getDiscoverItems(savedPref.gender, savedPref.ageGroup) : []),
    [savedPref, feed]
  );

  const refreshFeed = useCallback(
    async (intent: DiscoverRefreshIntent = "default", userPreference?: string) => {
      if (!savedPref || refreshing) return;
      const base = getDiscoverFeed(savedPref.gender, savedPref.ageGroup);
      if (!base) return;

      setRefreshing(true);
      try {
        const res = await fetch("/api/discover-feed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile: effectiveProfile(profile, savedPref),
            readBooks,
            readerMemory: getReaderMemory(),
            recentMessages: getMessages(),
            currentFeed: feed ?? undefined,
            refreshIntent: intent,
            userPreference,
          }),
        });

        if (!res.ok) {
          console.error("Discover feed refresh failed:", res.status);
          return;
        }

        const data = (await res.json()) as { feed?: DiscoverFeedSegment };
        if (data.feed) {
          const normalized = applyDiscoverHeader(data.feed);
          setFeed(normalized);
          saveDiscoverFeedCache({
            segmentKey: segmentKey(savedPref.gender, savedPref.ageGroup),
            feed: normalized,
            updatedAt: Date.now(),
          });
        }
      } catch (error) {
        console.error("Discover feed refresh error:", error);
      } finally {
        setRefreshing(false);
      }
    },
    [savedPref, refreshing, profile, readBooks, feed]
  );

  const handleSetupComplete = (gender: Gender, ageGroup: AgeGroup) => {
    const pref: DiscoverPreference = { gender: toDiscoverGender(gender), ageGroup, savedAt: Date.now() };
    saveDiscoverPreference(pref);
    clearDiscoverFeedCache();
    setSavedPref(pref);
    setShowSwitcher(false);
    if (!profile) {
      setProfile({ gender, ageGroup, createdAt: pref.savedAt });
    }
  };

  const handleStartBook = (title: string, context?: string) => {
    if (!profile) {
      router.push("/");
      return;
    }
    setPendingMessage(buildBookPrompt(title, context));
    router.push("/chat");
  };

  const handleStartQuiz = (bookTitle: string, quizTitle: string) => {
    if (!profile) {
      router.push("/");
      return;
    }
    setPendingMessage(buildQuizPrompt(bookTitle, quizTitle));
    router.push("/chat");
  };

  const handleStartChat = (item: DiscoverItem) => {
    if (!profile) {
      router.push("/");
      return;
    }
    setPendingMessage(item.prompt);
    router.push("/chat");
  };

  if (!hydrated || !prefsLoaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  if (!savedPref || showSwitcher) {
    return (
      <div className="flex min-h-dvh flex-col bg-cream">
        <AppNav subtitle="困惑共鸣 → 书籍解忧" />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
          <section className="mb-8 text-center animate-fade-in">
            <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
              {showSwitcher ? "切换人群" : "发现你的解忧书单"}
            </h1>
            <p className="mt-2 text-sm text-ink-muted">选择性别与年龄段，为你匹配专属推荐</p>
          </section>
          <DiscoverSetup
            onComplete={handleSetupComplete}
            onCancel={showSwitcher ? () => setShowSwitcher(false) : undefined}
          />
        </main>
      </div>
    );
  }

  return (
    <div className="flex h-dvh flex-col bg-cream">
      <AppNav subtitle="困惑共鸣 → 书籍解忧" />

      <PullToRefresh onRefresh={() => refreshFeed()} refreshing={refreshing}>
        <main className="mx-auto w-full max-w-2xl px-4 py-6 sm:px-6">
          {feed ? (
            <DiscoverFeedView
              feed={feed}
              onStartBook={handleStartBook}
              onStartQuiz={handleStartQuiz}
              onSwitchSegment={() => setShowSwitcher(true)}
              onRefresh={(intent, userPreference) => void refreshFeed(intent, userPreference)}
              refreshing={refreshing}
            />
          ) : (
            <>
              <section className="mb-8 animate-fade-in">
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">
                    {DISCOVER_PAGE_HEADER.title}
                  </h1>
                  <button
                    type="button"
                    onClick={() => void refreshFeed()}
                    disabled={refreshing}
                    aria-label="刷新推荐"
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-paper bg-white text-ink-muted hover:border-accent/40 hover:text-accent disabled:opacity-50"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      className={refreshing ? "animate-spin" : ""}
                    >
                      <path d="M21 12a9 9 0 1 1-3-6.7M21 3v6h-6" />
                    </svg>
                  </button>
                </div>
                <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
                  {DISCOVER_PAGE_HEADER.subtitle}
                </p>
              </section>

              <section>
                <p className="mb-4 text-xs text-ink-muted">10 个困惑 · 10 本解忧书</p>
                <div className="flex flex-col gap-4">
                  {legacyItems.map((item, index) => (
                    <DiscoverItemCard
                      key={item.id}
                      item={item}
                      index={index}
                      onStartChat={handleStartChat}
                    />
                  ))}
                </div>
              </section>

              <div className="mt-8 flex justify-center border-t border-paper pt-6">
                <button
                  type="button"
                  onClick={() => setShowSwitcher(true)}
                  className="rounded-full border border-paper bg-white px-4 py-2 text-xs text-ink-muted hover:border-accent/40 hover:text-accent"
                >
                  切换人群
                </button>
              </div>
            </>
          )}

          {!profile && (
            <div className="mt-10 rounded-2xl border border-dashed border-accent/30 bg-accent/5 p-5 text-center">
              <p className="text-sm text-ink-light">完成简单设置后，可一键跳转对话让 AI 为你荐书</p>
              <button
                onClick={() => router.push("/")}
                className="mt-3 rounded-full bg-accent px-5 py-2 text-sm text-white hover:bg-accent-dark"
              >
                开始设置
              </button>
            </div>
          )}
        </main>
      </PullToRefresh>

      <DiscoverChatOrb
        hasProfile={Boolean(profile)}
        onNeedProfile={() => router.push("/")}
      />
    </div>
  );
}

function DiscoverSetup({
  onComplete,
  onCancel,
}: {
  onComplete: (gender: Gender, ageGroup: AgeGroup) => void;
  onCancel?: () => void;
}) {
  const [step, setStep] = useState<"gender" | "age">("gender");
  const [gender, setGender] = useState<Gender | null>(null);

  if (step === "gender") {
    return (
      <div className="animate-slide-up">
        {onCancel && (
          <button
            onClick={onCancel}
            className="mb-4 flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
        )}
        <h2 className="mb-4 text-center font-serif text-lg text-ink">你的性别</h2>
        <div className="flex gap-3">
          {GENDER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                setGender(option.value);
                setStep("age");
              }}
              className="flex flex-1 items-center justify-center gap-2 rounded-2xl border border-paper bg-white px-4 py-4 text-sm font-medium text-ink transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
            >
              <span>{option.emoji}</span>
              {option.label}
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-slide-up">
      <button
        onClick={() => setStep("gender")}
        className="mb-4 flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M19 12H5M12 19l-7-7 7-7" />
        </svg>
        返回
      </button>
      <h2 className="mb-4 text-center font-serif text-lg text-ink">你的年龄段</h2>
      <div className="flex max-h-[50dvh] flex-col gap-2 overflow-y-auto pr-1">
        {AGE_GROUP_OPTIONS.map((option) => (
          <button
            key={option.value}
            onClick={() => gender && onComplete(gender, option.value)}
            className="rounded-2xl border border-paper bg-white px-5 py-3.5 text-left transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
          >
            <span className="text-base text-ink">{option.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
