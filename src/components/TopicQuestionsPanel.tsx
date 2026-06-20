"use client";

import type { TopicQuestion } from "@/lib/questions";

interface TopicQuestionsPanelProps {
  questions: TopicQuestion[];
  onSelect: (question: TopicQuestion) => void;
  disabled?: boolean;
  showCenter?: boolean;
  showDrawer?: boolean;
  onCloseDrawer?: () => void;
}

function QuestionItem({
  question,
  onSelect,
  disabled,
  variant = "center",
}: {
  question: TopicQuestion;
  onSelect: (q: TopicQuestion) => void;
  disabled?: boolean;
  variant?: "center" | "list";
}) {
  if (variant === "list") {
    return (
      <button
        onClick={() => onSelect(question)}
        disabled={disabled}
        className="w-full rounded-xl border border-paper bg-white px-4 py-3 text-left transition-all hover:border-accent/40 hover:bg-accent/5 disabled:opacity-50 active:scale-[0.99]"
      >
        <p className="text-sm leading-relaxed text-ink">{question.prompt}</p>
      </button>
    );
  }

  return (
    <button
      onClick={() => onSelect(question)}
      disabled={disabled}
      className="w-full rounded-2xl border border-paper/80 bg-white/90 px-5 py-4 text-left shadow-sm transition-all hover:border-accent/30 hover:shadow-md disabled:opacity-50 active:scale-[0.99]"
    >
      <p className="font-serif text-[15px] leading-relaxed text-ink md:text-base">{question.prompt}</p>
    </button>
  );
}

export function TopicQuestionsCenter({
  questions,
  onSelect,
  disabled,
}: Omit<TopicQuestionsPanelProps, "showCenter" | "showDrawer" | "onCloseDrawer">) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-5 py-8">
      <div className="mb-8 text-center">
        <div className="mb-3 text-4xl">🌿</div>
        <p className="font-serif text-lg text-ink-light">从一个问题开始</p>
        <p className="mt-1 text-sm text-ink-muted">我会帮你找到值得读的书</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-3">
        {questions.map((q) => (
          <QuestionItem key={q.id} question={q} onSelect={onSelect} disabled={disabled} variant="center" />
        ))}
      </div>
    </div>
  );
}

export function TopicQuestionsDrawer({
  questions,
  onSelect,
  disabled,
  onClose,
}: {
  questions: TopicQuestion[];
  onSelect: (q: TopicQuestion) => void;
  disabled?: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-ink/30 backdrop-blur-sm md:items-center" onClick={onClose}>
      <div
        className="max-h-[80dvh] w-full max-w-lg overflow-y-auto rounded-t-2xl bg-cream p-5 shadow-xl md:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-serif text-lg font-semibold text-ink">推荐问题</h2>
          <button onClick={onClose} className="rounded-full p-2 text-ink-muted hover:bg-paper">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>
        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <QuestionItem
              key={q.id}
              question={q}
              onSelect={(question) => {
                onSelect(question);
                onClose();
              }}
              disabled={disabled}
              variant="list"
            />
          ))}
        </div>
      </div>
    </div>
  );
}
