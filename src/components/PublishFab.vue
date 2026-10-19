<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { gsap } from "gsap";
import { useCampus } from "../stores/campus";

const button = ref(null);
const store = useCampus();
let context;

onMounted(() => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  context = gsap.context(() => {
    gsap.from(button.value, { autoAlpha: 0, scale: 0.55, y: 24, duration: 0.62, delay: 0.35, ease: "back.out(1.8)" });
    gsap.to(".publish-fab-ring", { scale: 1.35, autoAlpha: 0, duration: 1.8, repeat: -1, ease: "power2.out" });
  }, button.value);
});

onUnmounted(() => context?.revert());

function publish() {
  gsap.fromTo(button.value, { scale: 0.9 }, { scale: 1, duration: 0.42, ease: "back.out(2.6)" });
  if (store.token.value) store.newActivity();
  else store.showAuth.value = true;
}

function hover(active) {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  gsap.to(button.value, { scale: active ? 1.08 : 1, rotation: active ? 4 : 0, duration: 0.28, ease: "power2.out", overwrite: true });
}
</script>

<template>
  <button ref="button" class="publish-fab" type="button" aria-label="发布活动" @click="publish" @pointerenter="hover(true)" @pointerleave="hover(false)">
    <span class="publish-fab-ring" aria-hidden="true"></span>
    <span class="publish-fab-plus" aria-hidden="true">＋</span>
    <span class="publish-fab-tip">发布活动</span>
  </button>
</template>

<style src="../styles/components/publish-fab.css"></style>
