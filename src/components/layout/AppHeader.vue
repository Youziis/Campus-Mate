<script setup>
import { computed } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCampus } from "../../stores/campus";

const route = useRoute();
const router = useRouter();
const store = useCampus();
const discoverActive = computed(() => ["discover", "activity-detail"].includes(String(route.name)));

function openRecommendations() {
  if (!store.token.value) return (store.showAuth.value = true);
  router.push({ name: "recommendations" });
}

function openAccount() {
  if (store.token.value) router.push({ name: "profile" });
  else store.showAuth.value = true;
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
    </nav>

    <el-input
      v-model="store.query.value"
      class="header-search"
      placeholder="搜索活动或地点"
      clearable
      @keyup.enter="store.search"
    >
      <template #prefix><span class="search-symbol">⌕</span></template>
    </el-input>

    <div class="header-account">
      <button v-if="store.token.value" class="header-my-activities" type="button" :class="{ active: route.name === 'my-activities' }" @click="router.push({ name: 'my-activities' })">
        <span>◇</span><b>我的活动</b>
      </button>
      <el-badge v-if="store.token.value" :is-dot="store.unreadCount.value > 0" class="account-badge">
        <button class="account-avatar" type="button" aria-label="进入个人中心" @click="openAccount">
          <img v-if="store.user.value?.avatar" :src="store.user.value.avatar" alt="" />
          <span v-else>{{ store.user.value?.name?.[0] }}</span>
        </button>
      </el-badge>
      <button v-else class="login-entry" type="button" @click="openAccount">登录</button>
    </div>
  </header>
</template>

<style src="../../styles/components/app-header.css"></style>
