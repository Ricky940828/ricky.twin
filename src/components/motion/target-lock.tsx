import type {
  ElementType,
  HTMLAttributes,
  PropsWithChildren,
} from "react";

import { cn } from "@/lib/cn";

interface TargetLockProps
  extends PropsWithChildren<HTMLAttributes<HTMLElement>> {
  as?: ElementType;
  active?: boolean;
  "data-testid"?: string;
}

const CORNERS = ["top-left", "top-right", "bottom-right", "bottom-left"];

export function TargetLock({
  as: Component = "div",
  active = false,
  children,
  className,
  "data-testid": testId,
  ...props
}: TargetLockProps) {
  return (
    <Component
      {...props}
      className={cn("target-lock", className)}
      data-active={active ? "true" : "false"}
      data-testid={testId ?? "target-lock"}
      style={{ ...props.style, cursor: "inherit" }}
    >
      {CORNERS.map((corner) => (
        <span
          key={corner}
          aria-hidden="true"
          className="target-lock__corner"
          data-corner={corner}
          data-target-corner
        />
      ))}
      {children}
    </Component>
  );
}
