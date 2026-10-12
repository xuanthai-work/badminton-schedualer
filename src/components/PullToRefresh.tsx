"use client";

import { useCallback, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { triggerHaptic } from "@/lib/haptics";

// Rubber-band damping so the pull feels native (iOS/Android-like).
const DAMPING = 0.4;
// Cap the visual travel so the content never slides absurdly far.
const MAX_PULL = 80;
// Distance (in px) that arms the refresh on release.
const THRESHOLD = 60;

type PullToRefreshProps = {
  onRefresh: () => Promise<void>;
  children: React.ReactNode;
  className?: string;
  disabled?: boolean;
};

/**
 * Touch-only pull-to-refresh wrapper.
 *
 * Tracks a downward drag only when the page is already scrolled to the top, so
 * normal scrolling mid-page is untouched. Mouse/pointer users are unaffected
 * because only touch events are handled.
 */
export default function PullToRefresh({
  onRefresh,
  children,
  className = "",
  disabled = false,
}: PullToRefreshProps) {
  const startY = useRef(0);
  const pullRef = useRef(0);
  const tracking = useRef(false);
  const armed = useRef(false);
  const [pull, setPull] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleTouchStart = (event: React.TouchEvent) => {
    if (disabled || refreshing) return;
    if (typeof window !== "undefined" && window.scrollY > 0) return;
    startY.current = event.touches[0].clientY;
    tracking.current = true;
    armed.current = false;
  };

  const handleTouchMove = (event: React.TouchEvent) => {
    if (!tracking.current || disabled || refreshing) return;
    const diff = event.touches[0].clientY - startY.current;
    if (diff <= 0) {
      if (pullRef.current !== 0) {
        pullRef.current = 0;
        setPull(0);
      }
      return;
    }
    const distance = Math.min(diff * DAMPING, MAX_PULL);
    pullRef.current = distance;
    if (!dragging) setDragging(true);
    setPull(distance);
    if (!armed.current && distance >= THRESHOLD) {
      armed.current = true;
      triggerHaptic("light");
    }
  };

  const settle = useCallback(async () => {
    if (!tracking.current) return;
    tracking.current = false;
    setDragging(false);
    if (pullRef.current >= THRESHOLD) {
      setRefreshing(true);
      setPull(THRESHOLD);
      try {
        await onRefresh();
      } finally {
        triggerHaptic("success");
        setRefreshing(false);
        pullRef.current = 0;
        setPull(0);
      }
    } else {
      pullRef.current = 0;
      setPull(0);
    }
  }, [onRefresh]);

  const progress = Math.min(pull / THRESHOLD, 1);

  return (
    <div
      className={`relative ${className}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={() => void settle()}
      onTouchCancel={() => void settle()}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1 z-20 -translate-x-1/2"
        style={{ opacity: refreshing ? 1 : progress }}
      >
        <div className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-slate-900/90 shadow-lg shadow-black/30">
          {refreshing ? (
            <Loader2 size={16} className="animate-spin text-lime-400" />
          ) : (
            <Loader2
              size={16}
              className="text-lime-400"
              style={{ transform: `rotate(${progress * 360}deg)` }}
            />
          )}
        </div>
      </div>

      <div
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: dragging ? "none" : "transform 0.28s ease",
        }}
      >
        {children}
      </div>
    </div>
  );
}
