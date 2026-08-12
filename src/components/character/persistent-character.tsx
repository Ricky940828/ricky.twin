"use client";

import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import type { IdentityCardContent } from "@/content/types";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  ensureGsapPlugins,
  gsap,
  ScrollTrigger,
} from "@/lib/gsap-client";
import {
  CAREER_PROGRESS_EVENT,
  type CareerProgressDetail,
} from "@/lib/career-progress";
import { DIRECT_NAVIGATION_EVENT } from "@/lib/direct-navigation";

import {
  CharacterVideo,
  type CharacterScene,
} from "./character-video";
import { IdentityCardDialog } from "./identity-card-dialog";
import type { IdentityCardFace } from "./identity-card-dialog";
import { LanyardBadge } from "./lanyard-badge";

type NarrativeScene = CharacterScene | "hidden";

const SCENES: CharacterScene[] = [
  "hero",
  "career",
  "projects",
  "lounge",
];

const STAGE = {
  width: 360,
  height: 640,
};

const CHARACTER_MOTION = {
  sceneDuration: 0.92,
  careerEntranceDuration: 0.3,
  careerFollowDuration: 0.3,
  careerEntranceMinimumFollow: 0.16,
} as const;

const CAREER_CHARACTER_ANCHOR = {
  x: 0.5,
  feetY: 0.92,
} as const;

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export interface IdentityCardPreviewRequest {
  face: IdentityCardFace;
  requestId: number;
}

export function PersistentCharacter({
  identityCard,
  identityPreview,
}: {
  identityCard?: IdentityCardContent;
  identityPreview?: IdentityCardPreviewRequest | null;
}) {
  const stageRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<NarrativeScene>("hero");
  const [scene, setScene] = useState<NarrativeScene>("hero");
  const [identityOpen, setIdentityOpen] = useState(false);
  const [dismissedPreviewRequestId, setDismissedPreviewRequestId] =
    useState<number | null>(null);
  const reducedMotion = usePrefersReducedMotion();
  const identityDialogOpen = identityPreview
    ? dismissedPreviewRequestId !== identityPreview.requestId
    : identityPreview === null
      ? false
      : identityOpen;

  useGSAP(
    () => {
      const stage = stageRef.current;
      const float = floatRef.current;
      if (!stage || !float) {
        return;
      }

      const hasRealViewport =
        window.matchMedia("(min-width: 701px)").matches ||
        window.matchMedia("(max-width: 700px)").matches;
      if (!hasRealViewport) {
        stage.style.opacity = "1";
        return;
      }

      ensureGsapPlugins();
      let careerEntranceUntil = 0;
      let careerProgress = Number(
        document.documentElement.dataset.careerProgress ?? 0,
      );

      const sceneTarget = (nextScene: NarrativeScene) => {
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        if (nextScene === "hero") {
          const scale =
            viewportWidth <= 700
              ? 0.54
              : viewportWidth <= 1050
                ? 0.79
                : viewportWidth >= 1500
                  ? 1.05
                  : 0.94;
          return {
            x:
              viewportWidth -
              STAGE.width * scale -
              Math.max(18, viewportWidth * 0.045),
            y:
              viewportWidth <= 700
                ? 620
                : Math.max(58, viewportHeight * 0.075),
            scale,
            autoAlpha: 1,
          };
        }

        if (nextScene === "projects") {
          const scale = viewportWidth <= 1050 ? 0.36 : 0.43;
          return {
            x:
              viewportWidth -
              STAGE.width * scale -
              Math.max(18, viewportWidth * 0.018),
            y: viewportHeight * 0.26,
            scale,
            autoAlpha: 1,
          };
        }

        if (nextScene === "lounge") {
          const scale = viewportWidth <= 1050 ? 0.48 : 0.84;
          return {
            x:
              viewportWidth <= 1050
                ? viewportWidth - STAGE.width * scale - 18
                : viewportWidth * 0.052,
            y:
              viewportWidth <= 1050
                ? viewportHeight * 0.17
                : viewportHeight * 0.15,
            scale,
            autoAlpha: 1,
          };
        }

        if (nextScene === "career") {
          return {
            scale: viewportWidth <= 1050 ? 0.27 : 0.32,
            autoAlpha: 1,
          };
        }

        return { autoAlpha: 0 };
      };

      const moveCharacter = (
        target: gsap.TweenVars,
        immediate = false,
        duration: number = CHARACTER_MOTION.sceneDuration,
        ease: string = "power2.inOut",
      ) => {
        if (immediate || reducedMotion) {
          gsap.set(stage, {
            ...target,
            transformOrigin: "0 0",
            force3D: true,
          });
          return;
        }

        gsap.to(stage, {
          ...target,
          duration,
          ease,
          overwrite: "auto",
          transformOrigin: "0 0",
          force3D: true,
        });
      };

      const getCareerRouteScreenPoint = (progress: number) => {
        const routePath = document.querySelector<SVGPathElement>(
          "[data-career-path='true']",
        );
        if (
          !routePath ||
          typeof routePath.getTotalLength !== "function" ||
          typeof routePath.getPointAtLength !== "function"
        ) {
          return null;
        }

        const point = routePath.getPointAtLength(
          routePath.getTotalLength() * clamp(progress),
        );
        const screenMatrix = routePath.getScreenCTM();
        if (!screenMatrix) {
          return null;
        }

        return {
          x:
            screenMatrix.a * point.x +
            screenMatrix.c * point.y +
            screenMatrix.e,
          y:
            screenMatrix.b * point.x +
            screenMatrix.d * point.y +
            screenMatrix.f,
        };
      };

      const updateCareerRoute = (
        progress: number,
        immediate = true,
        duration: number = CHARACTER_MOTION.careerFollowDuration,
        ease: string = "power2.out",
      ) => {
        const screenPoint = getCareerRouteScreenPoint(progress);
        if (!screenPoint) {
          return;
        }
        const target = sceneTarget("career");
        const scale = Number(target.scale ?? 0.32);
        const x =
          screenPoint.x -
          STAGE.width * scale * CAREER_CHARACTER_ANCHOR.x;
        const visibleFootY = Math.min(
          screenPoint.y,
          window.innerHeight - 28,
        );
        const routeY =
          visibleFootY -
          STAGE.height * scale * CAREER_CHARACTER_ANCHOR.feetY;
        const y = Math.max(64, routeY);

        moveCharacter(
          {
            x,
            y,
            scale,
            autoAlpha: 1,
          },
          immediate,
          duration,
          ease,
        );
      };

      const setNarrativeScene = (
        nextScene: NarrativeScene,
        immediate = false,
      ) => {
        const changed = sceneRef.current !== nextScene;
        if (changed) {
          gsap.killTweensOf(stage);
          careerEntranceUntil =
            nextScene === "career" && !immediate && !reducedMotion
              ? performance.now() +
                CHARACTER_MOTION.careerEntranceDuration * 1000
              : 0;
          sceneRef.current = nextScene;
          setScene(nextScene);
        }

        if (nextScene === "career") {
          const entranceRemaining = Math.max(
            0,
            careerEntranceUntil - performance.now(),
          );
          updateCareerRoute(
            careerProgress,
            immediate,
            changed
              ? CHARACTER_MOTION.careerEntranceDuration
              : entranceRemaining > 0
                ? Math.max(
                    CHARACTER_MOTION.careerEntranceMinimumFollow,
                    entranceRemaining / 1000,
                  )
                : CHARACTER_MOTION.careerFollowDuration,
            changed || entranceRemaining > 0
              ? "power2.inOut"
              : "power2.out",
          );
          return;
        }

        if (changed || immediate) {
          moveCharacter(sceneTarget(nextScene), immediate);
        }
      };

      const isVisible = (
        element: HTMLElement | null,
        topRatio: number,
        bottomRatio: number,
      ) => {
        if (!element) {
          return false;
        }
        const bounds = element.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        return (
          bounds.top < viewportHeight * topRatio &&
          bounds.bottom > viewportHeight * bottomRatio
        );
      };

      const resolveScene = (immediate = false) => {
        const career = document.getElementById("career");
        const projects = document.getElementById("projects");
        const practice = document.getElementById("practice");
        const lounge = document.getElementById("lounge");

        if (window.innerWidth <= 700) {
          const careerTop =
            career?.getBoundingClientRect().top ??
            Number.POSITIVE_INFINITY;
          setNarrativeScene(
            careerTop > window.innerHeight * 0.28 ? "hero" : "hidden",
            immediate,
          );
          return;
        }

        const careerRoutePoint = getCareerRouteScreenPoint(careerProgress);
        const careerRouteMap = document.querySelector<HTMLElement>(
          ".career-route__map",
        );
        const careerRouteBounds = careerRouteMap?.getBoundingClientRect();
        const careerRouteReady =
          Boolean(careerRoutePoint && careerRouteBounds) &&
          careerRoutePoint!.y >= 40 &&
          careerRoutePoint!.y <= window.innerHeight * 0.9 &&
          careerRouteBounds!.bottom > 84 &&
          careerRouteBounds!.top < window.innerHeight * 0.9;

        const careerNarrativeVisible = isVisible(career, 0.28, 0.72);

        if (careerNarrativeVisible || careerRouteReady) {
          setNarrativeScene("career", immediate);
        } else if (
          isVisible(projects, 0.72, 0.25) ||
          isVisible(practice, 0.72, 0.25)
        ) {
          setNarrativeScene("projects", immediate);
        } else if (isVisible(lounge, 0.72, 0.18)) {
          setNarrativeScene("lounge", immediate);
        } else {
          const careerTop =
            career?.getBoundingClientRect().top ??
            Number.POSITIVE_INFINITY;
          setNarrativeScene(
            careerTop > window.innerHeight * 0.28 ? "hero" : "hidden",
            immediate,
          );
        }
      };

      let animationFrame = 0;
      const scheduleResolve = () => {
        if (animationFrame) {
          return;
        }
        animationFrame = window.requestAnimationFrame(() => {
          animationFrame = 0;
          resolveScene(false);
        });
      };

      const sceneScroll = ScrollTrigger.create({
        start: 0,
        end: "max",
        invalidateOnRefresh: true,
        onUpdate: scheduleResolve,
      });

      const moveX = gsap.quickTo(float, "x", {
        duration: 0.55,
        ease: "power3.out",
      });
      const moveY = gsap.quickTo(float, "y", {
        duration: 0.55,
        ease: "power3.out",
      });
      const rotate = gsap.quickTo(float, "rotation", {
        duration: 0.65,
        ease: "power3.out",
      });
      const handlePointerMove = (event: PointerEvent) => {
        if (
          reducedMotion ||
          sceneRef.current === "career" ||
          sceneRef.current === "hidden" ||
          (event.target instanceof Element &&
            event.target.closest(".lanyard-layer"))
        ) {
          return;
        }
        const normalizedX = event.clientX / window.innerWidth - 0.5;
        const normalizedY = event.clientY / window.innerHeight - 0.5;
        moveX(normalizedX * 9);
        moveY(normalizedY * 7);
        rotate(normalizedX * 0.8);
      };
      const resetPointer = () => {
        moveX(0);
        moveY(0);
        rotate(0);
      };
      const handleResize = () => resolveScene(true);
      const handleDirectNavigation = () => {
        if (animationFrame) {
          window.cancelAnimationFrame(animationFrame);
          animationFrame = 0;
        }
        resolveScene(true);
      };
      const handleCareerProgress = (event: Event) => {
        careerProgress = clamp(
          (event as CustomEvent<CareerProgressDetail>).detail?.progress ??
            0,
        );
        if (sceneRef.current === "career") {
          const entranceRemaining = Math.max(
            0,
            careerEntranceUntil - performance.now(),
          );
          updateCareerRoute(
            careerProgress,
            false,
            entranceRemaining > 0
              ? Math.max(
                  CHARACTER_MOTION.careerEntranceMinimumFollow,
                  entranceRemaining / 1000,
                )
              : CHARACTER_MOTION.careerFollowDuration,
            entranceRemaining > 0 ? "power2.inOut" : "power2.out",
          );
        }
      };

      window.addEventListener("scroll", scheduleResolve, { passive: true });
      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("hashchange", scheduleResolve);
      window.addEventListener(
        DIRECT_NAVIGATION_EVENT,
        handleDirectNavigation,
      );
      window.addEventListener(
        CAREER_PROGRESS_EVENT,
        handleCareerProgress,
      );
      window.addEventListener("pointermove", handlePointerMove, {
        passive: true,
      });
      document.documentElement.addEventListener(
        "pointerleave",
        resetPointer,
      );

      resolveScene(true);
      const refreshFrame = window.requestAnimationFrame(() => {
        ScrollTrigger.refresh();
        resolveScene(true);
      });

      return () => {
        sceneScroll.kill();
        window.cancelAnimationFrame(animationFrame);
        window.cancelAnimationFrame(refreshFrame);
        window.removeEventListener("scroll", scheduleResolve);
        window.removeEventListener("resize", handleResize);
        window.removeEventListener("hashchange", scheduleResolve);
        window.removeEventListener(
          DIRECT_NAVIGATION_EVENT,
          handleDirectNavigation,
        );
        window.removeEventListener(
          CAREER_PROGRESS_EVENT,
          handleCareerProgress,
        );
        window.removeEventListener("pointermove", handlePointerMove);
        document.documentElement.removeEventListener(
          "pointerleave",
          resetPointer,
        );
      };
    },
    {
      dependencies: [reducedMotion],
    },
  );

  const badgeVisible = scene === "hero" || scene === "lounge";

  return (
    <>
      <div
        ref={stageRef}
        aria-label="李富豪的软质 3D 数字形象"
        className="persistent-character"
        data-scene={scene}
        data-testid="persistent-character"
      >
        <div ref={floatRef} className="persistent-character__float">
          <span aria-hidden="true" className="persistent-character__shadow" />
          {SCENES.map((characterScene) => (
            <div
              key={characterScene}
              className="persistent-character__scene"
              data-active={scene === characterScene ? "true" : "false"}
              data-scene-layer={characterScene}
            >
              {scene === characterScene ? (
                <CharacterVideo
                  active
                  priority={characterScene === "hero"}
                  scene={characterScene}
                />
              ) : null}
            </div>
          ))}
          {badgeVisible ? (
            <LanyardBadge
              className="persistent-character__lanyard"
              onOpenIdentity={() => setIdentityOpen(true)}
            />
          ) : null}
          <span
            aria-hidden="true"
            className="persistent-character__badge-tip"
          >
            可拖动 · 轻点查看身份卡
          </span>
          <span
            aria-hidden="true"
            className="persistent-character__status"
          >
            <i />
            {scene === "lounge" ? "数字会客厅迎宾中" : "项目能力讲解中"}
          </span>
        </div>
      </div>

      <IdentityCardDialog
        content={identityCard}
        faceRequestId={identityPreview?.requestId}
        initialFace={identityPreview?.face}
        onClose={() => {
          if (identityPreview) {
            setDismissedPreviewRequestId(identityPreview.requestId);
          } else {
            setIdentityOpen(false);
          }
        }}
        open={identityDialogOpen}
      />
    </>
  );
}
