"use client";

import { AI_NAME } from "@/lib/content-utils";
import ChatInput from "./ChatInput";
import SuggestionChips from "./SuggestionChips";

interface ReaderTailPanelProps {
  lastChat: string;
  suggestions: string[];
  suggestionsLoading?: boolean;
  chatLoading?: boolean;
  onSelectSuggestion: (text: string) => void;
  onSend: (text: string) => void;
  onGoPrev?: () => void;
  canGoPrev?: boolean;
}

/** 内容章节之后的固定对话页：读书先生最后一句话 + Sug + 输入框 */
export default function ReaderTailPanel({
  lastChat,
  suggestions,
  suggestionsLoading,
  chatLoading,
  onSelectSuggestion,
  onSend,
  onGoPrev,
  canGoPrev,
}: ReaderTailPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col bg-[#f3efe6]">
      {canGoPrev && onGoPrev && (
        <button
          type="button"
          onClick={onGoPrev}
          className="mb-3 shrink-0 self-start text-xs text-[#8a7f72] hover:text-[#3d362e]"
        >
          ← 上一页
        </button>
      )}

      {lastChat ? (
        <div className="mb-4 shrink-0">
          <div className="flex justify-start">
            <div className="max-w-[92%] rounded-2xl rounded-bl-md border border-[#e8e0d4] bg-white px-4 py-3 shadow-sm">
              <p className="mb-1 text-xs font-medium text-[#c45c26]">{AI_NAME}</p>
              <p className="text-sm leading-relaxed text-[#2a2520]">{lastChat}</p>
            </div>
          </div>
        </div>
      ) : null}

      {(suggestionsLoading || suggestions.length > 0) && (
        <div className="mb-3 shrink-0">
          <p className="mb-2 text-xs tracking-wide text-[#8a7f72]">接下来你可以</p>
          <div className="max-h-[min(42vh,320px)] overflow-y-auto overscroll-contain pr-1">
            <SuggestionChips
              suggestions={suggestions}
              onSelect={onSelectSuggestion}
              loading={suggestionsLoading}
              variant="reader"
            />
          </div>
        </div>
      )}

      <div className="mt-auto shrink-0 border-t border-[#ddd4c8] bg-[#faf7f2]/80 pt-2">
        <ChatInput onSend={onSend} disabled={chatLoading} placeholder="继续对话..." />
      </div>
    </div>
  );
}
