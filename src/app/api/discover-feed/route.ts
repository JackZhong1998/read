import { NextRequest } from "next/server";
import { generateDiscoverFeedWithFallback } from "@/lib/discover-feed-agent";
import type { DiscoverFeedSegment } from "@/lib/discover-feed-types";
import { getDiscoverFeed, type DiscoverRefreshIntent } from "@/lib/discover-feed";
import type { ChatMessage, ReadBook, ReaderMemory, UserProfile } from "@/lib/types";

export const maxDuration = 120;

export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { profile, readBooks, readerMemory, recentMessages, currentFeed, refreshIntent, userPreference } =
    body as {
      profile: UserProfile;
      readBooks?: ReadBook[];
      readerMemory?: ReaderMemory | null;
      recentMessages?: ChatMessage[];
      currentFeed?: DiscoverFeedSegment;
      refreshIntent?: DiscoverRefreshIntent;
      userPreference?: string;
    };

  if (!profile?.gender || !profile?.ageGroup) {
    return Response.json({ error: "缺少读者档案" }, { status: 400 });
  }

  const baseFeed = getDiscoverFeed(profile.gender, profile.ageGroup);
  if (!baseFeed) {
    return Response.json({ error: "该人群暂无发现页模板" }, { status: 404 });
  }

  try {
    const { feed, source } = await generateDiscoverFeedWithFallback(
      profile,
      readBooks ?? [],
      readerMemory ?? null,
      recentMessages ?? [],
      baseFeed,
      { currentFeed, refreshIntent, userPreference }
    );
    return Response.json({ feed, source });
  } catch (error) {
    console.error("Discover feed API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "发现页推荐服务出错" },
      { status: 500 }
    );
  }
}
