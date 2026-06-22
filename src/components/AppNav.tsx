"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import AppLogo from "./AppLogo";

const NAV_ITEMS = [
  { href: "/discover", label: "发现" },
  { href: "/chat", label: "对话" },
  { href: "/read", label: "书目" },
] as const;

interface AppNavProps {
  subtitle?: string;
}

export default function AppNav({ subtitle }: AppNavProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-paper bg-white/90 backdrop-blur-sm safe-top">
      <div className="mx-auto flex max-w-2xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link href="/discover" className="min-w-0 shrink-0 transition-opacity hover:opacity-80">
          <AppLogo size="sm" />
          {subtitle && <p className="mt-0.5 truncate text-[11px] text-ink-muted">{subtitle}</p>}
        </Link>

        <nav className="flex shrink-0 items-center gap-1 rounded-full border border-paper bg-cream/80 p-1">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all sm:px-4 sm:text-sm ${
                  active
                    ? "bg-white text-accent shadow-sm"
                    : "text-ink-muted hover:text-ink"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
