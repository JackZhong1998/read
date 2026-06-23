import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI 对话荐书",
  description: "与 AI 对话，说出你的困惑与兴趣，获取精准书籍推荐与速读内容。",
  alternates: {
    canonical: "/chat",
  },
};

export default function ChatLayout({ children }: { children: React.ReactNode }) {
  return children;
}
