<script setup>
import { computed, onMounted, ref } from "vue";
import ActivityCard from "../components/ActivityCard.vue";
import { cats, formatDate, useCampus } from "../stores/campus";

const store = useCampus();
const selected = ref("全部");

// 只渲染当前分类的活动，让网格始终保持正常文档流。
// 这样快速切换分类时不会残留 Flip 写入的绝对定位和尺寸样式。
const filteredActivities = computed(() =>
  selected.value === "全部"
    ? store.activities.value
    : store.activities.value.filter((activity) => activity.category === selected.value),
);
const visibleCount = computed(() => filteredActivities.value.length);

function chooseCategory(name) {
  if (selected.value === name) return;
  selected.value = name;
}

async function clearFilters() {
  store.query.value = "";
  store.category.value = "全部";
  selected.value = "全部";
  await store.search();
}

onMounted(() => store.initialize());

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
        <div class="activity-flip">
          <div v-for="activity in filteredActivities" :key="activity.id" class="flip-item">
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
