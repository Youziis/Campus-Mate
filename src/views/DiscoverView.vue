<script setup>
import { computed, nextTick, onMounted, ref, watch } from "vue";
import { gsap } from "gsap";
import { Flip } from "gsap/Flip";
import ActivityCard from "../components/ActivityCard.vue";
import { cats, formatDate, useCampus } from "../stores/campus";

gsap.registerPlugin(Flip);

const store = useCampus();
const flipBox = ref(null);
const selected = ref("全部");

const visibleCount = computed(() =>
  selected.value === "全部"
    ? store.activities.value.length
    : store.activities.value.filter((activity) => activity.category === selected.value).length,
);

function syncVisibility() {
  const box = flipBox.value;
  if (!box) return;
  box.querySelectorAll(".flip-item").forEach((item) => {
    const shown = selected.value === "全部" || item.dataset.category === selected.value;
    item.style.display = shown ? "flex" : "none";
  });
}

function applyFlip() {
  const box = flipBox.value;
  if (!box) return;
  const items = [...box.querySelectorAll(".flip-item")];
  if (!items.length) return;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const state = reduce ? null : Flip.getState(items);
  const lockedHeight = box.offsetHeight;
  syncVisibility();
  if (!state) return;
  box.style.minHeight = `${lockedHeight}px`;
  Flip.from(state, {
    duration: 0.7,
    scale: true,
    ease: "power1.inOut",
    stagger: 0.04,
    absolute: true,
    onEnter: (elements) => gsap.fromTo(elements, { opacity: 0, scale: 0 }, { opacity: 1, scale: 1, duration: 0.6 }),
    onLeave: (elements) => gsap.to(elements, { opacity: 0, scale: 0, duration: 0.45 }),
    onComplete: () => {
      box.style.minHeight = "";
    },
  });
}

function chooseCategory(name) {
  if (selected.value === name) return;
  selected.value = name;
  applyFlip();
}

async function clearFilters() {
  store.query.value = "";
  store.category.value = "全部";
  selected.value = "全部";
  await store.search();
  await nextTick();
  syncVisibility();
}

watch(
  () => store.activities.value.map((activity) => activity.id).join(","),
  async () => {
    await nextTick();
    syncVisibility();
  },
);

onMounted(async () => {
  await store.initialize();
  await nextTick();
  syncVisibility();
});

function publish() {
  if (store.token.value) store.newActivity();
  else store.showAuth.value = true;
}

function scrollToActivities() {
  document.querySelector("#activity-list")?.scrollIntoView({ behavior: "smooth", block: "start" });
}
</script>

<template>
  <div class="motion-page discover-page" data-page>
    <section class="hero">
      <div class="hero-copy">
        <div class="eyebrow motion-item"><span class="pulse"></span>今天，在校园遇见谁</div>
        <h1 class="motion-item">想做的事，<br /><em>刚好有人一起。</em></h1>
        <p class="motion-item">从球场、自习室到城市边缘的小路。找一个真实活动，认识一群愿意出发的人。</p>
        <div class="hero-buttons motion-item"><el-button type="primary" size="large" @click="scrollToActivities">浏览活动 <span>↓</span></el-button><button class="quiet-action" @click="publish">发起一个活动 <span>↗</span></button></div>
        <dl class="hero-metrics motion-item"><div><dt>{{ store.activities.value.length }}</dt><dd>项可参加活动</dd></div><div><dt>{{ cats.length - 1 }}</dt><dd>种校园兴趣</dd></div></dl>
      </div>
      <div class="hero-board motion-item" aria-label="近期活动预览">
        <div class="board-label">近期活动 / LIVE BOARD</div>
        <button v-for="(activity, index) in store.activities.value.slice(0, 3)" :key="activity.id" v-motion-hover class="board-card hero-float" :class="`board-card-${index + 1}`" @click="store.openDetail(activity)"><span class="board-avatar" :aria-label="`${activity.creator_name || '活动发起人'}的头像`"><img v-if="activity.creator_avatar" :src="activity.creator_avatar" :alt="`${activity.creator_name || '活动发起人'}头像`" /><span v-else>{{ activity.creator_name?.[0] || '友' }}</span></span><span><b>{{ activity.title }}</b><small>{{ formatDate(activity.starts_at, true) }}</small><small>{{ activity.location }} · {{ activity.member_count }}/{{ activity.capacity }} 人</small></span></button>
        <div v-if="!store.activities.value.length" class="board-empty"><span>✦</span><p>新的校园计划正在酝酿</p></div>
        <div class="board-orbit orbit-one"></div><div class="board-orbit orbit-two"></div>
      </div>
    </section>

    <section id="activity-list" class="content">
      <div class="section-heading motion-item"><div><div class="eyebrow muted">活动公告板</div><h2>正在发生的校园生活</h2><p>先看时间与地点，再决定和谁一起出发。</p></div></div>
      <div class="filter-row motion-item">
        <div class="flip-filters" role="radiogroup" aria-label="按分类筛选活动">
          <button type="button" class="tag-button" role="radio" :aria-checked="selected === '全部'" :class="{ chosen: selected === '全部' }" @click="chooseCategory('全部')">全部</button>
          <button
            v-for="item in store.categories.value"
            :key="item.id"
            type="button"
            class="tag-button"
            role="radio"
            :aria-checked="selected === item.name"
            :class="{ chosen: selected === item.name }"
            @click="chooseCategory(item.name)"
          >
            {{ item.name }}
          </button>
        </div>
        <span class="result-count">{{ visibleCount }} 项结果</span>
      </div>
      <div v-if="store.loading.value" class="activity-grid skeleton-grid" aria-label="正在加载活动"><div v-for="index in 4" :key="index" class="skeleton-card"><span></span><i></i><i></i><i></i></div></div>
      <div v-else-if="store.loadError.value" class="state-panel error-state"><span>连接暂时中断</span><h3>活动列表没有加载成功</h3><p>{{ store.loadError.value }}</p><el-button type="primary" @click="store.load">重新加载</el-button></div>
      <template v-else-if="store.activities.value.length">
        <div ref="flipBox" class="activity-flip">
          <div v-for="activity in store.activities.value" :key="activity.id" class="flip-item" :data-category="activity.category">
            <ActivityCard :activity="activity" />
          </div>
        </div>
        <div v-if="!visibleCount" class="state-panel empty-state">
          <span>⌕</span>
          <h3>这个分类里还没有活动</h3>
          <p>换一个分类，或回到全部。</p>
          <el-button @click="clearFilters">清除筛选</el-button>
        </div>
      </template>
      <div v-else class="state-panel empty-state"><span>⌕</span><h3>这块公告板还是空的</h3><p>换一个分类或关键词，也可以发起第一个活动。</p><el-button @click="clearFilters">清除筛选</el-button></div>
    </section>
  </div>
</template>

<style src="../styles/pages/discover.css"></style>
