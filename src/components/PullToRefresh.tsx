"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

const PULL_THRESHOLD = 72;

interface PullToRefreshProps {
  onRefresh: () => Promise<void>;
  refreshing?: boolean;
  children: ReactNode;
}

export default function PullToRefresh({ onRefresh, refreshing, children }: PullToRefreshProps) {
  const [pullDistance, setPullDistance] = useState(0);
  const [pulling, setPulling] = useState(false);
  const startYRef = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0 || refreshing) return;
    startYRef.current = e.touches[0]!.clientY;
    setPulling(true);
  }, [refreshing]);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling || refreshing) return;
      const el = containerRef.current;
      if (!el || el.scrollTop > 0) {
        setPullDistance(0);
        return;
      }
      const delta = e.touches[0]!.clientY - startYRef.current;
      if (delta > 0) {
        setPullDistance(Math.min(delta * 0.5, 100));
      }
    },
    [pulling, refreshing]
  );

  const handleTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= PULL_THRESHOLD && !refreshing) {
      setPullDistance(PULL_THRESHOLD);
      try {
        await onRefresh();
      } finally {
        setPullDistance(0);
      }
    } else {
      setPullDistance(0);
    }
  }, [pulling, pullDistance, refreshing, onRefresh]);

  const progress = Math.min(pullDistance / PULL_THRESHOLD, 1);

  return (
    <div
      ref={containerRef}
      className="relative flex-1 overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void handleTouchEnd()}
    >
      <div
        className="pointer-events-none flex items-center justify-center overflow-hidden transition-[height] duration-200"
        style={{ height: refreshing ? 48 : pullDistance > 0 ? pullDistance : 0 }}
      >
        <div
          className={`text-xs text-ink-muted transition-opacity ${refreshing || pullDistance > 0 ? "opacity-100" : "opacity-0"}`}
        >
          {refreshing ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-accent border-t-transparent" />
              正在刷新推荐…
            </span>
          ) : pullDistance >= PULL_THRESHOLD ? (
            "松开刷新"
          ) : (
            <span style={{ opacity: progress }}>下拉刷新推荐</span>
          )}
        </div>
      </div>
      {children}
    </div>
  );
}
