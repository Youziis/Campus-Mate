<script setup>
import { useCampus } from "../../stores/campus";

const store = useCampus();
</script>

<template>
  <el-dialog
    v-model="store.reviewDialogOpen.value"
    width="min(760px, 94vw)"
    class="activity-review-dialog"
    :title="`评价同行者${store.reviewActivity.value?.title ? ` · ${store.reviewActivity.value.title}` : ''}`"
    destroy-on-close
  >
    <p class="review-intro">给这次活动中的组织者和其他成员留下评分与体验。每位参与者只能评价同场的每个人一次。</p>

    <div v-if="store.reviewMembers.value.length" class="review-list">
      <article v-for="member in store.reviewMembers.value" :key="member.id" class="review-person">
        <header class="review-person-head">
          <span class="review-avatar">
            <img v-if="member.avatar" :src="member.avatar" :alt="`${member.name}的头像`" />
            <span v-else>{{ member.name?.trim()?.[0] || "同" }}</span>
          </span>
          <div class="review-person-info">
            <b>{{ member.name }}</b>
            <small>{{ member.is_organizer ? "活动组织者" : "活动成员" }}<template v-if="member.major"> · {{ member.major }}</template><template v-if="member.year"> · {{ member.year }}</template></small>
          </div>
          <el-tag v-if="member.is_organizer" size="small" effect="plain">组织者</el-tag>
        </header>

        <div v-if="member.review_id" class="review-submitted">
          <el-rate :model-value="member.review_rating" disabled />
          <p>{{ member.review_comment || "已完成评分" }}</p>
          <el-tag type="success" effect="light">已评价</el-tag>
        </div>
        <div v-else class="review-form">
          <el-rate v-model="member.draftRating" show-text :texts="['待改善', '一般', '不错', '很棒', '超赞']" />
          <el-input
            v-model="member.draftComment"
            type="textarea"
            :rows="2"
            maxlength="500"
            show-word-limit
            placeholder="分享这次同行体验（选填）"
          />
          <el-button
            type="primary"
            :loading="store.reviewSubmittingId.value === member.id"
            :disabled="Boolean(store.reviewSubmittingId.value)"
            @click="store.submitReview(member)"
          >提交评价</el-button>
        </div>
      </article>
    </div>

    <el-empty v-else description="这场活动中没有其他可评价的参与者" />
  </el-dialog>
</template>

<style scoped>
.review-intro { margin: 0 0 20px; color: var(--cm-ink-muted); line-height: 1.7; }
.review-list { display: grid; gap: 14px; max-height: min(62vh, 620px); overflow-y: auto; padding: 2px 4px 4px 0; }
.review-person { padding: 18px; border: 1px solid var(--cm-line); border-radius: 14px; background: var(--cm-surface); }
.review-person-head { display: flex; align-items: center; gap: 12px; }
.review-avatar { flex: none; display: grid; width: 44px; height: 44px; overflow: hidden; place-items: center; border-radius: 50%; background: var(--cm-surface-muted); color: var(--cm-brand); font-weight: 700; }
.review-avatar img { width: 100%; height: 100%; object-fit: cover; }
.review-person-info { display: grid; gap: 4px; min-width: 0; flex: 1; }
.review-person-info small { color: var(--cm-ink-muted); }
.review-form { display: grid; gap: 12px; margin: 16px 0 0 56px; }
.review-form .el-button { justify-self: end; }
.review-submitted { display: grid; grid-template-columns: 1fr auto; gap: 4px 12px; align-items: center; margin: 14px 0 0 56px; }
.review-submitted p { grid-column: 1 / -1; margin: 0; color: var(--cm-ink-muted); line-height: 1.6; overflow-wrap: anywhere; }
@media (max-width: 560px) { .review-form, .review-submitted { margin-left: 0; } }
</style>
