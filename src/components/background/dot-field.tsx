"use client";

import { useEffect, useRef } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

import { computeDotOffset, type DotPoint } from "./dot-field-math";

interface DotFieldProps {
  density?: "normal" | "subtle";
  className?: string;
}

interface AnimatedDot extends DotPoint {
  offsetX: number;
  offsetY: number;
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

    const spacing = density === "subtle" ? 52 : 38;
    const pointer = { x: -10_000, y: -10_000, speed: 0 };
    const dots: AnimatedDot[] = [];
    let animationFrame = 0;
    let previousPointer = { x: pointer.x, y: pointer.y, time: performance.now() };
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
          dots.push({ x, y, offsetX: 0, offsetY: 0 });
        }
      }
    };

    const draw = () => {
      context.clearRect(0, 0, width, height);
      const baseAlpha = density === "subtle" ? 0.13 : 0.22;

      for (const dot of dots) {
        const offset = computeDotOffset(dot, pointer, {
          radius: 168,
          maxDisplacement: density === "subtle" ? 11 : 17,
        });

        dot.offsetX += (offset.x - dot.offsetX) * 0.16;
        dot.offsetY += (offset.y - dot.offsetY) * 0.16;

        const radius = 1.05 + offset.intensity * 0.7;
        context.beginPath();
        context.fillStyle = `rgba(176, 112, 255, ${
          baseAlpha + offset.intensity * 0.34
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

      pointer.speed *= 0.9;
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
      pointer.speed = Math.max(0.28, Math.min(1, (distance / elapsed) * 0.7));
      previousPointer = { x: event.clientX, y: event.clientY, time: now };
    };

    const handlePointerLeave = () => {
      pointer.x = -10_000;
      pointer.y = -10_000;
      pointer.speed = 0;
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
