import { NextRequest, NextResponse } from "next/server";
import { generateShendu } from "@/lib/reading-tools";
import type { ReadBook, UserProfile } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const { profile, book, readBooks } = (await req.json()) as {
      profile: UserProfile;
      book: { title: string; author: string; intro?: string };
      readBooks?: ReadBook[];
    };

    if (!profile || !book?.title) {
      return NextResponse.json({ error: "缺少必要参数" }, { status: 400 });
    }

    const content = await generateShendu(profile, book, readBooks ?? []);
    return NextResponse.json({ content });
  } catch (error) {
    console.error("Shendu API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "深读服务出错" },
      { status: 500 }
    );
  }
}
