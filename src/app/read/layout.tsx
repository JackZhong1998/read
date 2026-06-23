import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "我的书架",
  description: "查看你已精读与深读的书籍，随时回顾阅读进度与笔记。",
  alternates: {
    canonical: "/read",
  },
};

export default function ReadLayout({ children }: { children: React.ReactNode }) {
  return children;
}
