import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "发现好书",
  description: "根据你的兴趣与困惑，发现值得读的好书，开启 AI 智能阅读之旅。",
  alternates: {
    canonical: "/discover",
  },
};

export default function DiscoverLayout({ children }: { children: React.ReactNode }) {
  return children;
}
