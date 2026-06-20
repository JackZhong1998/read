import { NextRequest, NextResponse } from "next/server";
import { callMoonshot, parseJsonFromText } from "@/lib/moonshot";
import { fillPrompt, SUGGESTIONS_SYSTEM_PROMPT } from "@/lib/prompts";
import type { ReadBook, UserProfile } from "@/lib/types";

export const maxDuration = 60;

export async function GET() {
  return NextResponse.json({ ok: true });
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
    const userContent = `当前内容类型：${contentType ?? "对话"}
对话上下文：
${context}

请生成3-4个精简的后续阅读行动选项。`;

    const response = await callMoonshot(
      [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
      { disableThinking: true, maxTokens: 512 }
    );

    const content = response.choices[0]?.message?.content ?? "[]";
    const parsed = parseJsonFromText<unknown>(content);
    let suggestions: string[] = [];
    if (Array.isArray(parsed)) {
      suggestions = parsed.filter((s): s is string => typeof s === "string");
    } else if (parsed && typeof parsed === "object" && parsed !== null && "suggestions" in parsed) {
      const raw = (parsed as { suggestions: unknown }).suggestions;
      if (Array.isArray(raw)) {
        suggestions = raw.filter((s): s is string => typeof s === "string");
      }
    }

    return NextResponse.json({
      suggestions: suggestions.slice(0, 4),
    });
  } catch (error) {
    console.error("Suggestions API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "推荐选项生成出错" },
      { status: 500 }
    );
  }
}
