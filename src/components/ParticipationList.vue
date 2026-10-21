<script setup>
import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { coverStyle, formatDate, hasActivityEnded, iconFor, useCampus } from "../stores/campus";
const store = useCampus();
const router = useRouter();
const filter = ref("all");
const filters = [{ key: "all", label: "全部报名" }, { key: "approved", label: "已通过" }, { key: "pending", label: "待审核" }, { key: "rejected", label: "未通过" }];
const count = (key) => store.myApplications.value.filter((item) => key === "all" || item.status === key).length;
const items = computed(() => store.myApplications.value.filter((item) => filter.value === "all" || item.status === filter.value));
function ended(item) { return hasActivityEnded({ ...item, status: item.activity_status }); }
function cancelled(item) { return ["cancelled", "removed"].includes(item.activity_status); }
function statusText(item) {
  if (cancelled(item)) return "活动已取消";
  if (ended(item)) return "活动已结束";
  return { pending: "等待审核", approved: "报名成功", rejected: "未通过审核" }[item.status] || item.status;
}
function guidance(item) {
  if (cancelled(item)) return "这次计划有变，去发现页看看新的相遇吧。";
  if (ended(item)) return item.status === "approved" ? "这次同行感觉如何？留下你的活动评价。" : "本次活动已经结束。";
  return { pending: "申请已送达，发起人审核后会通过站内消息通知你。", approved: "你已在同行名单中，记得确认时间和地点。", rejected: "本次未能加入，别错过其他适合你的活动。" }[item.status] || "查看详情了解活动进展。";
}
</script>

<template>
  <section class="participation-board" aria-label="我的报名与同行计划">
    <header class="participation-heading">
      <div><span class="participation-eyebrow">每一次报名，都是一次相遇的开始</span><h3>你的同行计划 <small>{{ store.myApplications.value.length }} 项报名</small></h3></div>
      <el-button text @click="router.push({ name: 'discover' })">发现更多活动 ↗</el-button>
    </header>
    <nav class="participation-filters" aria-label="按报名状态筛选">
      <button v-for="entry in filters" :key="entry.key" type="button" :class="{ selected: filter === entry.key }" :aria-pressed="filter === entry.key" @click="filter = entry.key">{{ entry.label }}<span>{{ count(entry.key) }}</span></button>
    </nav>
    <div v-if="items.length" class="participation-grid">
      <article v-for="item in items" :key="item.application_id" class="participation-card">
        <button type="button" class="participation-cover" :class="`cover-${item.category}`" :style="coverStyle(item, 'rgba(25,19,47,.6)')" :aria-label="`查看${item.title}`" @click="store.openDetail(item)">
          <span class="participation-category">{{ item.category || '校园活动' }}</span>
          <span v-if="!item.image && !item.category_cover" class="participation-symbol" aria-hidden="true">{{ iconFor(item.category) }}</span>
          <span class="participation-date">{{ formatDate(item.starts_at, true) }}</span>
        </button>
        <div class="participation-body">
          <div class="participation-state" :class="cancelled(item) || ended(item) ? 'inactive' : item.status"><i></i>{{ statusText(item) }}</div>
          <h4><button type="button" @click="store.openDetail(item)">{{ item.title }}</button></h4>
          <p class="participation-description">{{ item.description || '和兴趣相近的同学，一起完成这次校园计划。' }}</p>
          <dl><div><dt>地点</dt><dd>{{ item.location }}</dd></div><div><dt>发起人</dt><dd>{{ item.creator_name || '校园同学' }}</dd></div><div><dt>同行人数</dt><dd>{{ item.member_count ?? '—' }} / {{ item.capacity ?? '—' }} 人</dd></div></dl>
          <p class="participation-guidance">{{ guidance(item) }}</p>
          <footer>
            <el-button type="primary" plain @click="store.openDetail(item)">查看详情</el-button>
            <el-button v-if="item.status === 'approved' && ended(item) && !cancelled(item) && item.creator_id !== store.user.value?.id" @click="store.openReview(item)">评价同行者</el-button>
            <el-button v-if="['pending','approved'].includes(item.status) && !ended(item) && !cancelled(item) && item.creator_id !== store.user.value?.id" text type="danger" @click="store.withdraw(item)">{{ item.status === 'pending' ? '撤回申请' : '退出活动' }}</el-button>
          </footer>
        </div>
      </article>
    </div>
    <div v-else class="state-panel"><span>✦</span><h3>{{ filter === 'all' ? '下一次同行，从这里开始' : '这个状态下还没有报名' }}</h3><p>约一场运动、一次自习，或者一起去校园打卡。</p><el-button type="primary" @click="router.push({ name: 'discover' })">去发现活动</el-button></div>
  </section>
</template>

<style scoped>
.participation-heading { display: flex; justify-content: space-between; align-items: center; gap: 16px; margin: 8px 0 22px; }
.participation-eyebrow { color: var(--cm-ink-muted); font-size: 13px; }
.participation-heading h3 { margin: 8px 0 0; font-size: 26px; letter-spacing: -.03em; }
.participation-heading h3 small { margin-left: 10px; font-size: 13px; font-weight: 500; color: var(--cm-ink-muted); }
.participation-filters { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px; }
.participation-filters button { display: flex; align-items: center; gap: 10px; padding: 9px 14px; color: var(--cm-ink-muted); font: inherit; font-size: 14px; border: 1px solid var(--cm-line); border-radius: 10px; background: transparent; cursor: pointer; }
.participation-filters button span { font-size: 12px; font-variant-numeric: tabular-nums; }
.participation-filters button.selected { color: var(--cm-brand); border-color: var(--cm-brand); background: var(--cm-surface-muted); }
.participation-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(min(100%,340px),1fr)); gap: 24px; }
.participation-card { min-width: 0; overflow: hidden; border: 1px solid var(--cm-line); background: var(--cm-surface); border-radius: 20px 20px 20px 6px; }
.participation-cover { position: relative; display: block; width: 100%; height: 185px; border: 0; text-align: left; background-size: cover; background-position: center; cursor: pointer; }
.participation-category { position: absolute; top: 16px; left: 18px; padding: 5px 9px; color: var(--cm-night); background: var(--cm-gold); border-radius: 6px; font-size: 12px; }
.participation-symbol { position: absolute; inset: 0; display: grid; place-items: center; font-size: 56px; }
.participation-date { position: absolute; bottom: 16px; left: 18px; color: white; font-size: 14px; font-weight: 600; text-shadow: 0 2px 8px rgba(0,0,0,.4); }
.participation-body { padding: 22px; }
.participation-state { display: flex; align-items: center; gap: 7px; font-size: 12px; font-weight: 700; color: var(--cm-brand); }
.participation-state i { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.participation-state.approved { color: var(--cm-success); }
.participation-state.rejected { color: var(--cm-danger); }
.participation-state.inactive { color: var(--cm-ink-muted); }
h4 { margin: 10px 0 8px; }
h4 button { padding: 0; border: 0; background: transparent; color: var(--cm-ink); font: inherit; font-size: 22px; font-weight: 700; text-align: left; cursor: pointer; overflow-wrap: anywhere; }
.participation-description { display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: 2; overflow: hidden; min-height: 44px; margin: 0 0 18px; color: var(--cm-ink-muted); font-size: 14px; line-height: 1.6; }
dl { display: grid; gap: 9px; margin: 0; padding-bottom: 18px; border-bottom: 1px solid var(--cm-line); font-size: 13px; }
dl > div { display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 8px; }
dt { color: var(--cm-ink-muted); } dd { margin: 0; overflow-wrap: anywhere; }
.participation-guidance { padding: 12px; margin: 16px 0; color: var(--cm-ink-muted); background: var(--cm-canvas); font-size: 12px; line-height: 1.6; border-radius: 8px; }
.participation-body footer { display: flex; flex-wrap: wrap; gap: 8px; padding: 0; border: 0; background: transparent; }
.participation-body footer .el-button { margin: 0; }
@media(max-width:640px) { .participation-heading { align-items: flex-start; flex-direction: column; } .participation-body { padding: 18px; } }
</style>
