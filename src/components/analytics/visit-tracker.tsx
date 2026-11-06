"use client";

import { useEffect, useRef } from "react";

interface VisitTrackerProps {
  enabled: boolean;
  activeSection?: string;
}

export function VisitTracker({
  enabled,
  activeSection,
}: VisitTrackerProps) {
  const recorded = useRef(false);
  const recordedSections = useRef(new Set<string>());

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

  useEffect(() => {
    if (
      !enabled ||
      !activeSection ||
      recordedSections.current.has(activeSection) ||
      typeof fetch !== "function"
    ) {
      return;
    }
    recordedSections.current.add(activeSection);
    void fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        eventType: "section_view",
        path: `${window.location.pathname}${window.location.search}`,
        section: activeSection,
      }),
      keepalive: true,
    }).catch(() => {
      // Behavioral analytics must never interrupt the public experience.
    });
  }, [activeSection, enabled]);

  return null;
}
