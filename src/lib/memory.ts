import { normalizeReadingContent } from "./content-utils";
import type { BookInfo, ChatMessage, ReadBook, ReaderMemory } from "./types";

export type ToolCompressName = "tuijian" | "jingdu" | "shendu";

const GOAL_PATTERNS: RegExp[] = [
  /想(?:读|看|找|要|学|了解)[^。！？\n]{2,50}/,
  /希望能[^。！？\n]{2,50}/,
  /想要[^。！？\n]{2,50}/,
  /最近[^。！？\n]{2,40}(?:焦虑|迷茫|累|无聊|困惑|失眠|压力|空虚|烦|难过|开心|兴奋)/,
  /(?:帮我|给我|帮忙)(?:推荐|找|选|看看)[^。！？\n]{2,50}/,
  /不知道[^。！？\n]{2,40}/,
  /感觉[^。！？\n]{2,40}/,
  /为什么[^。！？\n]{2,40}[？?]/,
];

const THEME_KEYWORDS: Record<string, string> = {
  财富: "财富",
  赚钱: "财富",
  理财: "财富",
  投资: "财富",
  心理: "心理学",
  焦虑: "情绪与心理",
  抑郁: "情绪与心理",
  迷茫: "人生方向",
  方向: "人生方向",
  历史: "历史",
  哲学: "哲学",
  爱情: "情感",
  感情: "情感",
  职场: "职场",
  工作: "职场",
  管理: "管理",
  创业: "创业",
  科幻: "科幻",
  成长: "个人成长",
  自律: "个人成长",
  沟通: "沟通",
  领导: "领导力",
};

const MOOD_KEYWORDS = [
  "焦虑",
  "迷茫",
  "累",
  "无聊",
  "困惑",
  "压力",
  "空虚",
  "烦",
  "难过",
  "孤独",
  "失眠",
  "沮丧",
  "兴奋",
  "开心",
];

const ACTION_ONLY = /^(精读|深读|推荐|帮我推荐|继续|好的|好|嗯|是的|可以|行)[《「]?/;

export function emptyReaderMemory(): ReaderMemory {
  return {
    statedGoals: [],
    themes: [],
    conversationNotes: [],
    conversationSummary: "",
    summarizedMessageCount: 0,
    bookInsights: {},
    updatedAt: Date.now(),
  };
}

export function normalizeReaderMemory(raw: ReaderMemory | null | undefined): ReaderMemory {
  if (!raw) return emptyReaderMemory();
  return {
    statedGoals: raw.statedGoals ?? [],
    themes: raw.themes ?? [],
    conversationNotes: raw.conversationNotes ?? [],
    conversationSummary: raw.conversationSummary ?? "",
    summarizedMessageCount: raw.summarizedMessageCount ?? 0,
    bookInsights: raw.bookInsights ?? {},
    updatedAt: raw.updatedAt ?? Date.now(),
  };
}

/** 与 buildAgentHistory 的窗口大小保持一致 */
export const AGENT_HISTORY_WINDOW = 12;

function bookInsightKey(title: string, author?: string): string {
  return author ? `${title}::${author}` : title;
}

function extractMarkdownSection(md: string, headingNames: string[]): string {
  for (const name of headingNames) {
    const regex = new RegExp(`##\\s*${name}\\s*\\n+([\\s\\S]*?)(?=\\n##|$)`, "i");
    const match = md.match(regex);
    if (match?.[1]?.trim()) {
      return match[1].trim().replace(/\n+/g, " ").slice(0, 180);
    }
  }
  return "";
}

function extractSubheadings(md: string, limit = 3): string[] {
  return [...md.matchAll(/###\s*([^\n]+)/g)]
    .map((m) => m[1]!.trim())
    .slice(0, limit);
}

export function extractBookTitlesFromMarkdown(md: string): string[] {
  const titles = [...md.matchAll(/《([^》]+)》/g)].map((m) => m[1]!.trim());
  return [...new Set(titles)].slice(0, 10);
}

function uniquePush(list: string[], value: string, max = 12) {
  const trimmed = value.trim();
  if (!trimmed || list.includes(trimmed)) return list;
  return [...list, trimmed].slice(-max);
}

function isSignificantUserMessage(text: string): boolean {
  const t = text.trim();
  if (t.length < 6) return false;
  if (ACTION_ONLY.test(t) && t.length < 28) return false;
  return true;
}

function compressUserNote(text: string): string {
  return text.trim().replace(/\s+/g, " ").slice(0, 100);
}

/** 从精读/深读/推荐正文中提取 essence，供本地存储 */
export function extractEssence(
  type: "rec" | "jingdu" | "shendu",
  rawContent: string
): string {
  const md = normalizeReadingContent(rawContent);
  if (!md) return "";

  if (type === "rec") {
    const titles = extractBookTitlesFromMarkdown(md);
    if (titles.length) return `推荐了：${titles.slice(0, 5).join("、")}`;
    return md.replace(/#+\s/g, "").slice(0, 100).trim();
  }

  if (type === "jingdu") {
    const essence =
      extractMarkdownSection(md, ["一句话精髓", "精髓", "核心观点"]) ||
      md.replace(/#+\s/g, "").slice(0, 120).trim();
    const points = extractSubheadings(md, 2);
    return points.length ? `${essence}（${points.join("；")}）` : essence;
  }

  const insight =
    extractMarkdownSection(md, ["与今天的你", "核心思想", "书籍背景", "洞见"]) ||
    md.replace(/#+\s/g, "").slice(0, 150).trim();
  return insight;
}

/** 供主 Agent / history 使用的工具结果压缩（规则提取，零 LLM） */
export function compressToolResult(
  tool: ToolCompressName,
  fullContent: string,
  book?: BookInfo
): string {
  const md = normalizeReadingContent(fullContent);

  if (tool === "tuijian") {
    const titles = extractBookTitlesFromMarkdown(md);
    if (titles.length) {
      return `[推荐完成] 共 ${titles.length} 本：${titles.map((t) => `《${t}》`).join("、")}。（完整推荐已展示给用户，勿复述书目）`;
    }
    return `[推荐完成] ${md.replace(/#+\s/g, "").slice(0, 100)}…（完整推荐已展示，勿复述）`;
  }

  if (!book) {
    return `[${tool}完成] ${md.slice(0, 120)}…（正文已展示，勿复述）`;
  }

  if (tool === "jingdu") {
    const essence = extractMarkdownSection(md, ["一句话精髓", "精髓"]) || md.slice(0, 120);
    const points = extractSubheadings(md);
    const pointsText = points.length ? `\n观点：${points.join("；")}` : "";
    return `[精读完成]《${book.title}》— ${book.author}\n精髓：${essence}${pointsText}\n（完整正文已展示，勿复述）`;
  }

  const insight =
    extractMarkdownSection(md, ["与今天的你", "核心思想", "洞见"]) || md.slice(0, 150);
  return `[深读完成]《${book.title}》— ${book.author}\n洞见：${insight}\n（完整正文已展示，勿复述）`;
}

function messageTypeToTool(type: ChatMessage["type"]): ToolCompressName | null {
  if (type === "rec") return "tuijian";
  if (type === "jingdu" || type === "shendu") return type;
  return null;
}

/** 将 UI 消息转为 Agent history 条目（近期完整对话 + 工具摘要） */
export function buildAgentHistory(
  messages: ChatMessage[],
  maxMessages = AGENT_HISTORY_WINDOW
): Array<{ role: "user" | "assistant"; content: string }> {
  return messages
    .filter((m) => !m.streaming)
    .slice(-maxMessages)
    .map((m) => {
      if (m.role === "user" || m.type === "chat") {
        return { role: m.role, content: m.content };
      }
      const tool = messageTypeToTool(m.type);
      if (!tool) return { role: "assistant" as const, content: m.content };
      return {
        role: "assistant" as const,
        content: compressToolResult(tool, m.content, m.book),
      };
    });
}

export function buildReaderMemoryContext(memory: ReaderMemory | null | undefined): string {
  if (!memory) return "暂无长期阅读记忆。";

  const lines: string[] = [];

  if (memory.conversationSummary.trim()) {
    lines.push(`过往对话摘要（已滚出近期上下文）：\n${memory.conversationSummary.trim()}`);
  }

  if (memory.conversationNotes.length) {
    lines.push(
      `用户原话摘录：\n${memory.conversationNotes
        .slice(-8)
        .map((n) => `- ${n}`)
        .join("\n")}`
    );
  }

  if (memory.statedGoals.length) {
    lines.push(`阅读诉求：${memory.statedGoals.slice(-6).join("；")}`);
  }
  if (memory.themes.length) {
    lines.push(`关注主题：${memory.themes.slice(-8).join("、")}`);
  }

  const insights = Object.values(memory.bookInsights)
    .sort((a, b) => b.lastInteraction - a.lastInteraction)
    .slice(0, 12);

  if (insights.length) {
    lines.push("书目阅读记录（压缩）：");
    for (const item of insights) {
      const parts = [`《${item.title}》`];
      if (item.author) parts[0] += ` — ${item.author}`;
      if (item.jingduEssence) parts.push(`精读：${item.jingduEssence}`);
      if (item.shenduEssence) parts.push(`深读：${item.shenduEssence}`);
      if (item.recommendedIn?.length && !item.jingduEssence && !item.shenduEssence) {
        parts.push("曾出现在推荐中");
      }
      lines.push(`- ${parts.join("；")}`);
    }
  }

  return lines.length ? lines.join("\n\n") : "暂无长期阅读记忆。";
}

/** 从用户输入中提取诉求、主题与原话（规则，零 LLM） */
export function updateMemoryFromUserMessage(memory: ReaderMemory, text: string): ReaderMemory {
  const next: ReaderMemory = {
    ...memory,
    statedGoals: [...memory.statedGoals],
    themes: [...memory.themes],
    conversationNotes: [...memory.conversationNotes],
    bookInsights: { ...memory.bookInsights },
    updatedAt: Date.now(),
  };

  for (const pattern of GOAL_PATTERNS) {
    const match = text.match(pattern);
    if (match?.[0]) {
      next.statedGoals = uniquePush(next.statedGoals, match[0]);
    }
  }

  for (const [keyword, theme] of Object.entries(THEME_KEYWORDS)) {
    if (text.includes(keyword)) {
      next.themes = uniquePush(next.themes, theme, 10);
    }
  }

  for (const mood of MOOD_KEYWORDS) {
    if (text.includes(mood)) {
      next.statedGoals = uniquePush(next.statedGoals, `提到${mood}`, 12);
    }
  }

  if (isSignificantUserMessage(text)) {
    next.conversationNotes = uniquePush(
      next.conversationNotes,
      compressUserNote(text),
      15
    );
  }

  return next;
}

/** 工具完成后更新本地长期记忆 */
export function updateMemoryAfterTool(
  memory: ReaderMemory,
  type: "rec" | "jingdu" | "shendu",
  fullContent: string,
  book?: BookInfo
): ReaderMemory {
  const next: ReaderMemory = {
    ...memory,
    statedGoals: [...memory.statedGoals],
    themes: [...memory.themes],
    conversationNotes: [...memory.conversationNotes],
    bookInsights: { ...memory.bookInsights },
    updatedAt: Date.now(),
  };

  const essence = extractEssence(type, fullContent);

  if (type === "rec") {
    const titles = extractBookTitlesFromMarkdown(normalizeReadingContent(fullContent));
    const now = Date.now();
    if (titles.length) {
      for (const title of titles) {
        const key = bookInsightKey(title);
        const existing = next.bookInsights[key];
        next.bookInsights[key] = {
          title,
          author: existing?.author ?? "",
          recommendedIn: titles,
          lastInteraction: now,
          jingduEssence: existing?.jingduEssence,
          shenduEssence: existing?.shenduEssence,
        };
      }
    } else if (essence) {
      next.conversationNotes = uniquePush(next.conversationNotes, essence, 15);
    }
    return next;
  }

  if (!book) return next;

  const key = bookInsightKey(book.title, book.author);
  const existing = next.bookInsights[key];
  const entry = {
    title: book.title,
    author: book.author,
    recommendedIn: existing?.recommendedIn,
    lastInteraction: Date.now(),
    jingduEssence: existing?.jingduEssence,
    shenduEssence: existing?.shenduEssence,
  };

  if (type === "jingdu") {
    entry.jingduEssence = essence;
  } else {
    entry.shenduEssence = essence;
  }

  next.bookInsights[key] = entry;
  return next;
}

function buildBatchSummary(msgs: ChatMessage[]): string {
  const parts: string[] = [];
  for (const m of msgs) {
    if (m.role === "user" && isSignificantUserMessage(m.content)) {
      parts.push(`用户谈及「${compressUserNote(m.content).slice(0, 36)}」`);
    } else if (m.type === "rec") {
      const titles = extractBookTitlesFromMarkdown(normalizeReadingContent(m.content));
      parts.push(titles.length ? `推荐了 ${titles.length} 本书` : "完成书籍推荐");
    } else if ((m.type === "jingdu" || m.type === "shendu") && m.book) {
      parts.push(`${m.type === "jingdu" ? "精读" : "深读"}《${m.book.title}》`);
    }
  }
  return parts.join("；");
}

function foldMessageIntoMemory(memory: ReaderMemory, m: ChatMessage): ReaderMemory {
  if (m.role === "user") {
    return updateMemoryFromUserMessage(memory, m.content);
  }
  if (m.type === "rec" || m.type === "jingdu" || m.type === "shendu") {
    return updateMemoryAfterTool(memory, m.type, m.content, m.book);
  }
  return memory;
}

/**
 * 当消息总数超过 history 窗口时，将刚要滚出窗口的消息折叠进 Layer 3。
 * 仅在「旧对话被新对话挤出窗口」时触发，而非每条消息都写记忆。
 */
export function archiveOverflowMessages(
  memory: ReaderMemory,
  messages: ChatMessage[],
  windowSize = AGENT_HISTORY_WINDOW
): ReaderMemory {
  const stable = messages.filter((m) => !m.streaming);
  const overflowEnd = Math.max(0, stable.length - windowSize);
  const alreadyDone = memory.summarizedMessageCount ?? 0;

  if (overflowEnd <= alreadyDone) {
    return memory;
  }

  const toArchive = stable.slice(alreadyDone, overflowEnd);
  let next: ReaderMemory = {
    ...normalizeReaderMemory(memory),
    summarizedMessageCount: overflowEnd,
    updatedAt: Date.now(),
  };

  for (const m of toArchive) {
    next = foldMessageIntoMemory(next, m);
  }

  const batchSummary = buildBatchSummary(toArchive);
  if (batchSummary) {
    const merged = next.conversationSummary
      ? `${next.conversationSummary}\n${batchSummary}`
      : batchSummary;
    next.conversationSummary = merged.slice(-900);
  }

  return next;
}

/** 从已读书目回填 bookInsights（含 essence） */
export function syncMemoryFromReadBooks(
  memory: ReaderMemory,
  readBooks: ReadBook[]
): ReaderMemory {
  const next: ReaderMemory = {
    ...memory,
    bookInsights: { ...memory.bookInsights },
    updatedAt: Date.now(),
  };

  for (const book of readBooks) {
    const key = bookInsightKey(book.title, book.author);
    const existing = next.bookInsights[key];
    const essence =
      book.essence ?? extractEssence(book.readType, book.content);

    next.bookInsights[key] = {
      title: book.title,
      author: book.author,
      recommendedIn: existing?.recommendedIn,
      lastInteraction: Math.max(existing?.lastInteraction ?? 0, book.readAt),
      jingduEssence:
        book.readType === "jingdu"
          ? essence || existing?.jingduEssence
          : existing?.jingduEssence,
      shenduEssence:
        book.readType === "shendu"
          ? essence || existing?.shenduEssence
          : existing?.shenduEssence,
    };
  }

  return next;
}

/** 判断记忆是否实质为空 */
export function isMemoryEmpty(memory: ReaderMemory): boolean {
  return (
    !memory.conversationSummary.trim() &&
    memory.statedGoals.length === 0 &&
    memory.themes.length === 0 &&
    memory.conversationNotes.length === 0 &&
    Object.keys(memory.bookInsights).length === 0
  );
}
