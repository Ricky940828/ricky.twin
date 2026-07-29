"use client";

import { gsap } from "gsap";
import {
  type PointerEvent as ReactPointerEvent,
  useRef,
  useState,
} from "react";

interface LanyardBadgeProps {
  onOpenIdentity: () => void;
  className?: string;
}

interface DragState {
  pointerId: number;
  startX: number;
  startY: number;
  x: number;
  y: number;
  moved: number;
}

const DRAG_LIMIT = {
  minX: -78,
  maxX: 78,
  minY: -52,
  maxY: 92,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function LanyardBadge({
  onOpenIdentity,
  className,
}: LanyardBadgeProps) {
  const badgeRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const [dragging, setDragging] = useState(false);

  const moveBadge = (x: number, y: number) => {
    if (!badgeRef.current) {
      return;
    }

    gsap.set(badgeRef.current, {
      x,
      y,
      rotation: x * 0.075,
      transformOrigin: "50% -36px",
      force3D: true,
    });
  };

  const returnToRest = () => {
    if (!badgeRef.current) {
      return;
    }

    gsap.killTweensOf(badgeRef.current);
    gsap.to(badgeRef.current, {
      x: 0,
      y: 0,
      rotation: 0,
      duration: 0.72,
      ease: "elastic.out(1, 0.46)",
      overwrite: true,
    });
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    gsap.killTweensOf(event.currentTarget);
    event.currentTarget.setPointerCapture?.(event.pointerId);
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      x: 0,
      y: 0,
      moved: 0,
    };
    setDragging(true);
  };

  const handlePointerMove = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    const deltaX = event.clientX - drag.startX;
    const deltaY = event.clientY - drag.startY;
    drag.x = clamp(deltaX, DRAG_LIMIT.minX, DRAG_LIMIT.maxX);
    drag.y = clamp(deltaY, DRAG_LIMIT.minY, DRAG_LIMIT.maxY);
    drag.moved = Math.max(drag.moved, Math.hypot(deltaX, deltaY));
    moveBadge(drag.x, drag.y);
  };

  const finishDrag = (
    event: ReactPointerEvent<HTMLButtonElement>,
    allowOpen: boolean,
  ) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== event.pointerId) {
      return;
    }

    event.currentTarget.releasePointerCapture?.(event.pointerId);
    dragRef.current = null;
    setDragging(false);
    returnToRest();

    if (allowOpen && drag.moved < 6) {
      suppressClickRef.current = true;
      onOpenIdentity();
    } else if (drag.moved >= 6) {
      suppressClickRef.current = true;
    }
  };

  return (
    <div className={`lanyard-layer ${className ?? ""}`}>
      <span aria-hidden="true" className="lanyard-cord" />
      <button
        ref={badgeRef}
        aria-label="打开 Ricky 数字身份卡"
        className="lanyard-badge"
        data-dragging={dragging ? "true" : "false"}
        onClick={() => {
          if (suppressClickRef.current) {
            suppressClickRef.current = false;
            return;
          }
          onOpenIdentity();
        }}
        onPointerCancel={(event) => finishDrag(event, false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishDrag(event, true)}
        type="button"
      >
        <span className="lanyard-badge__micro">DIGITAL ID</span>
        <strong>李富豪</strong>
        <span className="lanyard-badge__line" />
        <span className="lanyard-badge__hint">拖动 · 轻点查看</span>
      </button>
    </div>
  );
}
