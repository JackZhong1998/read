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
  const hasSuggestions = suggestionsLoading || suggestions.length > 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col" onClick={onTapBlank}>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain pb-2">
        {dialogueMarkdown ? (
          <MarkdownContent content={dialogueMarkdown} className="ebook-prose ebook-tail-dialogue" />
        ) : null}

        {hasSuggestions && (
          <div className={dialogueMarkdown ? "mt-5" : undefined}>
            <p className="mb-2.5 text-sm tracking-wide text-ink-muted">接下来你可以</p>
            <SuggestionChips
              suggestions={suggestions}
              onSelect={onSelectSuggestion}
              loading={suggestionsLoading}
              variant="reader"
            />
          </div>
        )}
      </div>

      <div className="shrink-0">
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
