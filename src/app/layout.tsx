import type { Metadata, Viewport } from "next";
import { AppProvider } from "@/context/AppContext";
import "./globals.css";

export const metadata: Metadata = {
  title: "速读 - AI 智能阅读",
  description: "AI 驱动的书籍推荐与速读体验",
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
        <AppProvider>{children}</AppProvider>
      </body>
    </html>
  );
}
