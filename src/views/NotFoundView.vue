<script setup>
import { useRouter } from "vue-router";
const router = useRouter();
</script>
<template>
  <section class="dashboard motion-page" data-page><div class="state-panel empty-state motion-item"><span>404</span><h3>页面走远了</h3><p>回到活动公告板继续看看。</p><el-button type="primary" @click="router.push({ name: 'discover' })">返回发现页</el-button></div></section>
</template>
