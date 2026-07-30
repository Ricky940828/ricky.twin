"use client";

import { useGSAP } from "@gsap/react";
import { useRef, useState } from "react";

import { usePrefersReducedMotion } from "@/hooks/use-prefers-reduced-motion";
import {
  ensureGsapPlugins,
  gsap,
  ScrollTrigger,
} from "@/lib/gsap-client";

import {
  CharacterVideo,
  type CharacterScene,
} from "./character-video";
import { IdentityCardDialog } from "./identity-card-dialog";
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

const ROUTE_VIEWBOX = {
  width: 760,
  height: 360,
};

function clamp(value: number, minimum = 0, maximum = 1) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function PersistentCharacter() {
  const stageRef = useRef<HTMLDivElement>(null);
  const floatRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<NarrativeScene>("hero");
  const [scene, setScene] = useState<NarrativeScene>("hero");
  const [identityOpen, setIdentityOpen] = useState(false);
  const reducedMotion = usePrefersReducedMotion();

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
      let loungeExpanded = false;

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
          if (!loungeExpanded) {
            const scale = viewportWidth <= 1050 ? 0.36 : 0.43;
            return {
              x:
                viewportWidth <= 1050
                  ? viewportWidth - STAGE.width * scale - 18
                  : viewportWidth * 0.54,
              y: viewportHeight * 0.22,
              scale,
              autoAlpha: 1,
            };
          }

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
          duration: 0.58,
          ease: "power3.out",
          overwrite: "auto",
          transformOrigin: "0 0",
          force3D: true,
        });
      };

      const updateCareerRoute = (progress: number) => {
        const routeMap =
          document.querySelector<HTMLElement>(".career-route__map");
        const routePath = document.querySelector<SVGPathElement>(
          "[data-career-path='true']",
        );
        if (
          !routeMap ||
          !routePath ||
          typeof routePath.getTotalLength !== "function" ||
          typeof routePath.getPointAtLength !== "function"
        ) {
          return;
        }

        const boundedProgress = clamp(progress);
        const point = routePath.getPointAtLength(
          routePath.getTotalLength() * boundedProgress,
        );
        const bounds = routeMap.getBoundingClientRect();
        const target = sceneTarget("career");
        const scale = Number(target.scale ?? 0.32);
        const x =
          bounds.left +
          (point.x / ROUTE_VIEWBOX.width) * bounds.width -
          STAGE.width * scale * 0.5;
        const y =
          bounds.top +
          (point.y / ROUTE_VIEWBOX.height) * bounds.height -
          STAGE.height * scale * 0.78;

        moveCharacter(
          {
            x,
            y,
            scale,
            autoAlpha: 1,
          },
          true,
        );
      };

      const setNarrativeScene = (
        nextScene: NarrativeScene,
        immediate = false,
      ) => {
        const changed = sceneRef.current !== nextScene;
        let changedLoungePlacement = false;
        if (nextScene === "lounge") {
          const loungeStage = document.querySelector<HTMLElement>(
            ".lounge-stage",
          );
          const nextExpanded =
            (loungeStage?.getBoundingClientRect().top ??
              Number.POSITIVE_INFINITY) <
            window.innerHeight * 0.36;
          changedLoungePlacement = loungeExpanded !== nextExpanded;
          loungeExpanded = nextExpanded;
        }
        if (changed) {
          gsap.killTweensOf(stage);
          sceneRef.current = nextScene;
          setScene(nextScene);
        }

        if (nextScene === "career") {
          const careerTrigger = ScrollTrigger.getById("career-route-pin");
          updateCareerRoute(careerTrigger?.progress ?? 0);
          return;
        }

        if (changed || immediate || changedLoungePlacement) {
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

        if (isVisible(career, 0.28, 0.72)) {
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

      window.addEventListener("scroll", scheduleResolve, { passive: true });
      window.addEventListener("resize", handleResize, { passive: true });
      window.addEventListener("hashchange", scheduleResolve);
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
              <CharacterVideo
                active={scene === characterScene}
                priority={characterScene === "hero"}
                scene={characterScene}
              />
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
        onClose={() => setIdentityOpen(false)}
        open={identityOpen}
      />
    </>
  );
}
