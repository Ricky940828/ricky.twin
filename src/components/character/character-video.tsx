"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useSyncExternalStore } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import { cn } from "@/lib/cn";

export type CharacterScene = "hero" | "career" | "projects" | "lounge";

interface CharacterVideoProps {
  scene: CharacterScene;
  active: boolean;
  className?: string;
  priority?: boolean;
}

interface CharacterSource {
  src: string;
  type: "video/webm" | "video/quicktime";
}

const SCENE_FILES: Record<
  CharacterScene,
  { stem: string; alt: string }
> = {
  hero: {
    stem: "ricky-hero-idle",
    alt: "Ricky 数字分身首页形象",
  },
  career: {
    stem: "ricky-career-walk",
    alt: "Ricky 数字分身沿职业路线行走",
  },
  projects: {
    stem: "ricky-project-guide",
    alt: "Ricky 数字分身讲解代表项目",
  },
  lounge: {
    stem: "ricky-lounge-welcome",
    alt: "Ricky 数字分身在 AI 会客厅迎宾",
  },
};

const subscribeToUserAgent = () => () => {};
const getBrowserUserAgent = () => window.navigator.userAgent;
const getServerUserAgent = () => "";

function isSafariUserAgent(userAgent: string) {
  return /Safari/i.test(userAgent) && !/Chrome|Chromium|Android/i.test(userAgent);
}

export function getCharacterSources(
  scene: CharacterScene,
  userAgent = "",
): CharacterSource[] {
  const { stem } = SCENE_FILES[scene];
  const webm: CharacterSource = {
    src: `/character/${stem}.webm`,
    type: "video/webm",
  };
  const mov: CharacterSource = {
    src: `/character/${stem}.mov`,
    type: "video/quicktime",
  };

  return isSafariUserAgent(userAgent) ? [mov, webm] : [webm, mov];
}

export function CharacterVideo({
  scene,
  active,
  className,
  priority = false,
}: CharacterVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const reducedMotion = usePrefersReducedMotion();
  const userAgent = useSyncExternalStore(
    subscribeToUserAgent,
    getBrowserUserAgent,
    getServerUserAgent,
  );
  const { stem, alt } = SCENE_FILES[scene];
  const sources = useMemo(
    () => getCharacterSources(scene, userAgent),
    [scene, userAgent],
  );
  const poster = `/character/${stem}-poster.png`;

  useEffect(() => {
    const video = videoRef.current;
    if (!video || reducedMotion) {
      return;
    }

    if (active) {
      video.play()?.catch(() => {
        // The poster remains visible if autoplay is blocked.
      });
      return;
    }

    video.pause();
  }, [active, reducedMotion, sources]);

  if (reducedMotion) {
    return (
      <Image
        alt={alt}
        className={cn("character-media", className)}
        height={1280}
        priority={priority}
        src={poster}
        width={720}
      />
    );
  }

  return (
    <video
      ref={videoRef}
      aria-label={alt}
      className={cn("character-media", className)}
      data-scene={scene}
      data-testid="character-video"
      loop
      muted
      playsInline
      poster={poster}
      preload={active ? "auto" : "metadata"}
    >
      {sources.map((source) => (
        <source key={source.src} src={source.src} type={source.type} />
      ))}
    </video>
  );
}
