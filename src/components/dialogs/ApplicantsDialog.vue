<script setup>
import { useCampus } from "../../stores/campus";
const store = useCampus();
</script>
<template>
  <el-dialog v-model="store.applicantsOpen.value" title="报名管理" width="600" class="applicants-dialog"><div v-for="application in store.applications.value" :key="application.id" class="applicant-row"><span class="avatar">{{ application.name?.[0] }}</span><div class="applicant-info"><b>{{ application.name }}</b><small>{{ application.major || "同学" }} · {{ application.year || "" }}</small><p>{{ application.message || "期待一起参加" }}</p></div><span class="status" :class="application.status">{{ application.status === "pending" ? "待审核" : application.status === "approved" ? "已通过" : "未通过" }}</span><template v-if="application.status === 'pending'"><el-button size="small" type="primary" @click="store.reviewApp(application, 'approved')">通过</el-button><el-button size="small" @click="store.reviewApp(application, 'rejected')">拒绝</el-button></template></div><div v-if="!store.applications.value.length" class="state-panel empty-state"><span>○</span><h3>还没有人报名</h3></div></el-dialog>
</template>
