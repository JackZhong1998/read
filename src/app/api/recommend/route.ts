import { NextRequest } from "next/server";
import { runRecommendWithEvents } from "@/lib/recommend-runner";
import type { ReadBook, RecommendStreamEvent, UserProfile } from "@/lib/types";

export const maxDuration = 120;

/** 预热路由编译，避免首条消息触发 HMR 全页重载导致 fetch 中断 */
export async function GET() {
  return Response.json({ ok: true });
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { message, history, profile, readBooks, stream } = body as {
    message: string;
    history: Array<{ role: "user" | "assistant"; content: string }>;
    profile: UserProfile;
    readBooks: ReadBook[];
    stream?: boolean;
  };

  if (!message || !profile) {
    return Response.json({ error: "缺少必要参数" }, { status: 400 });
  }

  if (stream) {
    const encoder = new TextEncoder();
    const readable = new ReadableStream({
      async start(controller) {
        const send = (event: RecommendStreamEvent) => {
          controller.enqueue(encoder.encode(JSON.stringify(event) + "\n"));
        };
        try {
          await runRecommendWithEvents(message, history, profile, readBooks ?? [], send);
          send({ event: "done" });
        } catch (error) {
          console.error("Recommend stream error:", error);
          send({
            event: "error",
            message: error instanceof Error ? error.message : "推荐服务出错",
          });
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readable, {
      headers: { "Content-Type": "application/x-ndjson" },
    });
  }

  try {
    const results: Awaited<ReturnType<typeof runRecommendWithEvents>> = [];
    await runRecommendWithEvents(message, history, profile, readBooks ?? [], (event) => {
      if (event.event === "message_done") {
        results.push({ type: event.type, content: event.content, book: event.book });
      }
    });
    return Response.json({ results });
  } catch (error) {
    console.error("Recommend API error:", error);
    return Response.json(
      { error: error instanceof Error ? error.message : "推荐服务出错" },
      { status: 500 }
    );
  }
}
