"use client";

import { useGSAP } from "@gsap/react";
import { useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

interface PressureTitleProps {
  text: string;
  className?: string;
}

interface LetterPressure {
  width: number;
  weight: number;
  hot: boolean;
}

export function getLetterPressure(
  letterPosition: number,
  pointerPosition: number,
): LetterPressure {
  const distance = Math.abs(letterPosition - pointerPosition);
  const influence = Math.max(0, 1 - distance / 0.48);

  return {
    width: Math.round(58 + influence * 90),
    weight: Math.round(220 + influence * 730),
    hot: influence > 0.68,
  };
}

export function PressureTitle({ text, className }: PressureTitleProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      const surface = surfaceRef.current;
      const title = titleRef.current;
      if (!surface || !title) {
        return;
      }

      const initialBounds = surface.getBoundingClientRect();
      const cursor = {
        x: initialBounds.left + initialBounds.width * 0.34,
        y: initialBounds.top + initialBounds.height * 0.5,
      };
      const softCursor = { ...cursor };

      const handlePointerMove = (event: PointerEvent) => {
        cursor.x = event.clientX;
        cursor.y = event.clientY;
      };

      if (reducedMotion) {
        letterRefs.current.forEach((letter) => {
          if (letter) {
            letter.style.fontVariationSettings =
              '"wght" 420, "wdth" 78';
            letter.dataset.hot = "false";
          }
        });
        return;
      }

      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });

      let animationFrame = 0;
      const animate = () => {
        softCursor.x += (cursor.x - softCursor.x) / 13;
        softCursor.y += (cursor.y - softCursor.y) / 13;
        const bounds = surface.getBoundingClientRect();
        const maxDistance = Math.max(260, bounds.width * 0.48);

        letterRefs.current.forEach((letter) => {
          if (!letter) {
            return;
          }
          const letterBounds = letter.getBoundingClientRect();
          const distance = Math.hypot(
            softCursor.x -
              (letterBounds.left + letterBounds.width / 2),
            softCursor.y -
              (letterBounds.top + letterBounds.height / 2),
          );
          const influence = Math.max(
            0,
            Math.min(1, 1 - distance / maxDistance),
          );
          const pressure = getLetterPressure(
            0,
            (1 - influence) * 0.48,
          );
          const axes = `"wght" ${pressure.weight}, "wdth" ${pressure.width}`;
          if (letter.style.fontVariationSettings !== axes) {
            letter.style.fontVariationSettings = axes;
          }
          letter.dataset.hot = pressure.hot ? "true" : "false";
          letter.style.setProperty(
            "--pressure",
            influence.toFixed(3),
          );
        });

        animationFrame = window.requestAnimationFrame(animate);
      };
      animationFrame = window.requestAnimationFrame(animate);

      return () => {
        window.cancelAnimationFrame(animationFrame);
        window.removeEventListener("pointermove", handlePointerMove);
      };
    },
    { scope: surfaceRef, dependencies: [reducedMotion, text] },
  );

  return (
    <div
      ref={surfaceRef}
      className="pressure-title__surface"
      data-pressure-surface
    >
      <h1
        ref={titleRef}
        aria-label={text}
        className={cn("pressure-title", className)}
      >
        {Array.from(text).map((letter, index) => (
          <span
            key={`${letter}-${index}`}
            ref={(node) => {
              letterRefs.current[index] = node;
            }}
            aria-hidden="true"
            data-pressure-letter
          >
            {letter}
          </span>
        ))}
      </h1>
    </div>
  );
}
