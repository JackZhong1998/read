"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppLogo from "@/components/AppLogo";
import { useApp } from "@/context/AppContext";
import { AGE_GROUP_OPTIONS } from "@/lib/discover-data";
import { saveDiscoverPreference } from "@/lib/storage";
import type { AgeGroup, Gender } from "@/lib/types";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile, hydrated } = useApp();

  useEffect(() => {
    if (hydrated && profile) {
      router.replace("/discover");
    }
  }, [hydrated, profile, router]);

  const handleComplete = (gender: Gender, ageGroup: AgeGroup) => {
    const createdAt = Date.now();
    setProfile({ gender, ageGroup, createdAt });
    saveDiscoverPreference({
      gender,
      ageGroup,
      savedAt: createdAt,
    });
    router.push("/discover");
  };

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-cream">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-accent border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col bg-cream">
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12">
        <div className="mb-12 text-center animate-slide-up">
          <div className="mb-5 flex justify-center">
            <AppLogo size="lg" />
          </div>
          <h1 className="sr-only">速读 - AI 智能阅读</h1>
          <p className="mt-3 text-ink-muted">AI 帮你找到值得读的书，读懂每一本</p>
        </div>

        <OnboardingForm onComplete={handleComplete} />
      </div>

      <p className="pb-8 text-center text-xs text-ink-muted">
        选择你的基本信息，帮助我们更好地推荐
      </p>
    </div>
  );
}

function OnboardingForm({
  onComplete,
}: {
  onComplete: (gender: Gender, ageGroup: AgeGroup) => void;
}) {
  const [step, setStep] = useState<"gender" | "age">("gender");
  const [gender, setGender] = useState<Gender | null>(null);

  return (
    <div className="w-full max-w-sm animate-slide-up">
      {step === "gender" ? (
        <div>
          <h2 className="mb-6 text-center font-serif text-xl text-ink">你的性别</h2>
          <div className="flex flex-col gap-3">
            {GENDERS.map((g) => (
              <button
                key={g.value}
                onClick={() => {
                  setGender(g.value);
                  setStep("age");
                }}
                className="rounded-2xl border border-paper bg-white px-6 py-4 text-lg text-ink transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
              >
                {g.label}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div>
          <button
            onClick={() => setStep("gender")}
            className="mb-4 flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            返回
          </button>
          <h2 className="mb-6 text-center font-serif text-xl text-ink">你的年龄段</h2>
          <div className="flex max-h-[50dvh] flex-col gap-3 overflow-y-auto pr-1">
            {AGE_GROUP_OPTIONS.map((a) => (
              <button
                key={a.value}
                onClick={() => gender && onComplete(gender, a.value)}
                className="rounded-2xl border border-paper bg-white px-6 py-4 text-left transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
              >
                <span className="text-lg text-ink">{a.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
