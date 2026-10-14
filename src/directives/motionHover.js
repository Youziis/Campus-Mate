import { gsap } from "gsap";

export const motionHover = {
  mounted(element) {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const enter = () => gsap.to(element, { y: -6, scale: 1.012, duration: 0.28, ease: "power2.out", overwrite: "auto" });
    const leave = () => gsap.to(element, { y: 0, scale: 1, duration: 0.32, ease: "power3.out", overwrite: "auto" });
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    element.__cmMotionCleanup = () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(element);
    };
  },
  unmounted(element) {
    element.__cmMotionCleanup?.();
  },
};
