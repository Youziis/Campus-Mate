<script setup>
import { formatDate, iconFor, useCampus } from "../stores/campus";

defineProps({ activity: { type: Object, required: true }, featured: Boolean, manageable: Boolean, favoriteMode: Boolean });
const store = useCampus();
</script>

<template>
  <article v-motion-hover class="activity-card motion-card" :class="{ featured }" tabindex="0" @click="store.openDetail(activity)" @keyup.enter="store.openDetail(activity)">
    <div class="activity-cover" :class="`cover-${activity.category}`" :style="activity.image ? { backgroundImage: `linear-gradient(0deg,rgba(21,39,34,.6),transparent 65%),url(${activity.image})` } : {}">
      <span class="tag">{{ activity.category }}</span>
      <button v-if="!manageable" class="heart" :class="{ hearted: activity.is_favorite || favoriteMode }" :aria-label="activity.is_favorite ? '取消收藏' : '收藏活动'" @click.stop="store.toggleFavorite(activity)">{{ activity.is_favorite || favoriteMode ? "♥" : "♡" }}</button>
      <span v-if="!activity.image" class="cover-emoji">{{ iconFor(activity.category) }}</span>
      <span class="cover-caption">{{ activity.location }}</span>
    </div>
    <div class="activity-info">
      <div class="date-line">{{ formatDate(activity.starts_at, true) }}</div><h3>{{ activity.title }}</h3><p>{{ activity.description || activity.location }}</p>
      <div class="card-bottom"><span class="host"><span class="small-avatar">{{ activity.creator_name?.[0] }}</span>{{ activity.creator_name }}</span><span class="member-count">{{ activity.member_count }} / {{ activity.capacity }} 人</span></div>
      <div v-if="manageable" class="inline-actions" @click.stop><el-button size="small" @click="store.openApplicants(activity)">报名管理 <span v-if="activity.pending_count" class="pending">{{ activity.pending_count }}</span></el-button><el-button size="small" @click="store.editActivity(activity)">编辑</el-button><el-button size="small" type="danger" plain @click="store.cancel(activity)">取消</el-button></div>
    </div>
  </article>
</template>
