<script setup>
import { ElMessage } from "element-plus";
import { computed } from "vue";
import { useCampus } from "../../stores/campus";

const store = useCampus();
const managing = computed(() => Number(store.selected.value?.creator_id) === Number(store.user.value?.id));
const members = computed(() => store.applications.value.filter((item) =>
  Number(item.user_id) !== Number(store.selected.value?.creator_id) &&
  (managing.value || Number(item.user_id) !== Number(store.user.value?.id))
));
async function copyContact(contact) {
  if (!contact) return;
  try { await navigator.clipboard.writeText(contact); ElMessage.success("联系方式已复制"); }
  catch { ElMessage.error("复制失败，请手动选择联系方式"); }
}
</script>

<template>
  <el-dialog v-model="store.applicantsOpen.value" title="成员与信息" width="min(680px, 94vw)" class="applicants-dialog">
    <div v-if="!managing" class="applicant-organizer member-self">
      <span class="avatar">{{ store.user.value?.name?.[0] }}</span>
      <div><b>{{ store.user.value?.name }}</b><small>我 · 已通过审核</small></div>
      <span class="organizer-badge">我</span>
    </div>
    <div class="applicant-organizer">
      <span class="avatar">{{ store.selected.value?.creator_name?.[0] || "组" }}</span>
      <div><b>{{ store.selected.value?.creator_name || "活动组织者" }}</b><small>活动组织者 · 负责审核报名</small></div>
      <span class="organizer-badge">组织者</span>
      <el-button v-if="!managing && store.memberOrganizer.value?.contact" size="small" @click="copyContact(store.memberOrganizer.value.contact)">{{ store.memberOrganizer.value.contact }} · 复制</el-button>
    </div>
    <p class="member-section-label">{{ managing ? '报名与成员' : '其他成员' }}</p>
    <div v-for="application in members" :key="application.id" class="applicant-row">
      <span class="avatar">{{ application.name?.[0] }}</span>
      <div class="applicant-info"><b>{{ application.name }}</b><small>{{ application.major || "同学" }} · {{ application.year || "" }}</small><p>{{ application.message || "期待一起参加" }}</p><small v-if="application.status === 'approved'" class="applicant-contact">{{ application.contact || "未填写联系方式" }}</small></div>
      <span class="status" :class="application.status">{{ application.status === "pending" ? "待审核" : application.status === "approved" ? "已通过" : "未通过" }}</span>
      <el-button v-if="application.status === 'approved' && application.contact" size="small" @click="copyContact(application.contact)">复制联系方式</el-button>
      <template v-if="managing && application.status === 'pending'"><el-button size="small" type="primary" @click="store.reviewApp(application, 'approved')">通过</el-button><el-button size="small" @click="store.reviewApp(application, 'rejected')">拒绝</el-button></template>
    </div>
    <div v-if="!members.length" class="state-panel empty-state"><span>○</span><h3>{{ managing ? '还没有人报名' : '暂无其他成员' }}</h3></div>
  </el-dialog>
</template>

<style src="../../styles/components/dialogs.css"></style>
