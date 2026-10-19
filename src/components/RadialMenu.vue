<script setup>
import { nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { gsap } from "gsap";
import StudyAssistant from "./StudyAssistant.vue";
import { useCampus } from "../stores/campus";

const store = useCampus();
const router = useRouter();
const wrap = ref(null);
const open = ref(false);
const assistantOpen = ref(false);
let timeline;
let context;

const actions = [
  {
    label: "浏览活动",
    async run() {
      if (router.currentRoute.value.name !== "discover") {
        await router.push({ name: "discover" });
        await nextTick();
      }
      document.querySelector("#activity-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
  },
  {
    label: "发起活动",
    run() {
      if (store.token.value) store.newActivity();
      else store.showAuth.value = true;
    },
  },
  {
    label: "为你推荐",
    run() {
      if (!store.token.value) store.showAuth.value = true;
      else router.push({ name: "recommendations" });
    },
  },
  {
    label: "我的活动",
    run() {
      if (!store.token.value) store.showAuth.value = true;
      else router.push({ name: "my-activities" });
    },
  },
  {
    label: "AI 搭子",
    run() {
      assistantOpen.value = !assistantOpen.value;
    },
  },
];

function menuSpots(count) {
  const compact = window.innerWidth < 720 || window.innerHeight < 760;
  const step = compact ? 50 : 54;
  const base = compact ? 64 : 68;
  return Array.from({ length: count }, (_, index) => ({
    x: -((compact ? 10 : 14) + index * (compact ? 14 : 16)),
    y: -(base + index * step),
  }));
}

function buildTimeline() {
  const root = wrap.value;
  if (!root) return;
  const items = root.querySelectorAll(".radial-item");
  const spots = menuSpots(items.length);
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  timeline?.kill();
  gsap.set(items, { x: 0, y: 0, scale: 0, opacity: 0, transformOrigin: "right center" });
  timeline = gsap.timeline({ paused: true });
  items.forEach((item, index) => {
    const spot = spots[index] || spots[spots.length - 1];
    timeline.to(
      item,
      {
        x: spot.x,
        y: spot.y,
        scale: 1,
        opacity: 1,
        duration: reduce ? 0.2 : 0.6,
        ease: reduce ? "power2.out" : "elastic.out(1, 0.5)",
        easeReverse: true,
      },
      index * 0.05,
    );
  });
  timeline.to(
    ".radial-fab svg",
    {
      rotation: 135,
      duration: reduce ? 0.2 : 0.35,
      ease: reduce ? "power2.out" : "back.out(1.7)",
      easeReverse: true,
    },
    0,
  );
}

function toggle() {
  if (!timeline) return;
  open.value = !open.value;
  if (open.value) timeline.timeScale(1).play();
  else timeline.timeScale(1).reverse();
}

function choose(action) {
  action.run();
  if (open.value) toggle();
}

function onKey(event) {
  if (event.key === "Escape" && open.value) toggle();
}

function onPointerDown(event) {
  if (!open.value || wrap.value?.contains(event.target)) return;
  toggle();
}

onMounted(() => {
  buildTimeline();
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    context = gsap.context(() => {
      gsap.from(".radial-fab", { autoAlpha: 0, scale: 0.55, y: 24, duration: 0.62, delay: 0.35, ease: "back.out(1.8)" });
    }, wrap.value);
  }
  document.addEventListener("keydown", onKey);
  document.addEventListener("pointerdown", onPointerDown);
});

onUnmounted(() => {
  timeline?.kill();
  context?.revert();
  document.removeEventListener("keydown", onKey);
  document.removeEventListener("pointerdown", onPointerDown);
});
</script>

<template>
  <div ref="wrap" class="radial-menu" :class="{ 'is-open': open }">
    <button
      v-for="(action, index) in actions"
      :key="action.label"
      class="radial-item"
      type="button"
      :aria-label="action.label"
      :aria-pressed="index === 4 ? assistantOpen : undefined"
      @click="choose(action)"
    >
      <span>{{ action.label }}</span>
      <i class="radial-icon" aria-hidden="true">
      <svg v-if="index === 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.35-4.35" />
      </svg>
      <svg v-else-if="index === 1" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
      </svg>
      <svg v-else-if="index === 2" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="m12 3 1.6 4.8L18.5 9l-4.9 1.2L12 15l-1.6-4.8L5.5 9l4.9-1.2Z" />
      </svg>
      <svg v-else-if="index === 3" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M8 6h13" />
        <path d="M8 12h13" />
        <path d="M8 18h13" />
        <path d="M3 6h.01" />
        <path d="M3 12h.01" />
        <path d="M3 18h.01" />
      </svg>
      <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M21 15a2 2 0 0 1-2 2H8l-5 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
      </svg>
      </i>
    </button>
    <button class="radial-fab" type="button" :aria-expanded="open" aria-label="打开快捷菜单" @click="toggle">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </svg>
    </button>
    <StudyAssistant v-if="assistantOpen" hide-launcher @close="assistantOpen = false" />
  </div>
</template>

<style scoped>
.radial-menu {
  position: fixed;
  right: clamp(20px, 3vw, 44px);
  bottom: clamp(20px, 3vw, 42px);
  z-index: 55;
  width: 66px;
  height: 66px;
}

.radial-fab,
.radial-item {
  display: flex;
  align-items: center;
  justify-content: center;
}

.radial-fab {
  position: relative;
  z-index: 5;
  width: 66px;
  height: 66px;
  padding: 0;
  color: #fffefa;
  border: 0;
  border-radius: 50%;
  background: var(--cm-brand);
  box-shadow: 0 15px 34px rgba(109, 60, 235, 0.34);
}

.radial-fab svg {
  width: 24px;
  height: 24px;
}

.radial-item {
  position: absolute;
  top: 11px;
  right: 0;
  z-index: 1;
  height: 44px;
  gap: 8px;
  padding: 0 0 0 14px;
  color: var(--cm-ink);
  white-space: nowrap;
  border: 1px solid var(--cm-line);
  border-radius: 999px;
  background: var(--cm-surface);
  box-shadow: 0 10px 24px rgba(37, 24, 63, 0.16);
  opacity: 0;
  pointer-events: none;
  transform-origin: right center;
}

.radial-menu.is-open .radial-item {
  pointer-events: auto;
}

.radial-item span {
  font-size: 13px;
  font-weight: 700;
  line-height: 1;
}

.radial-icon {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  background: var(--cm-surface-muted);
}

.radial-icon svg {
  width: 18px;
  height: 18px;
}

.radial-item:hover,
.radial-item:focus-visible {
  color: var(--cm-brand);
  border-color: var(--cm-brand);
}

@media (max-width: 640px) {
  .radial-menu {
    right: 18px;
    bottom: 18px;
  }
}
</style>
