<script setup>
import { computed, onMounted, watch } from "vue";
import { useRoute } from "vue-router";
import ActivityCard from "../components/ActivityCard.vue";
import { formatDate, useCampus } from "../stores/campus";

const route = useRoute();
const store = useCampus();
const favoritesMode = computed(() => route.name === "favorites");

async function loadPage() {
  if (favoritesMode.value) await store.loadFavorites();
  else await store.loadMine();
}
onMounted(loadPage);
watch(() => route.name, loadPage);
</script>

<template>
  <section class="dashboard motion-page" data-page>
    <div class="section-heading motion-item"><div><div class="eyebrow muted">我的校园日程</div><h2>{{ favoritesMode ? "收藏夹" : "我的活动" }}</h2><p>{{ favoritesMode ? "暂时收藏，等一个合适的时间出发。" : "组织、审核和赴约，都集中在这里。" }}</p></div><el-button v-if="!favoritesMode" type="primary" @click="store.newActivity">发布活动</el-button></div>
    <div v-if="!favoritesMode" class="stats-row motion-item"><div v-motion-hover><b>{{ store.stats.value.published || 0 }}</b><span>发起活动</span></div><div v-motion-hover><b>{{ store.stats.value.joined || 0 }}</b><span>参与活动</span></div><div v-motion-hover><b>{{ store.stats.value.hostedMembers || 0 }}</b><span>结识同伴</span></div><div v-motion-hover><b>★ {{ store.stats.value.averageRating || "—" }}</b><span>收到评价</span></div></div>
    <div v-if="!favoritesMode" class="tabs motion-item" role="tablist"><button :class="{ selected: store.activeTab.value === 'activities' }" @click="store.activeTab.value = 'activities'">我发起的</button><button :class="{ selected: store.activeTab.value === 'applications' }" @click="store.activeTab.value = 'applications'">我参加的</button></div>
    <div v-if="favoritesMode || store.activeTab.value === 'activities'" class="activity-grid">
      <ActivityCard v-for="activity in favoritesMode ? store.favoriteList.value : store.myActivities.value" :key="activity.id" :activity="activity" :favorite-mode="favoritesMode" :manageable="!favoritesMode" />
      <div v-if="!(favoritesMode ? store.favoriteList.value : store.myActivities.value).length" class="state-panel empty-state motion-card"><span>＋</span><h3>这里还没有活动</h3><p>从发现页收藏一个计划，或者自己发起。</p></div>
    </div>
    <div v-else class="application-list motion-item"><div v-for="activity in store.myApplications.value" :key="activity.application_id" class="application-row"><div><h3>{{ activity.title }}</h3><p>{{ activity.location }} · {{ formatDate(activity.starts_at, true) }}</p></div><span class="status" :class="activity.status">{{ { pending: "待审核", approved: "已通过", rejected: "未通过" }[activity.status] || activity.status }}</span><el-button v-if="activity.status === 'approved'" size="small" @click="store.reviewMember(activity.id, activity.creator_id)">评价搭子</el-button><el-button size="small" @click="store.withdraw(activity)">退出</el-button></div><div v-if="!store.myApplications.value.length" class="state-panel empty-state"><span>○</span><h3>还没有参加活动</h3><p>从发现页找一个感兴趣的计划。</p></div></div>
  </section>
</template>
