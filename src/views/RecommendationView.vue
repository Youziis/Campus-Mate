<template>
  <section ref="pageRoot" class="recommend-page recommend-reel-page" data-page>
    <div class="recommend-copy">
      <div class="eyebrow"><span class="pulse"></span>校园命运牌阵 / CAMPUS ARCANA</div>
      <h1>下一次相遇，<br /><em>交给缘分翻牌。</em></h1>
      <p>洗牌刷新一批活动，或直接抽取一张缘分。</p>
      <div class="recommend-modes" role="tablist" aria-label="推荐模式">
        <button type="button" :class="{ active: mode === 'same' }" role="tab" :aria-selected="mode === 'same'" @click="changeMode('same')"><b>同频</b><small>兴趣与空闲时间相近</small></button>
        <button type="button" :class="{ active: mode === 'try' }" role="tab" :aria-selected="mode === 'try'" @click="changeMode('try')"><b>尝新</b><small>发现没尝试过的新活动</small></button>
      </div>
      <div class="recommend-actions">
        <button class="deck-action shuffle-action" :disabled="shuffling" @click="shuffleDeck">
          <span>↻</span><b>继续巡游</b><small>换一批尽量不同的活动</small>
        </button>
        <button class="deck-action draw-action" :disabled="shuffling" @click="drawCard">
          <span>✦</span><b>抽取缘分</b><small>匹配分越高，抽中机会越大</small>
        </button>
      </div>
      <div class="deck-meta"><span>{{ deck.length }} 张</span><span>已抽取 {{ drawCount }} 次</span></div>
    </div>

    <div
      ref="reelRoot"
      class="recommend-reel-window"
      :class="{ 'is-speeding': shuffling, 'is-paused': hovering }"
      @mouseenter="pauseReel"
      @mouseleave="resumeReel"
    >
      <div v-if="store.recommendationLoading.value" class="deck-loading">
        <span></span><b>正在整理你的卡组</b><small>读取兴趣与空闲时间…</small>
      </div>
      <div v-else-if="!deck.length" class="deck-loading">
        <b>暂时没有可推荐的活动</b><small>完善兴趣和空闲时间后再来抽卡。</small>
        <el-button @click="router.push({ name: 'profile' })">完善资料</el-button>
      </div>
      <div v-else class="recommend-reel-track">
        <div v-for="copy in 2" :key="copy" class="recommend-reel-group" :aria-hidden="copy === 2">
          <article
            v-for="activity in reelCards"
            :key="`${activity.id}-${copy}`"
            class="reel-card"
            @click="store.openDetail(activity)"
          >
            <div class="reel-card-cover" :class="`cover-${activity.category}`" :style="coverStyle(activity, 'rgba(16,12,38,.58)')">
              <span class="deck-category">{{ activity.category }}</span>
              <span v-if="!activity.image && !activity.category_cover" class="reel-card-emoji">{{ iconFor(activity.category) }}</span>
              <span class="reel-card-location">{{ activity.location }}</span>
            </div>
            <div class="reel-card-copy">
              <small>{{ formatDate(activity.starts_at, true) }}</small>
              <h2>{{ activity.title }}</h2>
              <p>{{ activity.description }}</p>
              <footer><span>{{ activity.member_count }}/{{ activity.capacity }} 人</span><b>查看 →</b></footer>
            </div>
          </article>
        </div>
      </div>
      <div class="reel-fade reel-fade-top" aria-hidden="true"></div>
      <div class="reel-fade reel-fade-bottom" aria-hidden="true"></div>
      <div class="reel-status">{{ hovering ? "已暂停 · 点击卡片查看详情" : "活动卡组正在巡游" }}</div>
    </div>

    <div v-if="drawn" class="drawn-card-layer" @click.self="closeDrawn">
      <article class="drawn-activity-card">
        <button class="draw-close" type="button" aria-label="关闭抽卡结果" @click="closeDrawn">×</button>
        <div class="drawn-card-cover" :class="`cover-${drawn.category}`" :style="coverStyle(drawn, 'rgba(16,12,38,.5)')">
          <span class="draw-spark">✦</span>
          <span class="deck-category">{{ drawn.category }}</span>
          <span v-if="!drawn.image && !drawn.category_cover" class="reel-card-emoji">{{ iconFor(drawn.category) }}</span>
        </div>
        <div class="drawn-card-copy">
          <small>命运为你翻开</small>
          <h2>{{ drawn.title }}</h2>
          <p>{{ formatDate(drawn.starts_at, true) }} · {{ drawn.location }}</p>
          <div>
            <el-button @click="drawCard">再抽一次</el-button>
            <el-button type="primary" @click="store.openDetail(drawn)">查看活动</el-button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style src="../styles/pages/recommendation.css"></style>
<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { useRouter } from "vue-router";
import { gsap } from "gsap";
import { coverStyle, formatDate, iconFor, useCampus } from "../stores/campus";

const store = useCampus();
const router = useRouter();
const pageRoot = ref(null);
const reelRoot = ref(null);
const deck = ref([]);
const candidatePool = ref([]);
const remainingPool = ref([]);
let previousBatchIds = new Set();
const drawn = ref(null);
const shuffling = ref(false);
const hovering = ref(false);
const drawCount = ref(0);
const mode = ref("same");

/* ---------- 可调参数 ---------- */
const BASE_SPEED = 48;   // 巡游基础速度 px/s
const PEAK_SPEED = 96;   // 洗牌/抽卡峰值速度倍数（约 1400px/s）
const MAX_BLUR = 7;      // 峰值模糊 px
/* ------------------------------- */

const motion = { speed: 1 };   // 速度倍数：唯一的"真相源"
let offset = 0;                // 当前滚动位移 px
let loopHeight = 0;            // 一组卡片的循环距离 px
let trackEl = null;
let resizeObserver = null;
let introContext;

const reelCards = computed(() => deck.value.slice(0, 9));
const prefersReducedMotion = () => window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// 抽卡按推荐分数加权：分数越高，被抽中的区间越大；0 分活动仍保留少量机会。
function weightedDraw(items) {
  const uniqueItems = [...new Map(items.filter((item) => !item.isPlaceholder).map((item) => [String(item.id), item])).values()];
  if (!uniqueItems.length) return null;
  const weighted = uniqueItems.map((item) => ({
    item,
    weight: Math.max(1, Number(item.recommendationScore) || 0),
  }));
  const totalWeight = weighted.reduce((sum, entry) => sum + entry.weight, 0);
  let ticket = Math.random() * totalWeight;

  for (const entry of weighted) {
    if (ticket < entry.weight) return entry.item;
    ticket -= entry.weight;
  }

  return weighted.at(-1).item;
}

function shuffled(items) {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function nextBatch() {
  if (!candidatePool.value.length) return [];
  if (!remainingPool.value.length) remainingPool.value = [...candidatePool.value];

  const recentIds = previousBatchIds;
  const available = remainingPool.value;
  const fresh = shuffled(available.filter((item) => !recentIds.has(String(item.id))));
  const recent = shuffled(available.filter((item) => recentIds.has(String(item.id))));
  const batch = [...fresh, ...recent].slice(0, 9);
  const batchIds = new Set(batch.map((item) => String(item.id)));

  // Advance each activity through the pool once before beginning another cycle.
  remainingPool.value = available.filter((item) => !batchIds.has(String(item.id)));

  // If fewer than nine unseen activities remain, fill from activities outside
  // the previous batch first, then use the rest of the pool to keep all faces filled.
  const fillers = [
    ...shuffled(candidatePool.value.filter((item) => !batchIds.has(String(item.id)) && !recentIds.has(String(item.id)))),
    ...shuffled(candidatePool.value.filter((item) => !batchIds.has(String(item.id)) && recentIds.has(String(item.id)))),
  ];
  while (batch.length < 9 && fillers.length) {
    const item = fillers.shift();
    batch.push(item);
    batchIds.add(String(item.id));
  }
  const fallback = shuffled(candidatePool.value);
  while (batch.length < 9 && fallback.length) {
    batch.push(fallback[(batch.length - 9) % fallback.length]);
  }

  previousBatchIds = new Set(batch.map((item) => String(item.id)));
  return batch;
}
const wait = (seconds) => new Promise((resolve) => gsap.delayedCall(seconds, resolve));

function tweenSpeed(to, duration, ease) {
  return new Promise((resolve) => {
    gsap.to(motion, { speed: to, duration, ease, overwrite: true, onComplete: resolve });
  });
}

/* ---------- 滚动核心：ticker 驱动 ---------- */
function measure() {
  if (!trackEl) return;
  const groups = trackEl.querySelectorAll(".recommend-reel-group");
  if (groups.length < 2) { loopHeight = 0; return; }
  // 用两组的实际间距作为循环距离，自动包含 gap，图片加载后也准确
  loopHeight = groups[1].offsetTop - groups[0].offsetTop;
  if (loopHeight > 0) offset %= loopHeight;
}

function tick(_time, deltaTime) {
  if (!trackEl || loopHeight <= 0) return;
  const dt = Math.min(deltaTime, 64) / 1000;      // 防止切标签页后的大跳
  offset = (offset + BASE_SPEED * motion.speed * dt) % loopHeight;
  trackEl.style.transform = `translate3d(0, ${-offset.toFixed(2)}px, 0)`;

  // 模糊随速度增长：速度 < 4 倍时不模糊
  const blur = (Math.max(0, motion.speed - 4) / (PEAK_SPEED - 4)) * MAX_BLUR;
  // 弹层显示时不再给轨道加模糊，减少合成压力
  trackEl.style.filter = !drawn.value && blur > 0.3 ? `blur(${blur.toFixed(1)}px)` : "";
}

async function setupReel() {
  await nextTick();
  trackEl = reelRoot.value?.querySelector(".recommend-reel-track") || null;
  if (!trackEl || prefersReducedMotion()) return;
  measure();
  resizeObserver?.disconnect();
  resizeObserver = new ResizeObserver(measure);
  resizeObserver.observe(trackEl);
  gsap.ticker.remove(tick);
  gsap.ticker.add(tick);
}

/* ---------- 悬停：缓动减速/恢复，而不是急停 ---------- */
function pauseReel() {
  hovering.value = true;
  if (shuffling.value) return;
  gsap.to(motion, { speed: 0, duration: 0.5, ease: "power2.out", overwrite: true });
}

function resumeReel() {
  hovering.value = false;
  if (shuffling.value) return;
  gsap.to(motion, { speed: 1, duration: 0.8, ease: "power2.inOut", overwrite: true });
}

/* ---------- 洗牌 / 抽卡共用的"加速 → 峰值换牌 → 减速" ---------- */
async function spin(onPeak) {
  shuffling.value = true;
  drawn.value = null;

  if (prefersReducedMotion()) {
    await onPeak();
    shuffling.value = false;
    return;
  }

  await tweenSpeed(PEAK_SPEED, 0.85, "power3.in");  // 越转越快
  await wait(0.3);                                   // 在最模糊处停留一小会儿
  await onPeak();                                    // 峰值时换牌，位置不重置
  await tweenSpeed(1, 1.1, "power3.out");            // 快速甩出后慢慢稳住

  shuffling.value = false;
  if (hovering.value) gsap.to(motion, { speed: 0, duration: 0.4, ease: "power2.out", overwrite: true });
}

async function swapDeck() {
  deck.value = nextBatch();
  await nextTick();
  measure();
}

function shuffleDeck() {
  if (shuffling.value || deck.value.length < 2) return;
  return spin(swapDeck);
}

function drawCard() {
  if (shuffling.value || !deck.value.length) return;
  return spin(async () => {
    const chosen = weightedDraw(deck.value);
    await swapDeck();
    drawn.value = chosen;
    drawCount.value += 1;
    await nextTick();

    const card = pageRoot.value?.querySelector(".drawn-activity-card");
    if (card) {
      // 先隐藏，避免首帧闪现
      gsap.set(card, { autoAlpha: 0, x: 360, y: 30, scale: 0.56, rotation: 9, force3D: true });
      // 等浏览器完成挂载和首次绘制，再开始动画
      await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
      gsap.to(card, {
        autoAlpha: 1, x: 0, y: 0, scale: 1, rotation: 0,
        duration: 0.7, ease: "back.out(1.25)", force3D: true,
      });
    }
  });
}

function closeDrawn() {
  const card = pageRoot.value?.querySelector(".drawn-activity-card");
  if (!card || prefersReducedMotion()) {
    drawn.value = null;
    return;
  }
  gsap.to(card, {
    autoAlpha: 0, y: 24, scale: 0.94, duration: 0.24, ease: "power2.in",
    onComplete: () => { drawn.value = null; },
  });
}

async function loadDeck() {
  await store.initialize();
  await store.recommend();
  candidatePool.value = [...store.recommendations.value];
  remainingPool.value = [...candidatePool.value];
  previousBatchIds = new Set();
  deck.value = nextBatch();
  await setupReel();

  if (!prefersReducedMotion()) {
    introContext = gsap.context(() => {
      gsap.from(".recommend-copy > *", { autoAlpha: 0, x: -28, duration: 0.72, stagger: 0.08, ease: "power3.out" });
      gsap.from(".recommend-reel-window", { autoAlpha: 0, x: 70, rotation: 2, duration: 0.9, ease: "power3.out" });
    }, pageRoot.value);
  }
}

async function changeMode(nextMode) {
  if (mode.value === nextMode || shuffling.value) return;
  mode.value = nextMode;
  await store.recommend(nextMode);
  candidatePool.value = [...store.recommendations.value];
  remainingPool.value = [...candidatePool.value];
  previousBatchIds = new Set();
  drawn.value = null;
  deck.value = nextBatch();
  await setupReel();
}

onMounted(loadDeck);
onUnmounted(() => {
  gsap.ticker.remove(tick);
  gsap.killTweensOf(motion);
  resizeObserver?.disconnect();
  introContext?.revert();
});
</script>
