import { NextRequest, NextResponse } from "next/server";
import { callMoonshot, parseJsonFromText } from "@/lib/moonshot";
import { fillPrompt, SUGGESTIONS_SYSTEM_PROMPT } from "@/lib/prompts";
import { formatSuggestionItem } from "@/lib/suggestion-utils";
import type { ReadBook, UserProfile } from "@/lib/types";

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true });
}

function collectSuggestions(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((item) => formatSuggestionItem(item))
    .filter((s): s is string => Boolean(s));
}

function userPromptForType(contentType?: string): string {
  if (contentType === "rec") {
    return `当前内容类型：书籍推荐(rec)

请根据【会话中的阅读内容】与【当前触发的最新内容】，为推荐列表中的每一本书各生成 1 个「精读」选项。
数量必须与推荐书目一致，不要只出 4 个。每条须含书名与 8-18 字简介，格式：精读《书名》｜简介`;
  }
  if (contentType === "jingdu") {
    return `当前内容类型：精读(jingdu)

请为刚完成精读的书生成深读选项（含简介），并视情况补充其他未深读书目的选项。`;
  }
  if (contentType === "shendu") {
    return `当前内容类型：深读(shendu)

请根据阅读进度，推荐下一本待精读的书（每本一项，含简介），或简短主题方向。`;
  }
  return `当前内容类型：${contentType ?? "对话"}

请根据上下文生成最贴合的后续阅读行动选项。对话场景 2-4 项；涉及多本书时一书一项，不截断。`;
}

export async function POST(req: NextRequest) {
  try {
    const { context, profile, contentType, readBooks } = (await req.json()) as {
      context: string;
      profile: UserProfile;
      contentType?: "chat" | "rec" | "jingdu" | "shendu";
      readBooks?: ReadBook[];
    };

    if (!context || !profile) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const systemPrompt = fillPrompt(SUGGESTIONS_SYSTEM_PROMPT, profile, readBooks ?? []);
    const userContent = `${userPromptForType(contentType)}

${context}`;

    const response = await callMoonshot(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { disableThinking: true, maxTokens: 1536 }
    );

    const content = response.choices[0]?.message?.content ?? "[]";
    const parsed = parseJsonFromText<unknown>(content);
    let suggestions: string[] = [];

    if (Array.isArray(parsed)) {
      suggestions = collectSuggestions(parsed);
    } else if (parsed && typeof parsed === "object" && parsed !== null) {
      const obj = parsed as Record<string, unknown>;
      const raw = obj.suggestions ?? obj.options ?? obj.items;
      if (Array.isArray(raw)) {
        suggestions = collectSuggestions(raw);
      }
    }

    if (!suggestions.length) {
      const inlineArray = content.match(/\[[\s\S]*?\]/);
      if (inlineArray) {
        try {
          const fallback = JSON.parse(inlineArray[0]) as unknown;
          if (Array.isArray(fallback)) {
            suggestions = collectSuggestions(fallback);
          }
        } catch {
          // ignore
        }
      }
    }

    return NextResponse.json({
      suggestions: suggestions.map((s) => s.trim()),
    });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "推荐选项生成出错" },
      { status: 500 }
    );
  }
}
