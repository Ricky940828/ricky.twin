"use client";

import { useEffect, useRef } from "react";

export function VisitTracker({ enabled }: { enabled: boolean }) {
  const recorded = useRef(false);

  useEffect(() => {
    if (!enabled || recorded.current || typeof fetch !== "function") {
      return;
    }
    recorded.current = true;
    void fetch("/api/visit", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: `${window.location.pathname}${window.location.search}`,
      }),
      keepalive: true,
    }).catch(() => {
      // Analytics must never interrupt the public experience.
    });
  }, [enabled]);

  return null;
}
