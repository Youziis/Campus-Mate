<script setup>
import { onMounted, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { coverStyle, formatDate, iconFor, useCampus } from "../stores/campus";

const route = useRoute();
const router = useRouter();
const store = useCampus();
const loadActivity = () => store.loadActivity(route.params.id);
const goBack = () => window.history.state.back ? router.back() : router.push({ name: "discover" });
onMounted(loadActivity);
watch(() => route.params.id, loadActivity);
</script>

<template>
  <section class="detail-page motion-page" data-page>
    <button class="back-link motion-item" @click="goBack">← 返回活动列表</button>
    <article v-if="store.selected.value" class="detail-panel">
      <div class="detail-visual motion-item" :class="`cover-${store.selected.value.category}`" :style="coverStyle(store.selected.value, 'rgba(19,37,32,.55)')">
        <span class="detail-category">{{ store.selected.value.category }}</span>
        <span v-if="!store.selected.value.image && !store.selected.value.category_cover" class="detail-icon hero-float">{{ iconFor(store.selected.value.category) }}</span>
        <p>{{ store.selected.value.location }}</p>
      </div>
      <div class="detail-body">
        <div class="eyebrow muted motion-item">活动详情 / {{ store.selected.value.category }}</div>
        <h1 class="motion-item">{{ store.selected.value.title }}</h1>
        <p class="detail-desc motion-item">{{ store.selected.value.description }}</p>
        <dl class="detail-facts motion-item">
          <div><dt>时间</dt><dd>{{ formatDate(store.selected.value.starts_at, true) }}</dd></div>
          <div><dt>地点</dt><dd>{{ store.selected.value.location }}</dd></div>
          <div><dt>人数</dt><dd>{{ store.selected.value.member_count }} / {{ store.selected.value.capacity }} 位成员</dd></div>
        </dl>
        <div class="host-detail motion-item">
          <span class="avatar">{{ store.selected.value.creator_name?.[0] }}</span>
          <div><b>{{ store.selected.value.creator_name }}</b><small>活动组织者</small></div>
          <el-button v-if="store.selected.value.creator_id === store.user.value?.id" @click="store.openApplicants(store.selected.value)">成员与报名管理</el-button>
          <template v-else-if="store.selected.value.is_member || store.selected.value.application_status === 'approved'"><el-button type="success" disabled>已通过审核</el-button><el-button size="small" @click="store.copyOrganizerContact">复制发起人联系方式</el-button><el-button size="small" @click="store.showMembers">查看活动成员</el-button></template>
          <el-button v-else-if="store.selected.value.application_status === 'pending'" disabled>已申请，等待审核</el-button>
          <el-button v-else type="primary" @click="store.join(store.selected.value)">申请加入</el-button>
        </div>
        <div v-if="store.reviews.value.length" class="review-strip motion-item"><span>★ {{ store.reviews.value[0].rating }}</span><p>“{{ store.reviews.value[0].comment || "值得一起参加活动的校园伙伴" }}”</p></div>
        <button class="danger-link motion-item" @click="store.report(store.selected.value)">举报此活动</button>
      </div>
    </article>
    <div v-else-if="!store.loading.value" class="state-panel empty-state"><span>○</span><h3>没有找到活动</h3><el-button @click="router.push({ name: 'discover' })">返回发现页</el-button></div>
  </section>
</template>

<style src="../styles/pages/activity-detail.css"></style>
