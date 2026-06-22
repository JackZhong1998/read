"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import AppNav from "@/components/AppNav";
import DiscoverItemCard from "@/components/DiscoverItemCard";
import { useApp } from "@/context/AppContext";
import { AGE_GROUP_OPTIONS, getDiscoverItems, type DiscoverItem } from "@/lib/discover-data";
import { getDiscoverPreference, saveDiscoverPreference, setPendingMessage } from "@/lib/storage";
import type { AgeGroup, DiscoverPreference, Gender } from "@/lib/types";

const GENDER_OPTIONS: { value: Gender; label: string; emoji: string }[] = [
  { value: "male", label: "男生", emoji: "👨" },
  { value: "female", label: "女生", emoji: "👩" },
];

function toDiscoverGender(gender: Gender): Gender {
  return gender === "female" ? "female" : "male";
}

function profileToPreference(profile: { gender: Gender; ageGroup: AgeGroup; createdAt: number }): DiscoverPreference {
  return {
    gender: toDiscoverGender(profile.gender),
    ageGroup: profile.ageGroup,
    savedAt: profile.createdAt,
  };
}

export default function DiscoverPage() {
  const router = useRouter();
  const { profile, setProfile, hydrated } = useApp();
  const [savedPref, setSavedPref] = useState<DiscoverPreference | null>(null);
  const [prefsLoaded, setPrefsLoaded] = useState(false);

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

  const items = useMemo(
    () => (savedPref ? getDiscoverItems(savedPref.gender, savedPref.ageGroup) : []),
    [savedPref]
  );

  const handleSetupComplete = (gender: Gender, ageGroup: AgeGroup) => {
    const pref: DiscoverPreference = { gender: toDiscoverGender(gender), ageGroup, savedAt: Date.now() };
    saveDiscoverPreference(pref);
    setSavedPref(pref);
    if (!profile) {
      setProfile({ gender, ageGroup, createdAt: pref.savedAt });
    }
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

  if (!savedPref) {
    return (
      <div className="flex min-h-dvh flex-col bg-cream">
        <AppNav subtitle="困惑共鸣 → 书籍解忧" />
        <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center px-4 py-8 sm:px-6">
          <section className="mb-8 text-center animate-fade-in">
            <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">发现你的解忧书单</h1>
            <p className="mt-2 text-sm text-ink-muted">选择性别与年龄段，为你匹配专属推荐</p>
          </section>
          <DiscoverSetup onComplete={handleSetupComplete} />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <AppNav subtitle="困惑共鸣 → 书籍解忧" />

      <main className="mx-auto w-full max-w-2xl flex-1 px-4 py-6 sm:px-6">
        <section className="mb-8 animate-fade-in">
          <h1 className="font-serif text-2xl font-bold text-ink sm:text-3xl">发现你的解忧书单</h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-ink-muted">
            每个困惑都配有一本解忧之书——问题与推荐直接呈现，一键跳转 AI 对话。
          </p>
        </section>

        <section>
          <p className="mb-4 text-xs text-ink-muted">10 个困惑 · 10 本解忧书</p>
          <div className="flex flex-col gap-4">
            {items.map((item, index) => (
              <DiscoverItemCard
                key={item.id}
                item={item}
                index={index}
                onStartChat={handleStartChat}
              />
            ))}
          </div>
        </section>

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
    </div>
  );
}

function DiscoverSetup({ onComplete }: { onComplete: (gender: Gender, ageGroup: AgeGroup) => void }) {
  const [step, setStep] = useState<"gender" | "age">("gender");
  const [gender, setGender] = useState<Gender | null>(null);

  if (step === "gender") {
    return (
      <div className="animate-slide-up">
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
            <span className="ml-2 text-sm text-ink-muted">{option.range}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
