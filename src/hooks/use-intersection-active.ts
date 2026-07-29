"use client";

import { useCallback, useEffect, useState } from "react";

interface IntersectionActiveOptions {
  rootMargin?: string;
  threshold?: number | number[];
  defaultActive?: boolean;
}

export function useIntersectionActive<T extends Element>({
  rootMargin = "-12% 0px -12%",
  threshold = 0.2,
  defaultActive = false,
}: IntersectionActiveOptions = {}) {
  const [node, setNode] = useState<T | null>(null);
  const [active, setActive] = useState(defaultActive);
  const ref = useCallback((element: T | null) => setNode(element), []);

  useEffect(() => {
    if (!node) {
      return;
    }

    const scheduleFrame = window.requestAnimationFrame.bind(window);
    const cancelFrame = window.cancelAnimationFrame.bind(window);

    if (!("IntersectionObserver" in window)) {
      const animationFrame = scheduleFrame(() => setActive(true));
      return () => cancelFrame(animationFrame);
    }

    const observer = new IntersectionObserver(
      ([entry]) => setActive(entry.isIntersecting),
      { rootMargin, threshold },
    );
    observer.observe(node);

    return () => observer.disconnect();
  }, [node, rootMargin, threshold]);

  return { ref, active };
}
