<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCampus } from "../../stores/campus";

const route = useRoute();
const router = useRouter();
const store = useCampus();
const discoverActive = computed(() => ["discover", "activity-detail"].includes(String(route.name)));

function openProtected(name) {
  if (!store.token.value) {
    store.showAuth.value = true;
    return;
  }
  router.push({ name });
}

function publish() {
  if (store.token.value) store.newActivity();
  else store.showAuth.value = true;
}

function openRecommendations() {
  if (!store.token.value) return (store.showAuth.value = true);
  router.push({ name: "recommendations" });
}
</script>

<template>
  <header class="topbar">
    <button class="brand" type="button" @click="router.push({ name: 'discover' })">
      <span class="brand-mark"><i></i><i></i><i></i></span>
      <span class="brand-word">campus<strong>mate</strong><small>校园里的同路人</small></span>
    </button>
    <nav aria-label="主要导航">
      <button :class="{ active: discoverActive }" @click="router.push({ name: 'discover' })">发现活动</button>
      <button :class="{ active: route.name === 'recommendations' }" @click="openRecommendations">为你推荐 <span class="spark">✦</span></button>
      <button v-if="store.token.value" :class="{ active: route.name === 'my-activities' }" @click="router.push({ name: 'my-activities' })">我的活动</button>
      <button v-if="store.token.value" class="mobile-nav-only" :class="{ active: route.name === 'notifications' }" @click="router.push({ name: 'notifications' })">通知</button>
      <button v-if="store.token.value" class="mobile-nav-only" :class="{ active: route.name === 'profile' }" @click="router.push({ name: 'profile' })">我的</button>
    </nav>
    <div class="top-actions">
      <el-input v-model="store.query.value" class="search" placeholder="搜索活动或地点" clearable @keyup.enter="store.search"><template #prefix>⌕</template></el-input>
      <el-badge v-if="store.token.value" :value="store.unreadCount.value" :hidden="!store.unreadCount.value"><button class="icon-btn" aria-label="查看通知" @click="router.push({ name: 'notifications' })">◇</button></el-badge>
      <el-dropdown v-if="store.token.value">
        <button class="user-chip"><span class="avatar">{{ store.user.value?.name?.[0] }}</span><span>{{ store.user.value?.name }}</span><span aria-hidden="true">⌄</span></button>
        <template #dropdown><el-dropdown-menu><el-dropdown-item @click="router.push({ name: 'profile' })">个人主页</el-dropdown-item><el-dropdown-item @click="router.push({ name: 'favorites' })">我的收藏</el-dropdown-item><el-dropdown-item v-if="store.user.value?.role === 'admin'" @click="openProtected('admin')">管理后台</el-dropdown-item><el-dropdown-item divided @click="store.logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
      </el-dropdown>
      <el-button v-else class="auth-trigger" text @click="store.showAuth.value = true">登录</el-button>
      <el-button class="publish-action" type="primary" @click="publish">发布活动</el-button>
    </div>
  </header>
</template>
