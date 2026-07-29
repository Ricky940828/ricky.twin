"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { cn } from "@/lib/cn";
import { gsap } from "@/lib/gsap-client";

interface MagicRingsProps {
  active: boolean;
  pulseKey: number;
  reducedMotion: boolean;
  className?: string;
}

const RINGS = [
  { rx: 102, ry: 102, dash: "4 12" },
  { rx: 132, ry: 94, dash: "18 9" },
  { rx: 158, ry: 118, dash: "3 10" },
  { rx: 184, ry: 142, dash: "26 15" },
  { rx: 210, ry: 166, dash: "5 14" },
];

export function MagicRings({
  active,
  pulseKey,
  reducedMotion,
  className,
}: MagicRingsProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root || reducedMotion || !active) {
        return;
      }

      const rings = root.querySelectorAll<SVGEllipseElement>("[data-ring]");
      rings.forEach((ring, index) => {
        gsap.to(ring, {
          rotation: index % 2 === 0 ? 360 : -360,
          transformOrigin: "50% 50%",
          duration: 24 + index * 7,
          repeat: -1,
          ease: "none",
        });
      });
    },
    { scope: rootRef, dependencies: [active, reducedMotion] },
  );

  useGSAP(
    () => {
      if (!rootRef.current || reducedMotion || pulseKey <= 0) {
        return;
      }

      gsap.fromTo(
        rootRef.current,
        { scale: 0.97, opacity: 0.64 },
        {
          scale: 1.055,
          opacity: 1,
          duration: 0.38,
          yoyo: true,
          repeat: 1,
          ease: "power2.inOut",
          transformOrigin: "50% 50%",
        },
      );
    },
    { scope: rootRef, dependencies: [pulseKey, reducedMotion] },
  );

  return (
    <div
      ref={rootRef}
      aria-hidden="true"
      className={cn("magic-rings", className)}
      data-motion={reducedMotion ? "static" : "animated"}
      data-pulse-key={pulseKey}
      data-testid="magic-rings"
    >
      <svg viewBox="0 0 500 500">
        <defs>
          <radialGradient id="magic-ring-glow">
            <stop offset="0%" stopColor="#c084fc" stopOpacity="0.72" />
            <stop offset="100%" stopColor="#a855f7" stopOpacity="0.08" />
          </radialGradient>
        </defs>
        {RINGS.map((ring, index) => (
          <ellipse
            key={`${ring.rx}-${ring.ry}`}
            cx="250"
            cy="250"
            data-ring
            data-testid="magic-ring"
            fill="none"
            rx={ring.rx}
            ry={ring.ry}
            stroke="url(#magic-ring-glow)"
            strokeDasharray={ring.dash}
            strokeWidth={index === 0 ? 1.5 : 1}
          />
        ))}
      </svg>
      <span className="magic-rings__core" />
    </div>
  );
}
