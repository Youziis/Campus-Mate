<script setup>
import { useCampus } from "../stores/campus";
const store = useCampus();
</script>
<template>
  <section class="dashboard motion-page" data-page><div class="section-heading motion-item"><div><div class="eyebrow muted">消息中心</div><h2>通知</h2><p>报名结果和活动变化会留在这里。</p></div><el-button text :disabled="!store.unreadCount.value" @click="store.markAllRead">全部标为已读</el-button></div><div class="notification-list motion-item"><button v-for="notification in store.notifications.value" :key="notification.id" :class="{ unread: !notification.read }" @click="store.markRead(notification)"><span class="notif-icon">✦</span><span class="notification-copy"><b>{{ notification.title }}</b><span>{{ notification.body }}</span><small>{{ new Date(notification.created_at + "Z").toLocaleString("zh-CN") }}</small></span><i v-if="!notification.read"></i></button><div v-if="!store.notifications.value.length" class="state-panel empty-state"><span>◇</span><h3>暂时没有新消息</h3><p>报名和活动动态会出现在这里。</p></div></div></section>
</template>
