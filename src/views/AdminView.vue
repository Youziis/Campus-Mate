<script setup>
import { onMounted } from "vue";
import { useCampus } from "../stores/campus";
const store = useCampus();
onMounted(store.loadAdmin);
</script>
<template>
  <section class="dashboard motion-page" data-page><div class="section-heading motion-item"><div><div class="eyebrow muted">社区治理</div><h2>内容管理</h2><p>处理举报并维护活动秩序。</p></div></div><div class="admin-grid"><section class="admin-panel motion-item"><div class="panel-heading"><h3>待处理举报</h3><span>{{ store.reports.value.length }}</span></div><div class="application-list"><div v-for="item in store.reports.value" :key="item.id" class="application-row"><div><b>{{ item.target_type }} #{{ item.target_id }} · {{ item.reason }}</b><p>来自 {{ item.reporter_name }} · {{ item.created_at }}</p></div><span class="status">{{ item.status }}</span><el-button size="small" type="primary" @click="store.reportAction(item, 'resolved')">处理完成</el-button><el-button size="small" @click="store.reportAction(item, 'dismissed')">忽略</el-button></div><div v-if="!store.reports.value.length" class="state-panel empty-state"><span>✓</span><h3>没有待处理举报</h3></div></div></section><section class="admin-panel motion-item"><div class="panel-heading"><h3>活动列表</h3><span>{{ store.adminActivities.value.length }}</span></div><div class="application-list"><div v-for="activity in store.adminActivities.value" :key="activity.id" class="application-row"><div><b>{{ activity.title }}</b><p>{{ activity.creator_name }} · {{ activity.status }}</p></div><el-button v-if="activity.status === 'open'" type="danger" size="small" plain @click="store.adminRemove(activity)">下架</el-button></div></div></section></div></section>
</template>

<style src="../styles/pages/admin.css"></style>
