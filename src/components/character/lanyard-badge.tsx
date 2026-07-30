"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

interface LanyardBadgeProps {
  onOpenIdentity: () => void;
  className?: string;
}

interface DragState {
  pointerId: number;
  offsetX: number;
  offsetY: number;
  downX: number;
  downY: number;
  moved: number;
}

interface BadgeBody {
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  angle: number;
  angularVelocity: number;
  dragging: boolean;
}

const STAGE = { width: 360, height: 640 };
const BADGE = { width: 62, height: 86 };
const REST = { x: 180, y: 350 };
const ANCHORS = [
  { x: 153, y: 246 },
  { x: 207, y: 246 },
] as const;
const INITIAL_BODY: BadgeBody = {
  ...REST,
  velocityX: 0,
  velocityY: 0,
  angle: 0,
  angularVelocity: 0,
  dragging: false,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(maximum, Math.max(minimum, value));
}

function attachment(body: BadgeBody, localX: number) {
  const radians = (body.angle * Math.PI) / 180;
  const localY = -BADGE.height / 2 + 7;
  return {
    x:
      body.x +
      localX * Math.cos(radians) -
      localY * Math.sin(radians),
    y:
      body.y +
      localX * Math.sin(radians) +
      localY * Math.cos(radians),
  };
}

function cordPath(
  anchor: { x: number; y: number },
  end: { x: number; y: number },
  side: -1 | 1,
) {
  const distance = Math.hypot(end.x - anchor.x, end.y - anchor.y);
  const slack = clamp(distance * 0.11, 7, 30);
  return `M ${anchor.x} ${anchor.y} C ${anchor.x + side * 7} ${anchor.y + 27}, ${end.x - side * (9 + slack * 0.22)} ${end.y - Math.max(18, slack)}, ${end.x} ${end.y}`;
}

export function LanyardBadge({
  onOpenIdentity,
  className,
}: LanyardBadgeProps) {
  const layerRef = useRef<HTMLDivElement>(null);
  const badgeRef = useRef<HTMLButtonElement>(null);
  const leftCordRef = useRef<SVGPathElement>(null);
  const rightCordRef = useRef<SVGPathElement>(null);
  const leftShadowRef = useRef<SVGPathElement>(null);
  const rightShadowRef = useRef<SVGPathElement>(null);
  const leftHighlightRef = useRef<SVGPathElement>(null);
  const rightHighlightRef = useRef<SVGPathElement>(null);
  const dragRef = useRef<DragState | null>(null);
  const suppressClickRef = useRef(false);
  const targetRef = useRef({ ...REST });
  const bodyRef = useRef<BadgeBody>({ ...INITIAL_BODY });
  const [dragging, setDragging] = useState(false);

  const renderBadge = useCallback(() => {
    const badge = badgeRef.current;
    const body = bodyRef.current;
    if (!badge) {
      return;
    }

    badge.style.transform = `translate3d(${body.x - BADGE.width / 2}px, ${body.y - BADGE.height / 2}px, 0) rotate(${body.angle}deg)`;
    const leftPath = cordPath(
      ANCHORS[0],
      attachment(body, -20),
      -1,
    );
    const rightPath = cordPath(
      ANCHORS[1],
      attachment(body, 20),
      1,
    );
    leftCordRef.current?.setAttribute("d", leftPath);
    rightCordRef.current?.setAttribute("d", rightPath);
    leftShadowRef.current?.setAttribute("d", leftPath);
    rightShadowRef.current?.setAttribute("d", rightPath);
    leftHighlightRef.current?.setAttribute("d", leftPath);
    rightHighlightRef.current?.setAttribute("d", rightPath);
  }, []);

  useEffect(() => {
    let animationFrame = 0;
    let lastFrame = performance.now();

    const animate = (now: number) => {
      const body = bodyRef.current;
      const delta = clamp((now - lastFrame) / 1000, 0.001, 0.032);
      lastFrame = now;

      if (body.dragging) {
        const follow = 1 - Math.exp(-36 * delta);
        const oldX = body.x;
        const oldY = body.y;
        body.x += (targetRef.current.x - body.x) * follow;
        body.y += (targetRef.current.y - body.y) * follow;
        body.velocityX = (body.x - oldX) / delta;
        body.velocityY = (body.y - oldY) / delta;
        const targetAngle = clamp(
          (body.x - REST.x) * 0.08 + body.velocityX * 0.007,
          -19,
          19,
        );
        body.angle +=
          (targetAngle - body.angle) *
          (1 - Math.exp(-18 * delta));
      } else {
        const accelerationX =
          (REST.x - body.x) * 25 - body.velocityX * 6.3;
        const accelerationY =
          (REST.y - body.y) * 30 - body.velocityY * 6.8;
        body.velocityX += accelerationX * delta;
        body.velocityY += accelerationY * delta;
        body.x += body.velocityX * delta;
        body.y += body.velocityY * delta;

        const targetAngle = clamp(
          (body.x - REST.x) * 0.11 + body.velocityX * 0.013,
          -18,
          18,
        );
        body.angularVelocity +=
          (targetAngle - body.angle) * 22 * delta;
        body.angularVelocity *= Math.exp(-7 * delta);
        body.angle += body.angularVelocity * delta * 8;
      }

      renderBadge();
      animationFrame = window.requestAnimationFrame(animate);
    };

    renderBadge();
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [renderBadge]);

  const toStagePoint = (event: ReactPointerEvent) => {
    const bounds =
      layerRef.current?.closest(".persistent-character")
        ?.getBoundingClientRect() ??
      layerRef.current?.getBoundingClientRect();
    if (!bounds || bounds.width <= 0 || bounds.height <= 0) {
      return { x: event.clientX, y: event.clientY };
    }
    return {
      x: ((event.clientX - bounds.left) * STAGE.width) / bounds.width,
      y:
        ((event.clientY - bounds.top) * STAGE.height) /
        bounds.height,
    };
  };

  const handlePointerDown = (
    event: ReactPointerEvent<HTMLButtonElement>,
  ) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture?.(event.pointerId);
    const point = toStagePoint(event);
    const body = bodyRef.current;
    body.dragging = true;
    targetRef.current = { x: body.x, y: body.y };
    dragRef.current = {
      pointerId: event.pointerId,
      offsetX: point.x - body.x,
      offsetY: point.y - body.y,
      downX: point.x,
      downY: point.y,
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

    const point = toStagePoint(event);
    drag.moved = Math.max(
      drag.moved,
      Math.hypot(point.x - drag.downX, point.y - drag.downY),
    );
    let x = clamp(point.x - drag.offsetX, 52, 308);
    let y = clamp(point.y - drag.offsetY, 286, 505);

    const deltaX = x - REST.x;
    const deltaY = y - BADGE.height / 2 + 7 - ANCHORS[0].y;
    const distance = Math.hypot(deltaX, deltaY);
    if (distance > 250) {
      const scale = 250 / distance;
      x = REST.x + deltaX * scale;
      y =
        ANCHORS[0].y +
        deltaY * scale +
        BADGE.height / 2 -
        7;
    }
    targetRef.current = { x, y };
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
    bodyRef.current.dragging = false;
    bodyRef.current.velocityX *= 0.45;
    bodyRef.current.velocityY *= 0.32;
    setDragging(false);

    suppressClickRef.current = true;
    if (allowOpen && drag.moved < 7) {
      onOpenIdentity();
    }
  };

  const initialLeftPath = cordPath(
    ANCHORS[0],
    attachment(INITIAL_BODY, -20),
    -1,
  );
  const initialRightPath = cordPath(
    ANCHORS[1],
    attachment(INITIAL_BODY, 20),
    1,
  );

  return (
    <div
      ref={layerRef}
      className={`lanyard-layer ${className ?? ""}`}
    >
      <svg
        aria-hidden="true"
        className="lanyard-neck-loop"
        preserveAspectRatio="none"
        viewBox="0 0 360 640"
      >
        <defs>
          <linearGradient
            id="ricky-lanyard-gradient"
            x1="0"
            x2="0"
            y1="0"
            y2="1"
          >
            <stop offset="0" stopColor="#2f1b38" />
            <stop offset="0.42" stopColor="#704582" />
            <stop offset="0.66" stopColor="#9b70aa" />
            <stop offset="1" stopColor="#4a2b55" />
          </linearGradient>
          <linearGradient
            id="ricky-lanyard-anchor-gradient"
            x1="0"
            x2="1"
            y1="0"
            y2="1"
          >
            <stop offset="0" stopColor="#d7c3dd" />
            <stop offset="0.45" stopColor="#7e5d8a" />
            <stop offset="1" stopColor="#35253e" />
          </linearGradient>
        </defs>
        <rect
          className="lanyard-anchor"
          height="11"
          rx="3"
          transform="rotate(8 151 245)"
          width="5"
          x="149"
          y="240"
        />
        <rect
          className="lanyard-anchor"
          height="11"
          rx="3"
          transform="rotate(-8 209 245)"
          width="5"
          x="206"
          y="240"
        />
        <path
          ref={leftShadowRef}
          className="lanyard-rope-shadow"
          d={initialLeftPath}
        />
        <path
          ref={rightShadowRef}
          className="lanyard-rope-shadow"
          d={initialRightPath}
        />
        <path
          ref={leftCordRef}
          data-lanyard-cord="left"
          className="lanyard-rope"
          d={initialLeftPath}
        />
        <path
          ref={rightCordRef}
          data-lanyard-cord="right"
          className="lanyard-rope"
          d={initialRightPath}
        />
        <path
          ref={leftHighlightRef}
          className="lanyard-rope-highlight"
          d={initialLeftPath}
        />
        <path
          ref={rightHighlightRef}
          className="lanyard-rope-highlight"
          d={initialRightPath}
        />
      </svg>

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
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            onOpenIdentity();
          }
        }}
        onPointerCancel={(event) => finishDrag(event, false)}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={(event) => finishDrag(event, true)}
        style={{
          transform: `translate3d(${REST.x - BADGE.width / 2}px, ${REST.y - BADGE.height / 2}px, 0)`,
        }}
        type="button"
      >
        <span aria-hidden="true" className="lanyard-badge__grip" />
        <span className="lanyard-badge__micro">DIGITAL ID</span>
        <span aria-hidden="true" className="lanyard-badge__portrait">
          R
        </span>
        <strong>李富豪</strong>
        <span className="lanyard-badge__line" />
      </button>
    </div>
  );
}
