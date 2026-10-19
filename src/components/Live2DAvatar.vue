<script setup>
import { onMounted, onUnmounted, ref } from "vue";
import { gsap } from "gsap";

const props = defineProps({ companionMode: { type: Boolean, default: false } });
const emit = defineEmits(["activate", "menu", "dragstart", "dragmove", "dragend"]);
let dragPointer;
let suppressClickUntil = 0;
const dragging = ref(false);
function startPointer(event) {
  if (!props.companionMode || event.button !== 0) return;
  dragPointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
  event.currentTarget.setPointerCapture(event.pointerId);
}
function movePointer(event) {
  if (!dragPointer || dragPointer.id !== event.pointerId) return;
  const dx = event.clientX - dragPointer.x;
  const dy = event.clientY - dragPointer.y;
  if (!dragging.value && Math.hypot(dx, dy) < 7) return;
  if (!dragging.value) {
    dragging.value = true;
    window.clearTimeout(clickTimer);
    emit("dragstart");
  }
  emit("dragmove", { dx, dy });
}
function endPointer(event) {
  if (!dragPointer || dragPointer.id !== event.pointerId) return;
  if (dragging.value) {
    suppressClickUntil = performance.now() + 400;
    emit("dragend");
  }
  dragPointer = null;
  dragging.value = false;
  if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
}
let clickTimer;
function characterClick(event) {
  if (performance.now() < suppressClickUntil) return;
  if (!props.companionMode) return interact(event);
  window.clearTimeout(clickTimer);
  clickTimer = window.setTimeout(() => { emit("activate"); }, 260);
}
function characterDoubleClick() {
  if (performance.now() < suppressClickUntil) return;
  if (!props.companionMode) return;
  window.clearTimeout(clickTimer);
  emit("menu");
}
defineExpose({ smile, playReaction });

const host = ref(null);
const loading = ref(true);
const error = ref("");
const reaction = ref("");
const expression = { smile: 0 };
const idlePose = { weight: 1 };
let idleTime = 0;
let reactionTimer;
let lastTap = 0;
let lastMotion = -1;
let app;
let model;
let observer;
let disposed = false;

function configureMotion(group, index, motion) {
  if (group === "TapBody") motion.setIsLoop(false);
}

function motionStarted(group) {
  gsap.to(idlePose, {
    weight: group === "Idle" ? 1 : 0,
    duration: .45,
    ease: "power2.inOut",
    overwrite: true,
  });
}

function applyIdlePose() {
  if (!model) return;
  idleTime += Math.min(app.ticker.elapsedMS, 100) / 1000;
  const weight = idlePose.weight;
  if (weight <= 0) return;
  const core = model.internalModel.coreModel;
  const sway = window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ? 0 : Math.sin(idleTime * 1.35) * .65;
  // A is the relaxed arm artwork; B is the bent/raised alternate artwork.
  core.setPartOpacityById("PartArmA", core.getPartOpacityById("PartArmA") * (1 - weight) + weight);
  core.setPartOpacityById("PartArmB", core.getPartOpacityById("PartArmB") * (1 - weight));
  core.setParameterValueById("ParamArmLA", sway, weight);
  core.setParameterValueById("ParamArmRA", -sway * .8, weight);
  core.setParameterValueById("ParamHandL", 0, weight);
  core.setParameterValueById("ParamHandR", 0, weight);
}

// Apply after motion/physics updates so idle curves cannot overwrite the smile.
function applyExpression() {
  if (!model || expression.smile <= 0) return;
  const core = model.internalModel.coreModel;
  const weight = expression.smile;
  for (const [id, value] of Object.entries({
    ParamEyeLSmile: 1, ParamEyeRSmile: 1,
    ParamEyeLOpen: .35, ParamEyeROpen: .35,
    ParamMouthForm: 1, ParamMouthOpenY: .2, ParamCheek: .65,
  })) core.setParameterValueById(id, value, weight);
}

function smile() {
  gsap.killTweensOf(expression);
  gsap.timeline()
    .to(expression, { smile: 1, duration: .3, ease: "power2.out" })
    .to(expression, { smile: 0, duration: .8, delay: 2, ease: "power2.inOut" });
  showReaction("嘿嘿，一起加油吧！");
}

function showReaction(text) {
  window.clearTimeout(reactionTimer);
  reaction.value = text;
  reactionTimer = window.setTimeout(() => { reaction.value = ""; }, 3200);
}

async function playReaction() {
  if (!model) return;
  let index;
  do { index = Math.floor(Math.random() * 4); } while (index === lastMotion);
  lastMotion = index;
  showReaction("我在这里陪你学习～");
  try {
    const played = await model.motion("TapBody", index, 3);
    if (!played && !disposed) smile();
  } catch (cause) {
    console.warn("Live2D interaction motion:", cause);
    if (!disposed) smile();
  }
}

function interact(event) {
  if (!model || loading.value) return;
  const now = performance.now();
  if (now - lastTap < 350) return;
  lastTap = now;
  const rect = host.value.getBoundingClientRect();
  const bounds = model.getBounds();
  const x = (event.clientX - rect.left) * app.screen.width / rect.width;
  const y = (event.clientY - rect.top) * app.screen.height / rect.height;
  if (!bounds.contains(x, y)) return;
  // Hiyori has no named hit areas; use the upper third of its bounds as the head.
  if ((y - bounds.y) / bounds.height < .33) smile();
  else playReaction();
}

function followPointer(event) {
  if (!model || document.hidden || event.pointerType === "touch") return;
  const rect = host.value.getBoundingClientRect();
  model.focus(event.clientX - rect.left, event.clientY - rect.top);
}

function resetFocus() {
  model?.internalModel.focusController.focus(0, 0);
}

// Load Core before importing the Cubism adapter, which reads its global API.
async function loadCore() {
  if (window.Live2DCubismCore) return;
  await new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `${import.meta.env.BASE_URL}vendor/live2dcubismcore.min.js`;
    script.onload = resolve;
    script.onerror = () => { script.remove(); reject(new Error("模型运行库加载失败")); };
    document.head.appendChild(script);
  });
}

function fit() {
  if (!model || !app || !host.value) return;
  const { width, height } = host.value.getBoundingClientRect();
  if (!width || !height) return;
  app.renderer.resize(width, height);
  const bounds = model.internalModel;
  model.scale.set(Math.min(width / bounds.originalWidth, height / bounds.originalHeight) * .96);
  model.anchor.set(.5, 1);
  model.position.set(width / 2, height);
}

function visibilityChanged() {
  if (!app) return;
  if (document.hidden) app.stop();
  else app.start();
}

async function load() {
  loading.value = true;
  error.value = "";
  try {
    await loadCore();
    const PIXI = await import("pixi.js");
    const { Live2DModel } = await import("pixi-live2d-display/cubism4");
    if (disposed) return;
    Live2DModel.registerTicker(PIXI.Ticker);
    app = new PIXI.Application({
      backgroundAlpha: 0,
      antialias: true,
      resolution: Math.min(window.devicePixelRatio || 1, 1.5),
      autoDensity: true,
      width: host.value.clientWidth,
      height: host.value.clientHeight,
    });
    app.ticker.maxFPS = 30;
    host.value.appendChild(app.view);
    const url = `${import.meta.env.BASE_URL}hiyori_vts/hiyori.model3.json`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Model request failed: ${response.status}`);
    const settings = await response.json();
    settings.url = url;
    // VTube Studio's entry omits motions; register the existing idle locally.
    settings.FileReferences.Motions ||= {
      Idle: [{ File: "animations/hiyori_m01.motion3.json", FadeInTime: .8, FadeOutTime: .8 }],
    };
    settings.FileReferences.Motions.TapBody = [7, 8, 9, 10].map((number) => ({
      File: `animations/hiyori_m${String(number).padStart(2, "0")}.motion3.json`,
      FadeInTime: .35, FadeOutTime: .6,
    }));
    const loaded = await Live2DModel.from(settings, { autoInteract: false });
    if (disposed) { loaded.destroy(); return; }
    model = loaded;
    model.internalModel.on("beforeModelUpdate", applyIdlePose);
    model.internalModel.on("beforeModelUpdate", applyExpression);
    model.internalModel.motionManager.on("motionLoaded", configureMotion);
    model.internalModel.motionManager.on("motionStart", motionStarted);
    app.stage.addChild(model);
    fit();
    observer = new ResizeObserver(fit);
    observer.observe(host.value);
    visibilityChanged();
  } catch (cause) {
    if (disposed) return;
    observer?.disconnect();
    app?.destroy(true, { children: true, texture: true, baseTexture: true });
    app = null;
    model = null;
    error.value = "角色加载失败，请重试";
    console.error("Live2D load failed:", cause);
  } finally {
    if (!disposed) loading.value = false;
  }
}

onMounted(() => {
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("pointermove", followPointer, { passive: true });
  document.documentElement.addEventListener("pointerleave", resetFocus);
  load();
});
onUnmounted(() => {
  disposed = true;
  document.removeEventListener("visibilitychange", visibilityChanged);
  window.removeEventListener("pointermove", followPointer);
  document.documentElement.removeEventListener("pointerleave", resetFocus);
  window.clearTimeout(clickTimer);
  window.clearTimeout(reactionTimer);
  gsap.killTweensOf(expression);
  gsap.killTweensOf(idlePose);
  model?.internalModel.off("beforeModelUpdate", applyIdlePose);
  model?.internalModel.off("beforeModelUpdate", applyExpression);
  model?.internalModel.motionManager.off("motionLoaded", configureMotion);
  model?.internalModel.motionManager.off("motionStart", motionStarted);
  observer?.disconnect();
  app?.destroy(true, { children: true, texture: true, baseTexture: true });
  app = null;
  model = null;
});
</script>

<template>
  <div class="live2d-avatar" aria-label="Live2D 学习搭子" @pointerdown.stop>
    <div ref="host" class="live2d-stage" :class="{ dragging, draggable: companionMode }" :role="companionMode ? 'button' : undefined" :tabindex="companionMode ? 0 : undefined" :aria-label="companionMode ? '和学习搭子对话，双击打开功能菜单' : undefined" @pointerdown="startPointer" @pointermove="movePointer" @pointerup="endPointer" @pointercancel="endPointer" @lostpointercapture="endPointer" @click="characterClick" @dblclick="characterDoubleClick" @keydown.enter.prevent="emit('activate')" @keydown.space.prevent="emit('activate')"></div>
    <p v-if="reaction" class="live2d-reaction" role="status">{{ reaction }}</p>
    <div v-if="!companionMode && !loading && !error" class="live2d-actions">
      <button type="button" @click="smile">摸摸头</button>
      <button type="button" @click="playReaction">打个招呼</button>
    </div>
    <div v-if="loading || error" class="live2d-feedback" role="status">
      <span>{{ error || "正在召唤学习搭子…" }}</span>
      <button v-if="error" type="button" @click="load">重新加载</button>
    </div>
  </div>
</template>

<style scoped>
.live2d-avatar { width: 280px; height: 420px; }
.live2d-stage { width: 100%; height: 100%; }
.live2d-stage :deep(canvas) { display: block; }
.live2d-stage { cursor: pointer; }
.live2d-stage.draggable { cursor: grab; touch-action: none; user-select: none; }
.live2d-stage.dragging { cursor: grabbing; }
.live2d-reaction { position: absolute; right: 8px; bottom: 100%; max-width: 250px; margin: 0; padding: 10px 14px; color: var(--cm-ink); font-size: 13px; background: var(--cm-surface); border: 1px solid var(--cm-line); border-radius: 14px 14px 3px 14px; }
.live2d-actions { position: absolute; right: 0; bottom: 0; display: flex; gap: 6px; }
.live2d-actions button { padding: 5px 9px; color: var(--cm-brand); font-size: 12px; background: var(--cm-surface); border: 1px solid var(--cm-line); border-radius: 8px; cursor: pointer; }
.live2d-actions button:hover { background: var(--cm-surface-muted); }
.live2d-feedback { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; flex-direction: column; gap: 12px; color: var(--cm-ink); font-size: 14px; }
.live2d-feedback span { padding: 8px 12px; background: var(--cm-surface); border-radius: 8px; }
.live2d-feedback button { padding: 8px 14px; color: white; background: var(--cm-brand); border: 0; border-radius: 8px; cursor: pointer; }
@media (max-width: 700px) { .live2d-avatar { width: 140px; height: 220px; } }
</style>
