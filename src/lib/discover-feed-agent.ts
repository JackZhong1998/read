import "server-only";

import type { DiscoverFeedSegment } from "@/lib/discover-feed-types";
import { applyDiscoverHeader, collectMutableSectionTitles, type DiscoverRefreshIntent } from "@/lib/discover-feed";
import { parseJsonFromText } from "@/lib/json-utils";
import { buildReaderMemoryContext } from "@/lib/memory";
import { callMoonshot } from "@/lib/moonshot";
import { DISCOVER_FEED_AGENT_PROMPT, fillPrompt } from "@/lib/prompts";
import type { ChatMessage, ReadBook, ReaderMemory, UserProfile } from "@/lib/types";

function buildRecentConversationContext(messages: ChatMessage[]): string {
  const recent = messages
    .filter((m) => !m.streaming)
    .slice(-8)
    .map((m) => {
      const role = m.role === "user" ? "用户" : "AI";
      const preview =
        m.content.length > 200 ? `${m.content.slice(0, 200)}…` : m.content;
      return `${role}：${preview}`;
    });

  if (!recent.length) return "暂无近期对话。";
  return `近期对话摘录：\n${recent.join("\n")}`;
}

function mergeFeedWithBase(
  generated: Partial<DiscoverFeedSegment>,
  base: DiscoverFeedSegment
): DiscoverFeedSegment {
  const shortHooks = generated.shortHooks;
  const sevenDayPath = generated.sevenDayPath;

  return {
    gender: generated.gender ?? base.gender,
    ageGroup: generated.ageGroup ?? base.ageGroup,
    header: applyDiscoverHeader(base).header,
    oneTapStart: generated.oneTapStart?.primary?.book?.title
      ? {
          primary: {
            book: generated.oneTapStart.primary.book,
            badges: generated.oneTapStart.primary.badges?.length
              ? generated.oneTapStart.primary.badges
              : base.oneTapStart.primary.badges,
            hook: generated.oneTapStart.primary.hook ?? base.oneTapStart.primary.hook,
            readMinutes:
              generated.oneTapStart.primary.readMinutes ?? base.oneTapStart.primary.readMinutes,
            suitableFor:
              generated.oneTapStart.primary.suitableFor ?? base.oneTapStart.primary.suitableFor,
            difficulty:
              generated.oneTapStart.primary.difficulty ?? base.oneTapStart.primary.difficulty,
            readScene:
              generated.oneTapStart.primary.readScene ?? base.oneTapStart.primary.readScene,
          },
          secondary:
            (generated.oneTapStart.secondary?.length ?? 0) >= 2
              ? generated.oneTapStart.secondary!
              : base.oneTapStart.secondary,
        }
      : base.oneTapStart,
    problemClusters:
      (generated.problemClusters?.length ?? 0) >= 2
        ? generated.problemClusters!
        : base.problemClusters,
    zones: base.zones,
    shortHooks: {
      quiz: shortHooks?.quiz?.options?.length ? shortHooks.quiz : base.shortHooks.quiz,
      quotes:
        (shortHooks?.quotes?.length ?? 0) >= 2 ? shortHooks!.quotes : base.shortHooks.quotes,
      weeklyTasks:
        (shortHooks?.weeklyTasks?.length ?? 0) >= 2
          ? shortHooks!.weeklyTasks
          : base.shortHooks.weeklyTasks,
    },
    sevenDayPath:
      (sevenDayPath?.days?.length ?? 0) >= 5 ? sevenDayPath! : base.sevenDayPath,
    footer: {
      refreshLabel: generated.footer?.refreshLabel ?? base.footer.refreshLabel,
      easyFilter: generated.footer?.easyFilter ?? base.footer.easyFilter,
      hardFilter: generated.footer?.hardFilter ?? base.footer.hardFilter,
    },
  };
}

export interface DiscoverFeedRefreshOptions {
  currentFeed?: DiscoverFeedSegment;
  refreshIntent?: DiscoverRefreshIntent;
  userPreference?: string;
}

function buildRefreshIntentContext(options?: DiscoverFeedRefreshOptions): string {
  const lines: string[] = [];
  if (options?.userPreference?.trim()) {
    lines.push(`用户本次刷新诉求：${options.userPreference.trim()}`);
  }
  if (options?.refreshIntent === "easy") {
    lines.push("偏好方向：更轻松、好读、治愈、不费力的书");
  } else if (options?.refreshIntent === "hard") {
    lines.push("偏好方向：更硬核、深度、进阶、值得啃的书");
  }
  if (options?.currentFeed) {
    const avoid = collectMutableSectionTitles(options.currentFeed);
    lines.push(`必须与当前展示明显不同，禁止重复使用以下书名：${avoid.join("、")}`);
    lines.push(
      `当前困惑主题参考：${options.currentFeed.problemClusters.map((c) => c.title).join("、")}`
    );
  }
  lines.push("「必读」「Top」「畅销」「经典」四个运营区由系统保留，无需更换其中的书。");
  return lines.join("\n");
}

export async function generateDiscoverFeed(
  profile: UserProfile,
  readBooks: ReadBook[],
  readerMemory: ReaderMemory | null,
  recentMessages: ChatMessage[],
  baseFeed: DiscoverFeedSegment,
  options?: DiscoverFeedRefreshOptions
): Promise<DiscoverFeedSegment> {
  const systemPrompt = fillPrompt(
    DISCOVER_FEED_AGENT_PROMPT,
    profile,
    readBooks,
    readerMemory
  );

  const memoryContext = buildReaderMemoryContext(readerMemory);
  const conversationContext = buildRecentConversationContext(recentMessages);

  const refreshContext = buildRefreshIntentContext(options);

  const userContent = `请为发现页生成个性化推荐内容。

读者性别与年龄段已写入系统提示，请据此调整推荐书目与困惑主题。
当前模板参考（可换书但保持结构）：${JSON.stringify({
    problemClusterTitles: baseFeed.problemClusters.map((c) => c.title),
    sampleBooks: baseFeed.oneTapStart.secondary.map((b) => b.title),
  })}

${refreshContext}

${memoryContext}

${conversationContext}

请输出完整 JSON。`;

  const response = await callMoonshotWithRetry(
    [
      { role: "system", content: systemPrompt },
      { role: "user", content: userContent },
    ],
    { temperature: 0.85, maxTokens: 8192, disableThinking: true }
  );

  const raw = response.choices[0]?.message?.content ?? "";
  const parsed = parseJsonFromText<Partial<DiscoverFeedSegment>>(raw);

  if (!parsed) {
    throw new Error("发现页推荐生成失败：无法解析 AI 返回内容");
  }

  return mergeFeedWithBase(
    { ...parsed, gender: profile.gender, ageGroup: profile.ageGroup },
    baseFeed
  );
}

function isRetryableNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  if (msg === "Failed to fetch" || error.name === "AbortError") return true;
  return /timeout|UND_ERR|ECONNRESET|ETIMEDOUT|fetch failed/i.test(msg);
}

async function callMoonshotWithRetry(
  messages: Parameters<typeof callMoonshot>[0],
  options: Parameters<typeof callMoonshot>[1]
) {
  let lastError: unknown;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      return await callMoonshot(messages, options);
    } catch (error) {
      lastError = error;
      if (attempt < 2 && isRetryableNetworkError(error)) {
        await new Promise((r) => setTimeout(r, 1200 * (attempt + 1)));
        continue;
      }
      throw error;
    }
  }
  throw lastError;
}

export async function generateDiscoverFeedWithFallback(
  profile: UserProfile,
  readBooks: ReadBook[],
  readerMemory: ReaderMemory | null,
  recentMessages: ChatMessage[],
  baseFeed: DiscoverFeedSegment,
  options?: DiscoverFeedRefreshOptions
): Promise<{ feed: DiscoverFeedSegment; source: "ai" | "local" }> {
  try {
    const feed = await generateDiscoverFeed(
      profile,
      readBooks,
      readerMemory,
      recentMessages,
      baseFeed,
      options
    );
    return { feed, source: "ai" };
  } catch (error) {
    console.error("Discover feed AI failed, using local shuffle:", error);
    const { shuffleDiscoverFeed } = await import("@/lib/discover-feed");
    return {
      feed: shuffleDiscoverFeed(baseFeed, {
        currentFeed: options?.currentFeed,
        intent: options?.refreshIntent,
        userPreference: options?.userPreference,
      }),
      source: "local",
    };
  }
}
