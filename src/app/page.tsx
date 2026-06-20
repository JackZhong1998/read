"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import type { AgeGroup, Gender } from "@/lib/types";

const GENDERS: { value: Gender; label: string }[] = [
  { value: "male", label: "男" },
  { value: "female", label: "女" },
  { value: "other", label: "其他" },
];

const AGE_GROUPS: { value: AgeGroup; label: string }[] = [
  { value: "18-25", label: "18-25 岁" },
  { value: "26-35", label: "26-35 岁" },
  { value: "36-45", label: "36-45 岁" },
  { value: "46-55", label: "46-55 岁" },
  { value: "55+", label: "55 岁以上" },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { profile, setProfile, hydrated } = useApp();

  useEffect(() => {
    if (hydrated && profile) {
      router.replace("/chat");
    }
  }, [hydrated, profile, router]);

  const handleComplete = (gender: Gender, ageGroup: AgeGroup) => {
    setProfile({ gender, ageGroup, createdAt: Date.now() });
    router.push("/chat");
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
          <div className="mb-4 text-5xl">📖</div>
          <h1 className="font-serif text-3xl font-bold text-ink md:text-4xl">速读</h1>
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
          <div className="flex flex-col gap-3">
            {AGE_GROUPS.map((a) => (
              <button
                key={a.value}
                onClick={() => gender && onComplete(gender, a.value)}
                className="rounded-2xl border border-paper bg-white px-6 py-4 text-lg text-ink transition-all hover:border-accent hover:shadow-md active:scale-[0.98]"
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
