import type { Metadata, Viewport } from "next";
import ChunkErrorRecovery from "@/components/ChunkErrorRecovery";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "速读 - AI 智能阅读",
  description: "困惑共鸣，书籍解忧 — AI 驱动的精准荐书与速读体验",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "速读",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#faf7f2",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body>
        <ChunkErrorRecovery />
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
