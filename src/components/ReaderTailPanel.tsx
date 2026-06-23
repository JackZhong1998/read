"use client";

import MarkdownContent from "./MarkdownContent";
import ChatInput from "./ChatInput";
import SuggestionChips from "./SuggestionChips";

interface ReaderTailPanelProps {
  dialogueMarkdown: string;
  suggestions: string[];
  suggestionsLoading?: boolean;
  chatLoading?: boolean;
  onSelectSuggestion: (text: string) => void;
  onSend: (text: string) => void;
  onTapBlank?: () => void;
}

/** 内容章节之后的固定对话页：最后一句话 + Sug + 输入框 */
export default function ReaderTailPanel({
  dialogueMarkdown,
  suggestions,
  suggestionsLoading,
  chatLoading,
  onSelectSuggestion,
  onSend,
  onTapBlank,
}: ReaderTailPanelProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col" onClick={onTapBlank}>
      {dialogueMarkdown ? (
        <div className="mb-4 min-h-0 shrink overflow-y-auto overscroll-contain">
          <MarkdownContent content={dialogueMarkdown} className="ebook-prose ebook-tail-dialogue" />
        </div>
      ) : null}

      {(suggestionsLoading || suggestions.length > 0) && (
        <div className="mb-3 shrink-0">
          <p className="mb-2 text-xs tracking-wide text-ink-muted">接下来你可以</p>
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

      <div className="mt-auto shrink-0">
        <ChatInput
          onSend={onSend}
          disabled={chatLoading}
          placeholder="继续对话..."
          padded={false}
          bare
        />
      </div>
    </div>
  );
}
