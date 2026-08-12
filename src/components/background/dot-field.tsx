"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

import {
  computeDotOffset,
  computePulseDecay,
  type DotPoint,
} from "./dot-field-math";

interface DotFieldProps {
  density?: "normal" | "subtle";
  className?: string;
}

interface AnimatedDot extends DotPoint {
  offsetX: number;
  offsetY: number;
  velocityX: number;
  velocityY: number;
}

interface PointerPulse extends DotPoint {
  createdAt: number;
  strength: number;
}

export function DotField({
  density = "normal",
  className,
}: DotFieldProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reducedMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext("2d");
    if (!context) {
      return;
    }

    const spacing = density === "subtle" ? 34 : 28;
    const pointer = {
      x: -10_000,
      y: -10_000,
      engagement: 0,
      targetEngagement: 0,
    };
    const dots: AnimatedDot[] = [];
    const pulses: PointerPulse[] = [];
    let animationFrame = 0;
    let previousPointer = {
      x: pointer.x,
      y: pointer.y,
      time: performance.now(),
    };
    let lastPulse = 0;
    let width = 0;
    let height = 0;
    let devicePixelRatio = 1;

    const rebuildGrid = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      devicePixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(width * devicePixelRatio);
      canvas.height = Math.floor(height * devicePixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(
        devicePixelRatio,
        0,
        0,
        devicePixelRatio,
        0,
        0,
      );

      dots.length = 0;
      const xOffset = spacing / 2;
      const yOffset = spacing / 2;
      for (let y = yOffset; y < height; y += spacing) {
        for (let x = xOffset; x < width; x += spacing) {
          dots.push({
            x,
            y,
            offsetX: 0,
            offsetY: 0,
            velocityX: 0,
            velocityY: 0,
          });
        }
      }
    };

    const draw = (timestamp = performance.now()) => {
      context.clearRect(0, 0, width, height);
      const baseAlpha = density === "subtle" ? 0.075 : 0.12;
      const waveAmplitude = density === "subtle" ? 1.5 : 2.6;
      const pulseDuration = 1650;
      const time = timestamp / 1000;

      pointer.engagement +=
        (pointer.targetEngagement - pointer.engagement) * 0.13;
      pointer.targetEngagement *= 0.91;
      while (
        pulses.length > 0 &&
        timestamp - pulses[0].createdAt >= pulseDuration
      ) {
        pulses.shift();
      }

      for (const dot of dots) {
        const pointerOffset = computeDotOffset(
          dot,
          {
            x: pointer.x,
            y: pointer.y,
            speed: pointer.engagement,
          },
          {
            radius: 172,
            maxDisplacement: density === "subtle" ? 8 : 13,
          },
        );
        let desiredX =
          Math.cos(dot.y * 0.022 + time * 0.58) *
          waveAmplitude *
          0.48;
        let desiredY =
          Math.sin(dot.x * 0.024 + time * 0.72) * waveAmplitude;
        let intensity = pointerOffset.intensity;
        desiredX += pointerOffset.x;
        desiredY += pointerOffset.y;

        for (const pulse of pulses) {
          const decay = computePulseDecay(
            timestamp - pulse.createdAt,
            pulseDuration,
          );
          if (decay <= 0) {
            continue;
          }
          const pulseOffset = computeDotOffset(
            dot,
            {
              x: pulse.x,
              y: pulse.y,
              speed: pulse.strength * decay,
            },
            {
              radius: 138,
              maxDisplacement: density === "subtle" ? 5 : 9,
            },
          );
          desiredX += pulseOffset.x;
          desiredY += pulseOffset.y;
          intensity = Math.max(intensity, pulseOffset.intensity);
        }

        dot.velocityX += (desiredX - dot.offsetX) * 0.11;
        dot.velocityY += (desiredY - dot.offsetY) * 0.11;
        dot.velocityX *= 0.82;
        dot.velocityY *= 0.82;
        dot.offsetX += dot.velocityX;
        dot.offsetY += dot.velocityY;

        const radius = 0.9 + intensity * 0.85;
        context.beginPath();
        context.fillStyle = `rgba(184, 123, 255, ${
          baseAlpha + intensity * 0.52
        })`;
        context.arc(
          dot.x + dot.offsetX,
          dot.y + dot.offsetY,
          radius,
          0,
          Math.PI * 2,
        );
        context.fill();
      }

      if (!reducedMotion) {
        animationFrame = window.requestAnimationFrame(draw);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      const now = performance.now();
      const elapsed = Math.max(16, now - previousPointer.time);
      const distance = Math.hypot(
        event.clientX - previousPointer.x,
        event.clientY - previousPointer.y,
      );

      pointer.x = event.clientX;
      pointer.y = event.clientY;
      const speed = Math.max(
        0.24,
        Math.min(1, (distance / elapsed) * 0.72),
      );
      pointer.targetEngagement = Math.max(
        pointer.targetEngagement,
        speed,
      );
      if (now - lastPulse >= 42 || distance >= 18) {
        pulses.push({
          x: event.clientX,
          y: event.clientY,
          createdAt: now,
          strength: speed,
        });
        if (pulses.length > 22) {
          pulses.shift();
        }
        lastPulse = now;
      }
      previousPointer = { x: event.clientX, y: event.clientY, time: now };
    };

    const handlePointerLeave = () => {
      pointer.x = -10_000;
      pointer.y = -10_000;
      pointer.targetEngagement = 0;
    };

    rebuildGrid();
    draw();

    if (!reducedMotion) {
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        "pointerleave",
        handlePointerLeave,
      );
    }
    window.addEventListener("resize", rebuildGrid);

    return () => {
      window.cancelAnimationFrame(animationFrame);
      window.removeEventListener("pointermove", handlePointerMove);
      document.documentElement.removeEventListener(
        "pointerleave",
        handlePointerLeave,
      );
      window.removeEventListener("resize", rebuildGrid);
    };
  }, [density, reducedMotion]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className={cn("dot-field", className)}
      data-density={density}
    />
  );
}
