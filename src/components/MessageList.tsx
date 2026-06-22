"use client";

import type { ChatMessage } from "@/lib/types";
import { sanitizeChatForDisplay } from "@/lib/content-utils";
import ContentCard from "./ContentCard";

interface MessageListProps {
  messages: ChatMessage[];
  onFullscreen: (msg: ChatMessage) => void;
}

export default function MessageList({ messages, onFullscreen }: MessageListProps) {
  return (
    <div className="flex flex-col gap-4 py-4">
      {messages.map((msg) => {
        if (msg.role === "user") {
          return (
            <div key={msg.id} className="flex justify-end animate-fade-in">
              <div className="max-w-[85%] rounded-2xl rounded-br-md bg-accent px-4 py-3 text-sm text-white shadow-sm">
                {msg.content}
              </div>
            </div>
          );
        }

        if (msg.type === "chat") {
          const chatText = sanitizeChatForDisplay(msg.content);
          if (!chatText && !msg.streaming) return null;
          return (
            <div key={msg.id} className="flex justify-start animate-fade-in">
              <div className="max-w-[90%] rounded-2xl rounded-bl-md bg-white px-4 py-3 text-sm leading-relaxed text-ink shadow-sm border border-paper">
                {chatText}
                {msg.streaming && (
                  <span className="ml-0.5 inline-block h-4 w-0.5 animate-pulse bg-accent align-middle" />
                )}
              </div>
            </div>
          );
        }

        return (
          <div key={msg.id} className="w-full">
            <ContentCard
              type={msg.type as "rec" | "jingdu" | "shendu"}
              content={msg.content}
              book={msg.book}
              onFullscreen={() => onFullscreen(msg)}
              streaming={msg.streaming}
            />
          </div>
        );
      })}
    </div>
  );
}
