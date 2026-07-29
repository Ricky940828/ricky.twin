import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MagicRings } from "./magic-rings";

describe("MagicRings", () => {
  it("renders five localized rings without mouse-follow handlers", () => {
    render(<MagicRings active pulseKey={0} reducedMotion={false} />);

    const field = screen.getByTestId("magic-rings");
    expect(screen.getAllByTestId("magic-ring")).toHaveLength(5);
    expect(field).toHaveAttribute("data-pulse-key", "0");
    expect(field).toHaveAttribute("data-motion", "animated");
    expect(field).not.toHaveAttribute("onpointermove");
  });

  it("reflects one explicit pulse and provides a static reduced-motion mode", () => {
    const { rerender } = render(
      <MagicRings active pulseKey={0} reducedMotion={false} />,
    );
    rerender(<MagicRings active pulseKey={1} reducedMotion={false} />);
    expect(screen.getByTestId("magic-rings")).toHaveAttribute(
      "data-pulse-key",
      "1",
    );

    rerender(<MagicRings active pulseKey={1} reducedMotion />);
    expect(screen.getByTestId("magic-rings")).toHaveAttribute(
      "data-motion",
      "static",
    );
  });
});
