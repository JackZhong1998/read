export const GA_MEASUREMENT_ID = "G-WDNCH5D8GL";

export const SITE_NAME = process.env.NEXT_PUBLIC_APP_NAME?.trim() || "速读";

export const SITE_DESCRIPTION =
  "困惑共鸣，书籍解忧 — AI 驱动的精准荐书与速读体验，帮你找到值得读的书并读懂每一本。";

export const SITE_KEYWORDS = [
  "AI阅读",
  "智能荐书",
  "速读",
  "读书",
  "精读",
  "深读",
  "书籍推荐",
  "AI读书",
  "成长阅读",
];

export function getSiteUrl(): string {
  const url = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (url) return url.replace(/\/$/, "");
  return "http://localhost:3000";
}
