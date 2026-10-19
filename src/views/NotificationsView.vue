<script setup>
import { ref } from "vue";
import { useCampus } from "../stores/campus";
const store = useCampus();
const editing = ref(false);
</script>
<template>
  <section class="dashboard motion-page" data-page>
    <div class="section-heading motion-item">
      <div><div class="eyebrow muted">消息中心</div><h2>通知</h2><p>报名结果和活动变化会留在这里。</p></div>
      <div class="notification-toolbar">
        <el-button text :disabled="!store.unreadCount.value" @click="store.markAllRead">全部标为已读</el-button>
        <el-button text :aria-pressed="editing" @click="editing = !editing">{{ editing ? '完成' : '编辑' }}</el-button>
      </div>
    </div>
    <div class="notification-list motion-item">
      <article v-for="notification in store.notifications.value" :key="notification.id" class="notification-row" :class="{ unread: !notification.read }">
        <button class="notification-main" type="button" @click="store.markRead(notification)">
          <span class="notif-icon">✦</span>
          <span class="notification-copy"><b>{{ notification.title }}</b><span>{{ notification.body }}</span><small>{{ new Date(notification.created_at + 'Z').toLocaleString('zh-CN') }}</small></span>
          <i v-if="!notification.read"></i>
        </button>
        <el-button v-if="editing" text type="danger" :loading="notification.deleting" :aria-label="`删除通知：${notification.title}`" @click="store.deleteNotification(notification)">删除</el-button>
      </article>
      <div v-if="!store.notifications.value.length" class="state-panel empty-state"><span>◇</span><h3>暂时没有新消息</h3><p>报名和活动动态会出现在这里。</p></div>
    </div>
  </section>
</template>

<style src="../styles/pages/notifications.css"></style>
