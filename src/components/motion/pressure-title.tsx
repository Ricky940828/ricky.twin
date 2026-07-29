"use client";

import { useGSAP } from "@gsap/react";
import { gsap } from "gsap";
import {
  type PointerEvent as ReactPointerEvent,
  useRef,
} from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

interface PressureTitleProps {
  text: string;
  className?: string;
}

interface LetterPressure {
  scaleX: number;
  translateY: number;
  weight: number;
}

interface LetterSetters {
  scaleX: (value: number) => void;
  y: (value: number) => void;
}

export function getLetterPressure(
  letterPosition: number,
  pointerPosition: number,
): LetterPressure {
  const distance = Math.abs(letterPosition - pointerPosition);
  const influence = Math.max(0, 1 - distance / 0.48) ** 2;

  return {
    scaleX: 1 + influence * 0.3,
    translateY: influence * -10,
    weight: Math.round(420 + influence * 280),
  };
}

export function PressureTitle({ text, className }: PressureTitleProps) {
  const rootRef = useRef<HTMLHeadingElement>(null);
  const letterRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const settersRef = useRef<LetterSetters[]>([]);
  const reducedMotion = usePrefersReducedMotion();

  useGSAP(
    () => {
      if (reducedMotion) {
        return;
      }

      settersRef.current = letterRefs.current.flatMap((letter) => {
        if (!letter) {
          return [];
        }

        gsap.set(letter, {
          transformOrigin: "50% 78%",
          force3D: true,
        });
        return [
          {
            scaleX: gsap.quickTo(letter, "scaleX", {
              duration: 0.42,
              ease: "power3.out",
            }),
            y: gsap.quickTo(letter, "y", {
              duration: 0.42,
              ease: "power3.out",
            }),
          },
        ];
      });
    },
    { scope: rootRef, dependencies: [reducedMotion, text] },
  );

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLHeadingElement>,
  ) => {
    if (reducedMotion) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const pointerPosition = Math.min(
      1,
      Math.max(0, (event.clientX - bounds.left) / Math.max(1, bounds.width)),
    );

    letterRefs.current.forEach((letter, index) => {
      if (!letter) {
        return;
      }
      const pressure = getLetterPressure(
        (index + 0.5) / text.length,
        pointerPosition,
      );
      settersRef.current[index]?.scaleX(pressure.scaleX);
      settersRef.current[index]?.y(pressure.translateY);
      letter.style.fontWeight = String(pressure.weight);
    });
  };

  const resetLetters = () => {
    if (reducedMotion) {
      return;
    }

    gsap.to(letterRefs.current, {
      scaleX: 1,
      y: 0,
      fontWeight: 420,
      duration: 0.56,
      ease: "power3.out",
      stagger: 0.025,
      overwrite: true,
    });
  };

  return (
    <h1
      ref={rootRef}
      aria-label={text}
      className={cn("pressure-title", className)}
      onPointerLeave={resetLetters}
      onPointerMove={handlePointerMove}
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
  );
}
