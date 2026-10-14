<script setup>
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

const API = "/api";
const appRoot = ref(null);
const token = ref(localStorage.getItem("cm-token") || "");
const user = ref(null);
const page = ref("discover");
const lastListPage = ref("discover");
const activities = ref([]);
const interests = ref([]);
const notifications = ref([]);
const stats = ref({});
const selected = ref(null);
const query = ref("");
const category = ref("全部");
const showAuth = ref(false);
const authMode = ref("login");
const busy = ref(false);
const loading = ref(true);
const loadError = ref("");
const dialog = ref(false);
const applicantsOpen = ref(false);
const editing = ref(false);
const form = ref(emptyActivity());
const applications = ref([]);
const myApplications = ref([]);
const myActivities = ref([]);
const favoriteList = ref([]);
const reports = ref([]);
const adminActivities = ref([]);
const profile = ref({});
const availability = ref([]);
const reviews = ref([]);
const activeTab = ref("activities");
const authForm = ref({ email: "", password: "", name: "" });

const cats = ["全部", "运动", "户外", "学习", "生活", "社交", "艺术"];
const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const periods = ["上午", "下午", "晚上"];
const categoryIcons = {
  运动: "🏸",
  户外: "🌿",
  学习: "📚",
  生活: "☕",
  社交: "✦",
  艺术: "◒",
};

const headers = computed(() =>
  token.value ? { Authorization: `Bearer ${token.value}` } : {},
);
const unreadCount = computed(
  () => notifications.value.filter((item) => !item.read).length,
);
const activityKey = computed(() =>
  activities.value.map((activity) => activity.id).join(","),
);

function emptyActivity() {
  return {
    title: "",
    description: "",
    category: "运动",
    location: "",
    starts_at: "",
    ends_at: "",
    capacity: 6,
    interests: [],
    image: "",
  };
}

function formatDate(value, includeTime = false) {
  if (!value) return "时间待定";
  const options = includeTime
    ? {
        month: "numeric",
        day: "numeric",
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
      }
    : { month: "long", day: "numeric", weekday: "short" };
  return new Date(value).toLocaleString("zh-CN", options);
}

function iconFor(categoryName) {
  return categoryIcons[categoryName] || "✦";
}

async function api(path, opts = {}) {
  const response = await fetch(API + path, {
    ...opts,
    headers: {
      ...headers.value,
      ...opts.headers,
      ...(opts.body && !(opts.body instanceof FormData)
        ? { "Content-Type": "application/json" }
        : {}),
    },
  });
  let data = {};
  try {
    data = await response.json();
  } catch {}
  if (!response.ok) throw Error(data.error || "请求失败");
  return data;
}

function msg(error) {
  ElMessage.error(error.message || "操作失败");
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    activities.value = await api("/activities");
    interests.value = await api("/interests");
    if (token.value) {
      user.value = await api("/auth/me");
      notifications.value = await api("/notifications");
      stats.value = await api("/users/me/stats");
      profile.value = await api(`/users/${user.value.id}`);
    }
  } catch (error) {
    if (error.message === "请先登录") logout();
    else {
      loadError.value = error.message;
      msg(error);
    }
  } finally {
    loading.value = false;
  }
}

async function search() {
  loading.value = true;
  loadError.value = "";
  try {
    const params = new URLSearchParams();
    if (query.value) params.set("q", query.value);
    if (category.value !== "全部") params.set("category", category.value);
    activities.value = await api(`/activities?${params}`);
    page.value = "discover";
  } catch (error) {
    loadError.value = error.message;
    msg(error);
  } finally {
    loading.value = false;
  }
}

async function login() {
  busy.value = true;
  try {
    const data = await api(
      authMode.value === "login" ? "/auth/login" : "/auth/register",
      { method: "POST", body: JSON.stringify(authForm.value) },
    );
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem("cm-token", data.token);
    showAuth.value = false;
    authForm.value = { email: "", password: "", name: "" };
    ElMessage.success("欢迎来到 Campus Mate");
    await load();
  } catch (error) {
    msg(error);
  } finally {
    busy.value = false;
  }
}

function logout() {
  token.value = "";
  user.value = null;
  localStorage.removeItem("cm-token");
  page.value = "discover";
}

async function openDetail(activity) {
  try {
    if (page.value === "discover" || page.value === "recommend") {
      lastListPage.value = page.value;
    }
    selected.value = await api(`/activities/${activity.id}`);
    reviews.value = await api(`/users/${activity.creator_id}/reviews`).catch(
      () => [],
    );
    page.value = "detail";
    window.scrollTo({ top: 0, behavior: "smooth" });
  } catch (error) {
    msg(error);
  }
}

async function toggleFavorite(activity) {
  if (!token.value) return (showAuth.value = true);
  try {
    await api(`/activities/${activity.id}/favorite`, { method: "POST" });
    activity.is_favorite = !activity.is_favorite;
    ElMessage.success(activity.is_favorite ? "已收藏" : "已取消收藏");
  } catch (error) {
    msg(error);
  }
}

async function join(activity) {
  if (!token.value) return (showAuth.value = true);
  try {
    const { value } = await ElMessageBox.prompt(
      "给组织者留句话吧（可选）",
      "申请加入",
      { inputPlaceholder: "简单介绍一下自己" },
    );
    await api(`/activities/${activity.id}/applications`, {
      method: "POST",
      body: JSON.stringify({ message: value || "" }),
    });
    ElMessage.success("申请已发送，等待组织者审核");
  } catch (error) {
    if (error !== "cancel" && error !== "close") msg(error);
  }
}

function newActivity() {
  editing.value = false;
  form.value = emptyActivity();
  dialog.value = true;
}

function editActivity(activity) {
  editing.value = true;
  form.value = {
    ...activity,
    starts_at: activity.starts_at?.slice(0, 16),
    ends_at: activity.ends_at?.slice(0, 16),
  };
  dialog.value = true;
}

async function saveActivity() {
  try {
    const body = {
      ...form.value,
      starts_at: new Date(form.value.starts_at).toISOString(),
      ends_at: form.value.ends_at
        ? new Date(form.value.ends_at).toISOString()
        : null,
    };
    if (editing.value) {
      await api(`/activities/${form.value.id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
    } else {
      await api("/activities", {
        method: "POST",
        body: JSON.stringify(body),
      });
    }
    dialog.value = false;
    ElMessage.success(editing.value ? "活动已更新" : "活动发布成功");
    await load();
    if (page.value === "mine") await loadMine();
  } catch (error) {
    msg(error);
  }
}

async function loadMine() {
  try {
    [myActivities.value, myApplications.value] = await Promise.all([
      api("/users/me/activities"),
      api("/users/me/applications"),
    ]);
  } catch (error) {
    msg(error);
  }
}

async function navigate(destination) {
  page.value = destination;
  applicantsOpen.value = false;
  if (destination !== "detail") selected.value = null;
  if (destination === "mine") await loadMine();
  if (destination === "favorites") {
    favoriteList.value = await api("/favorites").catch(() => []);
  }
  if (destination === "profile") {
    profile.value = await api(`/users/${user.value.id}`);
    availability.value = await api("/users/me/availability");
    profile.value.availability = availability.value;
  }
  if (destination === "admin" && user.value?.role === "admin") {
    reports.value = await api("/admin/reports");
    adminActivities.value = await api("/admin/activities");
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function openApplicants(activity) {
  selected.value = activity;
  try {
    applications.value = await api(`/activities/${activity.id}/applications`);
    applicantsOpen.value = true;
  } catch (error) {
    msg(error);
  }
}

async function reviewApp(application, status) {
  try {
    await api(`/applications/${application.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    application.status = status;
    ElMessage.success(status === "approved" ? "已通过" : "已拒绝");
  } catch (error) {
    msg(error);
  }
}

async function withdraw(activity) {
  try {
    await ElMessageBox.confirm("确认退出这个活动吗？", "退出活动");
    await api(`/activities/${activity.id}/applications/me`, {
      method: "DELETE",
    });
    ElMessage.success("已退出");
    await loadMine();
  } catch (error) {
    if (error !== "cancel") msg(error);
  }
}

async function cancel(activity) {
  try {
    await ElMessageBox.confirm(
      "活动将标记为取消，成员会收到通知。",
      "取消活动",
    );
    await api(`/activities/${activity.id}`, { method: "DELETE" });
    await load();
    await loadMine();
  } catch (error) {
    if (error !== "cancel") msg(error);
  }
}

function toggleAvailability(weekday, period) {
  profile.value.availability = profile.value.availability || [];
  const index = profile.value.availability.findIndex(
    (item) => item.weekday === weekday && item.period === period,
  );
  if (index < 0) profile.value.availability.push({ weekday, period });
  else profile.value.availability.splice(index, 1);
}

async function saveProfile() {
  try {
    await api("/users/me", {
      method: "PATCH",
      body: JSON.stringify(profile.value),
    });
    ElMessage.success("资料已保存");
    await load();
  } catch (error) {
    msg(error);
  }
}

async function markRead(notification) {
  try {
    await api(`/notifications/${notification.id}/read`, { method: "PATCH" });
    notification.read = 1;
  } catch (error) {
    msg(error);
  }
}

async function markAllRead() {
  try {
    await api("/notifications/read-all", { method: "POST" });
    notifications.value.forEach((notification) => (notification.read = 1));
  } catch (error) {
    msg(error);
  }
}

async function report(activity) {
  try {
    const { value } = await ElMessageBox.prompt(
      "请描述举报原因",
      "举报活动",
    );
    await api("/reports", {
      method: "POST",
      body: JSON.stringify({
        target_type: "activity",
        target_id: activity.id,
        reason: value,
      }),
    });
    ElMessage.success("举报已提交，感谢反馈");
  } catch (error) {
    if (error !== "cancel") msg(error);
  }
}

async function recommend() {
  if (!token.value) return (showAuth.value = true);
  loading.value = true;
  try {
    activities.value = await api("/recommendations");
    page.value = "recommend";
  } catch (error) {
    msg(error);
  } finally {
    loading.value = false;
  }
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const data = new FormData();
  data.append("image", file);
  try {
    const uploaded = await api("/uploads", { method: "POST", body: data });
    form.value.image = uploaded.url;
    ElMessage.success("图片已上传");
  } catch (error) {
    msg(error);
  }
}

async function reportAction(item, status) {
  try {
    await api(`/admin/reports/${item.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    item.status = status;
  } catch (error) {
    msg(error);
  }
}

async function adminRemove(activity) {
  try {
    await api(`/admin/activities/${activity.id}`, { method: "DELETE" });
    activity.status = "removed";
  } catch (error) {
    msg(error);
  }
}

async function reviewMember(activityId, reviewee) {
  try {
    const { value } = await ElMessageBox.prompt(
      "写一句活动体验评价",
      "活动评价",
      { inputPlaceholder: "友善、守时、相处愉快…" },
    );
    await api(`/activities/${activityId}/reviews`, {
      method: "POST",
      body: JSON.stringify({
        reviewee_id: reviewee,
        rating: 5,
        comment: value || "",
      }),
    });
    ElMessage.success("评价已提交");
  } catch (error) {
    if (error !== "cancel") msg(error);
  }
}

async function showMembers() {
  try {
    const data = await api(`/activities/${selected.value.id}/contact`);
    ElMessage.info(data.members.map((member) => member.name).join("、"));
  } catch (error) {
    msg(error);
  }
}

function scrollToActivities() {
  document.querySelector("#activity-list")?.scrollIntoView({
    behavior: "smooth",
    block: "start",
  });
}

const vMotionHover = {
  mounted(element) {
    const reduced = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduced) return;
    const enter = () =>
      gsap.to(element, {
        y: -6,
        scale: 1.012,
        duration: 0.28,
        ease: "power2.out",
        overwrite: "auto",
      });
    const leave = () =>
      gsap.to(element, {
        y: 0,
        scale: 1,
        duration: 0.32,
        ease: "power3.out",
        overwrite: "auto",
      });
    element.addEventListener("pointerenter", enter);
    element.addEventListener("pointerleave", leave);
    element.__cmMotionCleanup = () => {
      element.removeEventListener("pointerenter", enter);
      element.removeEventListener("pointerleave", leave);
      gsap.killTweensOf(element);
    };
  },
  unmounted(element) {
    element.__cmMotionCleanup?.();
  },
};

let motionContext;
let motionMedia;
let motionFrame;

async function playPageMotion(includeHeader = false) {
  await nextTick();
  motionContext?.revert();
  motionMedia?.revert();
  if (!appRoot.value) return;

  const currentPage = appRoot.value.querySelector("[data-page]");
  if (!currentPage) return;

  motionContext = gsap.context(() => {
    motionMedia = gsap.matchMedia();
    motionMedia.add(
      {
        reduceMotion: "(prefers-reduced-motion: reduce)",
        allowMotion: "(prefers-reduced-motion: no-preference)",
      },
      ({ conditions }) => {
        if (conditions.reduceMotion) {
          gsap.set(
            currentPage.querySelectorAll(".motion-item, .motion-card"),
            { clearProps: "all" },
          );
          return;
        }

        const timeline = gsap.timeline({
          defaults: { duration: 0.62, ease: "power3.out" },
        });
        if (includeHeader) {
          timeline.from(".topbar", { autoAlpha: 0, y: -18, duration: 0.5 });
        }
        timeline.from(
          currentPage.querySelectorAll(".motion-item"),
          { autoAlpha: 0, y: 24, stagger: 0.08 },
          includeHeader ? "-=0.18" : 0,
        );

        const cards = currentPage.querySelectorAll(".motion-card");
        if (cards.length) {
          gsap.set(cards, { autoAlpha: 0, y: 28 });
          ScrollTrigger.batch(cards, {
            start: "top 92%",
            once: true,
            interval: 0.08,
            batchMax: 4,
            onEnter: (batch) =>
              gsap.to(batch, {
                autoAlpha: 1,
                y: 0,
                duration: 0.58,
                stagger: 0.07,
                ease: "power3.out",
                overwrite: true,
              }),
          });
        }

        const floatingItems = currentPage.querySelectorAll(".hero-float");
        if (floatingItems.length) {
          gsap.to(floatingItems, {
            y: (index) => (index % 2 ? -8 : 8),
            rotation: (index) => (index % 2 ? 1.2 : -1.2),
            duration: 2.4,
            stagger: 0.18,
            repeat: -1,
            yoyo: true,
            ease: "sine.inOut",
          });
        }

        gsap.fromTo(
          ".scroll-progress",
          { scaleX: 0 },
          {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: currentPage,
              start: "top top",
              end: "bottom bottom",
              scrub: 0.25,
            },
          },
        );
      },
    );
  }, appRoot.value);
  ScrollTrigger.refresh();
}

function scheduleMotion(includeHeader = false) {
  cancelAnimationFrame(motionFrame);
  motionFrame = requestAnimationFrame(() => playPageMotion(includeHeader));
}

watch(page, () => scheduleMotion());
watch(activityKey, () => scheduleMotion());
watch(activeTab, () => scheduleMotion());

onMounted(async () => {
  await load();
  scheduleMotion(true);
});

onUnmounted(() => {
  cancelAnimationFrame(motionFrame);
  motionContext?.revert();
  motionMedia?.revert();
});
</script>

<template>
  <div ref="appRoot" class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <div class="scroll-progress" aria-hidden="true"></div>

    <header class="topbar">
      <button class="brand" type="button" @click="navigate('discover')">
        <span class="brand-mark"><i></i><i></i><i></i></span>
        <span class="brand-word">campus<strong>mate</strong><small>校园里的同路人</small></span>
      </button>
      <nav aria-label="主要导航">
        <button :class="{ active: page === 'discover' || page === 'detail' }" @click="navigate('discover')">发现活动</button>
        <button :class="{ active: page === 'recommend' }" @click="recommend">为你推荐 <span class="spark">✦</span></button>
        <button v-if="token" :class="{ active: page === 'mine' }" @click="navigate('mine')">我的活动</button>
        <button v-if="token" class="mobile-nav-only" :class="{ active: page === 'notifications' }" @click="navigate('notifications')">通知</button>
        <button v-if="token" class="mobile-nav-only" :class="{ active: page === 'profile' }" @click="navigate('profile')">我的</button>
      </nav>
      <div class="top-actions">
        <el-input v-model="query" class="search" placeholder="搜索活动或地点" clearable @keyup.enter="search"><template #prefix>⌕</template></el-input>
        <el-badge v-if="token" :value="unreadCount" :hidden="!unreadCount"><button class="icon-btn" aria-label="查看通知" @click="navigate('notifications')">◇</button></el-badge>
        <el-dropdown v-if="token">
          <button class="user-chip"><span class="avatar">{{ user?.name?.[0] }}</span><span>{{ user?.name }}</span><span aria-hidden="true">⌄</span></button>
          <template #dropdown><el-dropdown-menu><el-dropdown-item @click="navigate('profile')">个人主页</el-dropdown-item><el-dropdown-item @click="navigate('favorites')">我的收藏</el-dropdown-item><el-dropdown-item v-if="user?.role === 'admin'" @click="navigate('admin')">管理后台</el-dropdown-item><el-dropdown-item divided @click="logout">退出登录</el-dropdown-item></el-dropdown-menu></template>
        </el-dropdown>
        <el-button v-else class="auth-trigger" text @click="showAuth = true">登录</el-button>
        <el-button class="publish-action" type="primary" @click="token ? newActivity() : (showAuth = true)">发布活动</el-button>
      </div>
    </header>

    <main id="main-content" :aria-busy="loading">
      <div v-if="page === 'discover' || page === 'recommend'" class="motion-page discover-page" data-page>
        <section class="hero">
          <div class="hero-copy">
            <div class="eyebrow motion-item"><span class="pulse"></span>{{ page === "recommend" ? "按兴趣和时间匹配" : "今天，在校园遇见谁" }}</div>
            <h1 class="motion-item">想做的事，<br /><em>刚好有人一起。</em></h1>
            <p class="motion-item">从球场、自习室到城市边缘的小路。找一个真实活动，认识一群愿意出发的人。</p>
            <div class="hero-buttons motion-item"><el-button type="primary" size="large" @click="scrollToActivities">浏览活动 <span>↓</span></el-button><button class="quiet-action" @click="token ? newActivity() : (showAuth = true)">发起一个活动 <span>↗</span></button></div>
            <dl class="hero-metrics motion-item"><div><dt>{{ activities.length }}</dt><dd>{{ page === "recommend" ? "项匹配" : "项可参加活动" }}</dd></div><div><dt>{{ cats.length - 1 }}</dt><dd>种校园兴趣</dd></div></dl>
          </div>
          <div class="hero-board motion-item" aria-label="近期活动预览">
            <div class="board-label">近期活动 / LIVE BOARD</div>
            <button v-for="(activity, index) in activities.slice(0, 3)" :key="activity.id" v-motion-hover class="board-card hero-float" :class="`board-card-${index + 1}`" @click="openDetail(activity)"><span class="board-icon">{{ iconFor(activity.category) }}</span><span><b>{{ activity.title }}</b><small>{{ formatDate(activity.starts_at, true) }}</small><small>{{ activity.location }} · {{ activity.member_count }}/{{ activity.capacity }} 人</small></span></button>
            <div v-if="!activities.length" class="board-empty"><span>✦</span><p>新的校园计划正在酝酿</p></div>
            <div class="board-orbit orbit-one"></div><div class="board-orbit orbit-two"></div>
          </div>
        </section>

        <section id="activity-list" class="content">
          <div class="section-heading motion-item"><div><div class="eyebrow muted">活动公告板</div><h2>{{ page === "recommend" ? "为你挑选" : "正在发生的校园生活" }}</h2><p>先看时间与地点，再决定和谁一起出发。</p></div><button v-if="page === 'recommend'" class="text-link" @click="category = '全部'; search()">查看全部 <span>→</span></button></div>
          <div class="filter-row motion-item"><div class="category-pills" role="list" aria-label="活动分类"><button v-for="item in cats" :key="item" :class="{ chosen: category === item }" @click="category = item; search()">{{ item }}</button></div><span class="result-count">{{ activities.length }} 项结果</span></div>
          <div v-if="loading" class="activity-grid skeleton-grid" aria-label="正在加载活动"><div v-for="index in 4" :key="index" class="skeleton-card"><span></span><i></i><i></i><i></i></div></div>
          <div v-else-if="loadError" class="state-panel error-state"><span>连接暂时中断</span><h3>活动列表没有加载成功</h3><p>{{ loadError }}</p><el-button type="primary" @click="load">重新加载</el-button></div>
          <div v-else-if="activities.length" class="activity-grid">
            <article v-for="(activity, index) in activities" :key="activity.id" v-motion-hover class="activity-card motion-card" :class="{ featured: index === 0 && page === 'discover' }" tabindex="0" @click="openDetail(activity)" @keyup.enter="openDetail(activity)">
              <div class="activity-cover" :class="`cover-${activity.category}`" :style="activity.image ? { backgroundImage: `linear-gradient(0deg,rgba(21,39,34,.6),transparent 65%),url(${activity.image})` } : {}"><span class="tag">{{ activity.category }}</span><button class="heart" :class="{ hearted: activity.is_favorite }" :aria-label="activity.is_favorite ? '取消收藏' : '收藏活动'" @click.stop="toggleFavorite(activity)">{{ activity.is_favorite ? "♥" : "♡" }}</button><span v-if="!activity.image" class="cover-emoji">{{ iconFor(activity.category) }}</span><span class="cover-caption">{{ activity.location }}</span></div>
              <div class="activity-info"><div class="date-line">{{ formatDate(activity.starts_at, true) }}</div><h3>{{ activity.title }}</h3><p>{{ activity.description }}</p><div class="card-bottom"><span class="host"><span class="small-avatar">{{ activity.creator_name?.[0] }}</span>{{ activity.creator_name }}</span><span class="member-count">{{ activity.member_count }} / {{ activity.capacity }} 人</span></div></div>
            </article>
          </div>
          <div v-else class="state-panel empty-state"><span>⌕</span><h3>这块公告板还是空的</h3><p>换一个分类或关键词，也可以发起第一个活动。</p><el-button @click="category = '全部'; query = ''; search()">清除筛选</el-button></div>
        </section>
      </div>

      <section v-else-if="page === 'mine' || page === 'favorites'" class="dashboard motion-page" data-page>
        <div class="section-heading motion-item"><div><div class="eyebrow muted">我的校园日程</div><h2>{{ page === "mine" ? "我的活动" : "收藏夹" }}</h2><p>{{ page === "mine" ? "组织、审核和赴约，都集中在这里。" : "暂时收藏，等一个合适的时间出发。" }}</p></div><el-button v-if="page === 'mine'" type="primary" @click="newActivity">发布活动</el-button></div>
        <div v-if="page === 'mine'" class="stats-row motion-item"><div v-motion-hover><b>{{ stats.published || 0 }}</b><span>发起活动</span></div><div v-motion-hover><b>{{ stats.joined || 0 }}</b><span>参与活动</span></div><div v-motion-hover><b>{{ stats.hostedMembers || 0 }}</b><span>结识同伴</span></div><div v-motion-hover><b>★ {{ stats.averageRating || "—" }}</b><span>收到评价</span></div></div>
        <div v-if="page === 'mine'" class="tabs motion-item" role="tablist"><button :class="{ selected: activeTab === 'activities' }" @click="activeTab = 'activities'">我发起的</button><button :class="{ selected: activeTab === 'applications' }" @click="activeTab = 'applications'">我参加的</button></div>
        <div v-if="page === 'favorites' || activeTab === 'activities'" class="activity-grid">
          <article v-for="activity in page === 'favorites' ? favoriteList : myActivities" :key="activity.id" v-motion-hover class="activity-card motion-card"><div class="activity-cover" :class="`cover-${activity.category}`" :style="activity.image ? { backgroundImage: `linear-gradient(0deg,rgba(21,39,34,.58),transparent 65%),url(${activity.image})` } : {}" @click="openDetail(activity)"><span class="tag">{{ activity.category }}</span><button v-if="page === 'favorites'" class="heart hearted" aria-label="取消收藏" @click.stop="toggleFavorite(activity)">♥</button><span v-if="!activity.image" class="cover-emoji">{{ iconFor(activity.category) }}</span></div><div class="activity-info"><div class="date-line">{{ formatDate(activity.starts_at, true) }}</div><h3>{{ activity.title }}</h3><p>{{ activity.location }}</p><div class="card-bottom"><span>{{ activity.member_count }} / {{ activity.capacity }} 人</span><div v-if="page === 'mine'" class="inline-actions"><el-button size="small" @click="openApplicants(activity)">报名管理 <span v-if="activity.pending_count" class="pending">{{ activity.pending_count }}</span></el-button><el-button size="small" @click="editActivity(activity)">编辑</el-button><el-button size="small" type="danger" plain @click="cancel(activity)">取消</el-button></div></div></div></article>
          <div v-if="!(page === 'favorites' ? favoriteList : myActivities).length" class="state-panel empty-state motion-card"><span>＋</span><h3>这里还没有活动</h3><p>从发现页收藏一个计划，或者自己发起。</p></div>
        </div>
        <div v-else class="application-list motion-item"><div v-for="activity in myApplications" :key="activity.application_id" class="application-row"><div><h3>{{ activity.title }}</h3><p>{{ activity.location }} · {{ formatDate(activity.starts_at, true) }}</p></div><span class="status" :class="activity.status">{{ { pending: "待审核", approved: "已通过", rejected: "未通过" }[activity.status] || activity.status }}</span><el-button v-if="activity.status === 'approved'" size="small" @click="reviewMember(activity.id, activity.creator_id)">评价搭子</el-button><el-button size="small" @click="withdraw(activity)">退出</el-button></div><div v-if="!myApplications.length" class="state-panel empty-state"><span>○</span><h3>还没有参加活动</h3><p>从发现页找一个感兴趣的计划。</p></div></div>
      </section>

      <section v-else-if="page === 'notifications'" class="dashboard motion-page" data-page><div class="section-heading motion-item"><div><div class="eyebrow muted">消息中心</div><h2>通知</h2><p>报名结果和活动变化会留在这里。</p></div><el-button text :disabled="!unreadCount" @click="markAllRead">全部标为已读</el-button></div><div class="notification-list motion-item"><button v-for="notification in notifications" :key="notification.id" :class="{ unread: !notification.read }" @click="markRead(notification)"><span class="notif-icon">✦</span><span class="notification-copy"><b>{{ notification.title }}</b><span>{{ notification.body }}</span><small>{{ new Date(notification.created_at + "Z").toLocaleString("zh-CN") }}</small></span><i v-if="!notification.read"></i></button><div v-if="!notifications.length" class="state-panel empty-state"><span>◇</span><h3>暂时没有新消息</h3><p>报名和活动动态会出现在这里。</p></div></div></section>

      <section v-else-if="page === 'profile'" class="dashboard profile-page motion-page" data-page>
        <div class="section-heading motion-item"><div><div class="eyebrow muted">个人档案</div><h2>让搭子先认识你</h2><p>兴趣、专业与空闲时间，会帮助推荐更合适的活动。</p></div></div>
        <div class="profile-layout"><aside v-motion-hover class="profile-card motion-item"><span class="profile-avatar">{{ user?.name?.[0] }}</span><h2>{{ user?.name }}</h2><p>{{ profile.major || "专业尚未填写" }} · {{ profile.year || "年级尚未填写" }}</p><div class="interest-tags"><span v-for="interest in profile.interests || []" :key="interest">{{ interest }}</span></div><hr /><div class="profile-stats"><div><b>{{ stats.joined || 0 }}</b><small>参与活动</small></div><div><b>{{ stats.reviews || 0 }}</b><small>收到评价</small></div><div><b>{{ stats.averageRating || "—" }}</b><small>平均评分</small></div></div></aside>
          <section class="profile-edit motion-item"><div class="form-section-heading"><span>01</span><div><h3>基本资料</h3><p>这些信息会显示在公开主页。</p></div></div><label>昵称</label><el-input v-model="profile.name" /><label>个人介绍</label><el-input v-model="profile.bio" type="textarea" :rows="3" placeholder="介绍一下你的兴趣和期待…" /><div class="form-cols"><div><label>专业</label><el-input v-model="profile.major" placeholder="例如：设计学院" /></div><div><label>年级</label><el-input v-model="profile.year" placeholder="例如：大二" /></div></div><label>兴趣标签</label><el-select v-model="profile.interests" multiple placeholder="选择感兴趣的事" style="width: 100%"><el-option v-for="interest in interests" :key="interest.id" :label="interest.name" :value="interest.name" /></el-select><div class="form-section-heading schedule-heading"><span>02</span><div><h3>空闲时间</h3><p>选择通常有空的时间段。</p></div></div><div class="availability-grid"><div v-for="(day, index) in days" :key="day"><b>{{ day }}</b><button v-for="period in periods" :key="period" :class="{ picked: (profile.availability || []).some((item) => item.weekday === index && item.period === period) }" @click="toggleAvailability(index, period)">{{ period }}</button></div></div><el-button type="primary" @click="saveProfile">保存资料</el-button></section>
        </div>
      </section>

      <section v-else-if="page === 'admin' && user?.role === 'admin'" class="dashboard motion-page" data-page><div class="section-heading motion-item"><div><div class="eyebrow muted">社区治理</div><h2>内容管理</h2><p>处理举报并维护活动秩序。</p></div></div><div class="admin-grid"><section class="admin-panel motion-item"><div class="panel-heading"><h3>待处理举报</h3><span>{{ reports.length }}</span></div><div class="application-list"><div v-for="item in reports" :key="item.id" class="application-row"><div><b>{{ item.target_type }} #{{ item.target_id }} · {{ item.reason }}</b><p>来自 {{ item.reporter_name }} · {{ item.created_at }}</p></div><span class="status">{{ item.status }}</span><el-button size="small" type="primary" @click="reportAction(item, 'resolved')">处理完成</el-button><el-button size="small" @click="reportAction(item, 'dismissed')">忽略</el-button></div><div v-if="!reports.length" class="state-panel empty-state"><span>✓</span><h3>没有待处理举报</h3></div></div></section><section class="admin-panel motion-item"><div class="panel-heading"><h3>活动列表</h3><span>{{ adminActivities.length }}</span></div><div class="application-list"><div v-for="activity in adminActivities" :key="activity.id" class="application-row"><div><b>{{ activity.title }}</b><p>{{ activity.creator_name }} · {{ activity.status }}</p></div><el-button v-if="activity.status === 'open'" type="danger" size="small" plain @click="adminRemove(activity)">下架</el-button></div></div></section></div></section>

      <section v-else-if="page === 'detail'" class="detail-page motion-page" data-page><button class="back-link motion-item" @click="navigate(lastListPage)">← 返回活动列表</button><article v-if="selected" class="detail-panel"><div class="detail-visual motion-item" :class="`cover-${selected.category}`" :style="selected.image ? { backgroundImage: `linear-gradient(0deg,rgba(19,37,32,.55),transparent 70%),url(${selected.image})` } : {}"><span class="detail-category">{{ selected.category }}</span><span v-if="!selected.image" class="detail-icon hero-float">{{ iconFor(selected.category) }}</span><p>{{ selected.location }}</p></div><div class="detail-body"><div class="eyebrow muted motion-item">活动详情 / {{ selected.category }}</div><h1 class="motion-item">{{ selected.title }}</h1><p class="detail-desc motion-item">{{ selected.description }}</p><dl class="detail-facts motion-item"><div><dt>时间</dt><dd>{{ formatDate(selected.starts_at, true) }}</dd></div><div><dt>地点</dt><dd>{{ selected.location }}</dd></div><div><dt>人数</dt><dd>{{ selected.member_count }} / {{ selected.capacity }} 位成员</dd></div></dl><div class="host-detail motion-item"><span class="avatar">{{ selected.creator_name?.[0] }}</span><div><b>{{ selected.creator_name }}</b><small>活动发起人</small></div><el-button v-if="selected.creator_id === user?.id" @click="openApplicants(selected)">管理报名</el-button><el-button v-else type="primary" @click="join(selected)">申请加入</el-button></div><div v-if="selected.creator_id === user?.id || selected.is_member" class="privacy-hint motion-item"><span>联系信息只向组织者和已通过成员开放。</span><el-button size="small" @click="showMembers">查看成员</el-button></div><div v-if="reviews.length" class="review-strip motion-item"><span>★ {{ reviews[0].rating }}</span><p>“{{ reviews[0].comment || "值得一起参加活动的校园伙伴" }}”</p></div><button class="danger-link motion-item" @click="report(selected)">举报此活动</button></div></article><div v-else class="state-panel empty-state"><span>○</span><h3>没有找到活动</h3><el-button @click="navigate('discover')">返回发现页</el-button></div></section>

      <section v-else class="dashboard motion-page" data-page><div class="state-panel empty-state motion-item"><span>404</span><h3>页面走远了</h3><p>回到活动公告板继续看看。</p><el-button type="primary" @click="navigate('discover')">返回发现页</el-button></div></section>
    </main>

    <footer><div class="brand footer-brand"><span class="brand-mark"><i></i><i></i><i></i></span><span class="brand-word">campus<strong>mate</strong></span></div><span>让校园生活，多一个同行的人。</span><span>© 2026 Campus Mate</span></footer>

    <el-dialog v-model="showAuth" width="430" class="auth-dialog" :show-close="true"><div class="dialog-heading"><span class="brand-mark large"><i></i><i></i><i></i></span><div class="eyebrow">加入校园同路人</div><h2>{{ authMode === "login" ? "欢迎回来" : "创建账号" }}</h2><p>登录后可以报名、收藏并获得兴趣推荐。</p></div><el-form @submit.prevent="login"><el-form-item v-if="authMode === 'register'"><el-input v-model="authForm.name" placeholder="你的昵称" size="large" /></el-form-item><el-form-item><el-input v-model="authForm.email" placeholder="校园邮箱" size="large" /></el-form-item><el-form-item><el-input v-model="authForm.password" type="password" show-password placeholder="密码（至少 8 位）" size="large" @keyup.enter="login" /></el-form-item><el-button type="primary" size="large" class="full-btn" :loading="busy" @click="login">{{ authMode === "login" ? "登录" : "创建账号" }}</el-button></el-form><p class="switch-auth">{{ authMode === "login" ? "还没有账号？" : "已经有账号？" }} <button @click="authMode = authMode === 'login' ? 'register' : 'login'">{{ authMode === "login" ? "立即注册" : "去登录" }}</button></p><div v-if="authMode === 'login'" class="demo-tip">演示账号：alice@campus.test / mate1234</div></el-dialog>

    <el-dialog v-model="dialog" :title="editing ? '编辑活动' : '发起一个活动'" width="640" class="activity-dialog"><div class="dialog-intro"><span>把时间、地点和期待说清楚，更容易遇到合适的搭子。</span></div><el-form label-position="top"><el-form-item label="活动名称"><el-input v-model="form.title" placeholder="例如：周五晚羽毛球双打" /></el-form-item><div class="form-cols"><el-form-item label="活动类型"><el-select v-model="form.category"><el-option v-for="item in cats.slice(1)" :key="item" :label="item" :value="item" /></el-select></el-form-item><el-form-item label="活动地点"><el-input v-model="form.location" placeholder="例如：体育馆 2 号馆" /></el-form-item></div><div class="form-cols"><el-form-item label="开始时间"><el-date-picker v-model="form.starts_at" type="datetime" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DDTHH:mm" placeholder="选择时间" /></el-form-item><el-form-item label="结束时间"><el-date-picker v-model="form.ends_at" type="datetime" format="YYYY-MM-DD HH:mm" value-format="YYYY-MM-DDTHH:mm" placeholder="可选" /></el-form-item></div><div class="form-cols"><el-form-item label="人数上限"><el-input-number v-model="form.capacity" :min="2" :max="100" /></el-form-item><el-form-item label="兴趣标签"><el-select v-model="form.interests" multiple placeholder="选择相关兴趣"><el-option v-for="interest in interests" :key="interest.id" :label="interest.name" :value="interest.name" /></el-select></el-form-item></div><el-form-item label="活动介绍"><el-input v-model="form.description" type="textarea" :rows="4" placeholder="介绍活动内容、适合人群和需要准备的东西…" /></el-form-item><el-form-item label="活动图片"><label class="upload-box"><span>＋ 上传 JPG / PNG / WebP，最大 5MB</span><input type="file" accept="image/png,image/jpeg,image/webp" hidden @change="uploadImage" /><img v-if="form.image" :src="form.image" alt="活动图片预览" /></label></el-form-item></el-form><template #footer><el-button @click="dialog = false">取消</el-button><el-button type="primary" @click="saveActivity">{{ editing ? "保存修改" : "发布活动" }}</el-button></template></el-dialog>

    <el-dialog v-model="applicantsOpen" title="报名管理" width="600" class="applicants-dialog"><div v-for="application in applications" :key="application.id" class="applicant-row"><span class="avatar">{{ application.name?.[0] }}</span><div class="applicant-info"><b>{{ application.name }}</b><small>{{ application.major || "同学" }} · {{ application.year || "" }}</small><p>{{ application.message || "期待一起参加" }}</p></div><span class="status" :class="application.status">{{ application.status === "pending" ? "待审核" : application.status === "approved" ? "已通过" : "未通过" }}</span><template v-if="application.status === 'pending'"><el-button size="small" type="primary" @click="reviewApp(application, 'approved')">通过</el-button><el-button size="small" @click="reviewApp(application, 'rejected')">拒绝</el-button></template></div><div v-if="!applications.length" class="state-panel empty-state"><span>○</span><h3>还没有人报名</h3></div></el-dialog>
  </div>
</template>
