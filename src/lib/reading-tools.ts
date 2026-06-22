import "server-only";

import {
  extractStreamingReadingDisplay,
  normalizeReadingContent,
} from "@/lib/content-utils";
import { callMoonshotStream, type ChatMessageParam } from "@/lib/moonshot";
import { fillPrompt, JINGDU_SYSTEM_PROMPT, RECOMMEND_CONTENT_SYSTEM_PROMPT, SHENDU_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ReadBook, UserProfile } from "@/lib/types";

async function generateReadingContent(
  systemPrompt: string,
  userContent: string,
  maxTokens: number,
  onDisplayDelta?: (delta: string) => void
): Promise<string> {
  const messages: ChatMessageParam[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userContent },
  ];

  let accumulated = "";
  let prevDisplay = "";

  const response = await callMoonshotStream(messages, {
    disableThinking: true,
    maxTokens,
    onContentDelta: (delta) => {
      accumulated += delta;
      const display = extractStreamingReadingDisplay(accumulated);
      const displayDelta = display.slice(prevDisplay.length);
      if (displayDelta) {
        prevDisplay = display;
        onDisplayDelta?.(displayDelta);
      }
    },
  });

  const raw = response.content || accumulated;
  return normalizeReadingContent(raw);
}

export async function generateTuijian(
  profile: UserProfile,
  direction: string,
  readBooks: ReadBook[] = [],
  onDisplayDelta?: (delta: string) => void
): Promise<string> {
  const systemPrompt = fillPrompt(RECOMMEND_CONTENT_SYSTEM_PROMPT, profile, readBooks);
  const userContent = `请根据以下方向为用户推荐书籍：

推荐方向：${direction}`;

  return generateReadingContent(systemPrompt, userContent, 4096, onDisplayDelta);
}

export async function generateJingdu(
  profile: UserProfile,
  book: { title: string; author: string; intro?: string },
  readBooks: ReadBook[] = [],
  onDisplayDelta?: (delta: string) => void
): Promise<string> {
  const systemPrompt = fillPrompt(JINGDU_SYSTEM_PROMPT, profile, readBooks);
  const userContent = `请为以下书籍生成精读内容：

书名：${book.title}
作者：${book.author}
${book.intro ? `简介：${book.intro}` : ""}`;

  return generateReadingContent(systemPrompt, userContent, 4096, onDisplayDelta);
}

export async function generateShendu(
  profile: UserProfile,
  book: { title: string; author: string; intro?: string },
  readBooks: ReadBook[] = [],
  onDisplayDelta?: (delta: string) => void
): Promise<string> {
  const systemPrompt = fillPrompt(SHENDU_SYSTEM_PROMPT, profile, readBooks);
  const userContent = `请为以下书籍生成深读内容：

书名：${book.title}
作者：${book.author}
${book.intro ? `简介：${book.intro}` : ""}`;

  return generateReadingContent(systemPrompt, userContent, 8192, onDisplayDelta);
}
