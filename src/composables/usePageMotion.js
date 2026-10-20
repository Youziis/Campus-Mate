import { nextTick, onUnmounted, watch } from "vue";
import { useRoute } from "vue-router";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

export function usePageMotion(root) {
  const route = useRoute();
  let context;
  let media;
  let frame;

  async function play(includeHeader = false) {
    await nextTick();
    context?.revert();
    media?.revert();
    const page = root.value?.querySelector("[data-page]");
    if (!page) return;

    context = gsap.context(() => {
      media = gsap.matchMedia();
      media.add(
        {
          reduceMotion: "(prefers-reduced-motion: reduce)",
          allowMotion: "(prefers-reduced-motion: no-preference)",
        },
        ({ conditions }) => {
          const items = page.querySelectorAll(".motion-item, .motion-card");
          if (conditions.reduceMotion) {
            if (items.length) gsap.set(items, { clearProps: "all" });
            return;
          }

          const timeline = gsap.timeline({ defaults: { duration: 0.62, ease: "power3.out" } });
          if (includeHeader) timeline.from(".topbar", { autoAlpha: 0, y: -18, duration: 0.5 });
          const motionItems = page.querySelectorAll(".motion-item");
          if (motionItems.length) timeline.from(motionItems, { autoAlpha: 0, y: 24, stagger: 0.08 }, includeHeader ? "-=0.18" : 0);

          const cards = page.querySelectorAll(".motion-card");
          if (cards.length) {
            gsap.set(cards, { autoAlpha: 0, y: 28 });
            ScrollTrigger.batch(cards, {
              start: "top 92%",
              once: true,
              interval: 0.08,
              batchMax: 4,
              onEnter: (batch) => gsap.to(batch, { autoAlpha: 1, y: 0, duration: 0.58, stagger: 0.07, ease: "power3.out", overwrite: true }),
            });
          }

          const floating = page.querySelectorAll(".hero-float");
          if (floating.length) gsap.to(floating, {
            y: (index) => (index % 2 ? -8 : 8),
            rotation: (index) => (index % 2 ? 1.2 : -1.2),
            duration: 2.4,
            stagger: 0.18,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });

          const progress = root.value?.querySelector(".scroll-progress");
          if (progress) gsap.fromTo(progress, { scaleX: 0 }, {
            scaleX: 1,
            ease: "none",
            scrollTrigger: { trigger: page, start: "top top", end: "bottom bottom", scrub: 0.25 },
          });
        },
      );
    }, root.value);
    ScrollTrigger.refresh();
  }

  function schedule(includeHeader = false) {
    cancelAnimationFrame(frame);
    frame = requestAnimationFrame(() => play(includeHeader));
  }

  watch(() => route.fullPath, () => schedule());
  onUnmounted(() => {
    cancelAnimationFrame(frame);
    context?.revert();
    media?.revert();
  });

  return { scheduleMotion: schedule };
}
