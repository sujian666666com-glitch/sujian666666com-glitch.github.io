import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const prefersMotionQuery = "(prefers-reduced-motion: no-preference)";
const revealSelector = '[data-motion="reveal"]';
const heroSelector = '[data-motion="hero"]';

function motionTargets<T extends Element>(selector: string): T[] {
  return gsap.utils.toArray<T>(selector);
}

function initializeSiteMotion() {
  if (document.documentElement.dataset.siteMotion === "ready") return;
  document.documentElement.dataset.siteMotion = "ready";

  const media = gsap.matchMedia();

  media.add(prefersMotionQuery, () => {
    const createdTriggers: ScrollTrigger[] = [];

    const heroTargets = motionTargets<HTMLElement>(heroSelector).filter((target) => {
      return target.offsetParent !== null;
    });

    if (heroTargets.length > 0) {
      gsap
        .timeline({
          defaults: {
            clearProps: "transform,opacity,visibility",
            duration: 0.46,
            ease: "power2.out",
            overwrite: "auto",
          },
        })
        .fromTo(
          heroTargets,
          {
            autoAlpha: 0,
            y: 12,
          },
          {
            autoAlpha: 1,
            y: 0,
            stagger: {
              each: 0.06,
              from: "start",
            },
          },
        );
    }

    const revealTargets = motionTargets<HTMLElement>(revealSelector).filter(
      (target) => !heroTargets.includes(target),
    );
    const batchMax = gsap.utils.clamp(3, 8);

    if (revealTargets.length > 0) {
      gsap.set(revealTargets, {
        autoAlpha: 0,
        y: 18,
      });

      createdTriggers.push(
        ...ScrollTrigger.batch(revealTargets, {
          start: "top 88%",
          once: true,
          interval: 0.08,
          batchMax: () => batchMax(Math.ceil(window.innerWidth / 180)),
          onEnter: (batch) => {
            gsap.to(batch, {
              autoAlpha: 1,
              y: 0,
              duration: 0.5,
              ease: "power2.out",
              stagger: {
                each: 0.055,
                from: "start",
              },
              clearProps: "transform,opacity,visibility",
            });
          },
        }),
      );
    }

    return () => {
      createdTriggers.forEach((trigger) => trigger.kill());
    };
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeSiteMotion, { once: true });
} else {
  initializeSiteMotion();
}
