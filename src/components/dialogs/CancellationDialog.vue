<script setup>
import { useCampus } from "../../stores/campus";
const store = useCampus();
</script>

<template>
  <el-dialog v-model="store.cancellationOpen.value" title="取消活动" width="min(560px, 94vw)" :close-on-click-modal="false" :show-close="!store.cancellationBusy.value" :close-on-press-escape="!store.cancellationBusy.value">
    <p>取消「{{ store.cancellationTarget.value?.title }}」后将通知已通过成员和待审核报名者，并删除活动。此操作无法撤销。</p>
    <el-form label-position="top" @submit.prevent="store.submitCancellation">
      <el-form-item label="取消原因" required><el-input v-model="store.cancellationForm.value.reason" type="textarea" :rows="2" maxlength="300" show-word-limit :disabled="store.cancellationBusy.value" placeholder="请说明为什么取消活动" /></el-form-item>
      <el-form-item label="公告内容" required><el-input v-model="store.cancellationForm.value.announcement" type="textarea" :rows="4" maxlength="1000" show-word-limit :disabled="store.cancellationBusy.value" placeholder="向报名同学说明后续安排或需要注意的事项" /></el-form-item>
    </el-form>
    <template #footer><el-button :disabled="store.cancellationBusy.value" @click="store.cancellationOpen.value = false">返回</el-button><el-button type="danger" :loading="store.cancellationBusy.value" @click="store.submitCancellation">发送通知并删除</el-button></template>
  </el-dialog>
</template>
