import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  CharacterVideo,
  getCharacterSources,
} from "./character-video";

function mockReducedMotion(matches: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches,
      media: "(prefers-reduced-motion: reduce)",
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  );
}

describe("CharacterVideo", () => {
  beforeEach(() => {
    mockReducedMotion(false);
    vi.spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(() => {});
  });

  it("uses a static poster when reduced motion is requested", async () => {
    mockReducedMotion(true);
    render(<CharacterVideo active scene="hero" />);

    expect(
      await screen.findByRole("img", { name: "Ricky 数字分身首页形象" }),
    ).toHaveAttribute(
      "src",
      expect.stringContaining("ricky-hero-idle-poster.png"),
    );
    expect(screen.queryByTestId("character-video")).not.toBeInTheDocument();
  });

  it("pauses inactive video and plays active muted inline video", async () => {
    const { rerender } = render(
      <CharacterVideo active={false} scene="projects" />,
    );

    expect(HTMLMediaElement.prototype.pause).toHaveBeenCalled();

    rerender(<CharacterVideo active scene="projects" />);
    const video = screen.getByTestId("character-video") as HTMLVideoElement;

    await waitFor(() => {
      expect(HTMLMediaElement.prototype.play).toHaveBeenCalled();
    });
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.playsInline).toBe(true);
  });

  it("prefers MOV on Safari and WebM elsewhere", () => {
    const safari =
      "Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15";
    const chrome =
      "Mozilla/5.0 AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36";

    expect(getCharacterSources("career", safari)[0].src).toMatch(/\.mov$/);
    expect(getCharacterSources("career", chrome)[0].src).toMatch(/\.webm$/);
  });
});
