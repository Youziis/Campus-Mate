<script setup>
import { computed, onMounted } from "vue";
import { useCampus } from "../stores/campus";

const store = useCampus();
const pendingReports = computed(() =>
  store.reports.value.filter((report) => report.status === "open"),
);
const reviewedReports = computed(() =>
  store.reports.value.filter((report) => report.status !== "open"),
);

function statusLabel(status) {
  return status === "resolved" ? "已下架" : status === "dismissed" ? "已保留" : "待审核";
}

onMounted(store.loadAdmin);
</script>

<template>
  <section class="dashboard motion-page admin-page" data-page>
    <div class="section-heading motion-item">
      <div>
        <div class="eyebrow muted">社区治理</div>
        <h2>举报审核</h2>
        <p>核对举报内容，决定保留活动或下架活动。</p>
      </div>
      <div class="admin-summary">
        <span class="admin-summary-count">{{ pendingReports.length }}</span>
        <span>条待审核</span>
      </div>
    </div>

    <section class="admin-panel motion-item">
      <div class="panel-heading">
        <div>
          <h3>待处理举报</h3>
          <p>下架活动时必须填写理由，系统会通知活动发起人。</p>
        </div>
        <span class="report-count">{{ pendingReports.length }}</span>
      </div>

      <div v-if="pendingReports.length" class="admin-report-list">
        <article v-for="report in pendingReports" :key="report.id" class="admin-report-card">
          <div class="admin-report-content">
            <div class="admin-report-topline">
              <span class="admin-report-tag">活动举报 #{{ report.id }}</span>
              <time>{{ report.created_at }}</time>
            </div>
            <h4>
              <router-link
                v-if="report.activity_title"
                class="admin-activity-link"
                :to="{ name: 'activity-detail', params: { id: report.target_id } }"
              >{{ report.activity_title }}</router-link>
              <span v-else>活动 #{{ report.target_id }}（活动记录不存在）</span>
            </h4>
            <p class="admin-report-meta">发起人：{{ report.creator_name || "活动记录不存在" }} · 举报人：{{ report.reporter_name }}</p>
            <div class="admin-report-reason">
              <b>举报原因</b>
              <p>{{ report.reason }}</p>
            </div>
            <p v-if="report.activity_status === 'removed'" class="admin-report-warning">该活动当前已下架，请完成举报审核记录。</p>
            <div class="admin-report-actions">
              <el-button
                size="default"
                :disabled="report.activity_status === 'removed'"
                @click="store.reportAction(report, 'keep')"
              >保留活动</el-button>
              <el-button
                size="default"
                type="danger"
                :disabled="!report.activity_title"
                @click="store.reportAction(report, 'remove')"
              >下架活动</el-button>
            </div>
          </div>
        </article>
      </div>
      <div v-else class="state-panel empty-state admin-empty">
        <span>✓</span>
        <h3>目前没有待处理举报</h3>
        <p>新提交的活动举报会出现在这里。</p>
      </div>
    </section>

    <section class="admin-panel motion-item">
      <div class="panel-heading">
        <div>
          <h3>活动列表</h3>
          <p>管理员下架同样需要填写理由，并通知活动发起人。</p>
        </div>
        <span class="report-count">{{ store.adminActivities.value.length }}</span>
      </div>
      <div class="admin-activity-list">
        <article v-for="activity in store.adminActivities.value" :key="activity.id" class="admin-activity-row">
          <div>
            <router-link class="admin-activity-link" :to="{ name: 'activity-detail', params: { id: activity.id } }">
              {{ activity.title }}
            </router-link>
            <p>{{ activity.creator_name }} · {{ activity.status === "removed" ? "已下架" : activity.status }}</p>
          </div>
          <el-button
            v-if="activity.status !== 'removed'"
            type="danger"
            size="small"
            plain
            @click="store.adminRemove(activity)"
          >下架</el-button>
          <span v-else class="admin-removed-label">已下架</span>
        </article>
        <div v-if="!store.adminActivities.value.length" class="admin-list-empty">暂无活动</div>
      </div>
    </section>

    <section v-if="reviewedReports.length" class="admin-panel motion-item">
      <div class="panel-heading">
        <div>
          <h3>审核记录</h3>
          <p>保留处理意见与下架理由，方便后续查看。</p>
        </div>
        <span class="report-count">{{ reviewedReports.length }}</span>
      </div>
      <div class="admin-history-list">
        <article v-for="report in reviewedReports" :key="report.id" class="admin-history-row">
          <div>
            <router-link
              v-if="report.activity_title"
              class="admin-activity-link"
              :to="{ name: 'activity-detail', params: { id: report.target_id } }"
            >{{ report.activity_title }}</router-link>
            <b v-else>活动 #{{ report.target_id }}</b>
            <p>举报原因：{{ report.reason }}</p>
            <p v-if="report.admin_reason">处理理由：{{ report.admin_reason }}</p>
            <small>{{ report.reviewed_at || report.created_at }}</small>
          </div>
          <span class="admin-status" :class="report.decision">{{ statusLabel(report.status) }}</span>
        </article>
      </div>
    </section>
  </section>
</template>

<style src="../styles/pages/admin.css"></style>
