<script setup>
import { computed, onMounted, ref } from "vue";
import { ElMessage, ElMessageBox } from "element-plus";
const API = "/api",
  token = ref(localStorage.getItem("cm-token") || ""),
  user = ref(null),
  page = ref("discover"),
  activities = ref([]),
  interests = ref([]),
  notifications = ref([]),
  stats = ref({}),
  selected = ref(null),
  query = ref(""),
  category = ref("全部"),
  showAuth = ref(false),
  authMode = ref("login"),
  busy = ref(false),
  dialog = ref(false),
  editing = ref(false),
  form = ref({
    title: "",
    description: "",
    category: "运动",
    location: "",
    starts_at: "",
    ends_at: "",
    capacity: 6,
    interests: [],
  }),
  applications = ref([]),
  myApplications = ref([]),
  myActivities = ref([]),
  favoriteList = ref([]),
  reports = ref([]),
  adminActivities = ref([]),
  profile = ref({}),
  availability = ref([]),
  reviews = ref([]),
  activeTab = ref("activities");
const cats = ["全部", "运动", "户外", "学习", "生活", "社交", "艺术"];
const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
const periods = ["上午", "下午", "晚上"];
const headers = computed(() =>
  token.value ? { Authorization: `Bearer ${token.value}` } : {},
);
async function api(path, opts = {}) {
  const r = await fetch(API + path, {
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
    data = await r.json();
  } catch {}
  if (!r.ok) throw Error(data.error || "请求失败");
  return data;
}
function msg(e) {
  ElMessage.error(e.message || "操作失败");
}
async function load() {
  try {
    activities.value = await api("/activities");
    interests.value = await api("/interests");
    if (token.value) {
      user.value = await api("/auth/me");
      notifications.value = await api("/notifications");
      stats.value = await api("/users/me/stats");
      profile.value = await api(`/users/${user.value.id}`);
    }
  } catch (e) {
    if (e.message === "请先登录") logout();
    else msg(e);
  }
}
async function search() {
  try {
    const p = new URLSearchParams();
    if (query.value) p.set("q", query.value);
    if (category.value !== "全部") p.set("category", category.value);
    activities.value = await api(`/activities?${p}`);
  } catch (e) {
    msg(e);
  }
}
async function login() {
  busy.value = true;
  try {
    const d = await api(
      authMode.value === "login" ? "/auth/login" : "/auth/register",
      { method: "POST", body: JSON.stringify(authForm.value) },
    );
    token.value = d.token;
    user.value = d.user;
    localStorage.setItem("cm-token", d.token);
    showAuth.value = false;
    authForm.value = { email: "", password: "", name: "" };
    ElMessage.success("欢迎来到 Campus Mate");
    await load();
  } catch (e) {
    msg(e);
  } finally {
    busy.value = false;
  }
}
const authForm = ref({ email: "", password: "", name: "" });
function logout() {
  token.value = "";
  user.value = null;
  localStorage.removeItem("cm-token");
  page.value = "discover";
}
async function openDetail(a) {
  try {
    selected.value = await api(`/activities/${a.id}`);
    reviews.value = await api(`/users/${a.creator_id}/reviews`).catch(() => []);
  } catch (e) {
    msg(e);
  }
}
async function toggleFavorite(a) {
  if (!token.value) return (showAuth.value = true);
  try {
    await api(`/activities/${a.id}/favorite`, { method: "POST" });
    a.is_favorite = !a.is_favorite;
    ElMessage.success(a.is_favorite ? "已收藏" : "已取消收藏");
  } catch (e) {
    msg(e);
  }
}
async function join(a) {
  if (!token.value) return (showAuth.value = true);
  try {
    const { value } = await ElMessageBox.prompt(
      "给组织者留句话吧（可选）",
      "申请加入",
      { inputPlaceholder: "简单介绍一下自己" },
    );
    await api(`/activities/${a.id}/applications`, {
      method: "POST",
      body: JSON.stringify({ message: value || "" }),
    });
    ElMessage.success("申请已发送，等待组织者审核");
  } catch (e) {
    if (e !== "cancel" && e !== "close") msg(e);
  }
}
function newActivity() {
  editing.value = false;
  form.value = {
    title: "",
    description: "",
    category: "运动",
    location: "",
    starts_at: "",
    ends_at: "",
    capacity: 6,
    interests: [],
  };
  dialog.value = true;
}
function editActivity(a) {
  editing.value = true;
  form.value = {
    ...a,
    starts_at: a.starts_at?.slice(0, 16),
    ends_at: a.ends_at?.slice(0, 16),
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
    const a = editing.value
      ? await api(`/activities/${form.value.id}`, {
          method: "PATCH",
          body: JSON.stringify(body),
        })
      : await api("/activities", {
          method: "POST",
          body: JSON.stringify(body),
        });
    dialog.value = false;
    ElMessage.success(editing.value ? "活动已更新" : "活动发布成功");
    await load();
    if (page.value === "mine") await loadMine();
  } catch (e) {
    msg(e);
  }
}
async function loadMine() {
  try {
    [myActivities.value, myApplications.value] = await Promise.all([
      api("/users/me/activities"),
      api("/users/me/applications"),
    ]);
  } catch (e) {
    msg(e);
  }
}
async function navigate(p) {
  page.value = p;
  if (p === "mine") await loadMine();
  if (p === "favorites")
    favoriteList.value = await api("/favorites").catch(() => []);
  if (p === "profile") {
    profile.value = await api(`/users/${user.value.id}`);
    availability.value = await api("/users/me/availability");
    profile.value.availability = availability.value;
  }
  if (p === "admin" && user.value?.role === "admin") {
    reports.value = await api("/admin/reports");
    adminActivities.value = await api("/admin/activities");
  }
}
async function openApplicants(a) {
  selected.value = a;
  try {
    applications.value = await api(`/activities/${a.id}/applications`);
  } catch (e) {
    msg(e);
  }
}
async function reviewApp(x, status) {
  try {
    await api(`/applications/${x.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    x.status = status;
    ElMessage.success(status === "approved" ? "已通过" : "已拒绝");
  } catch (e) {
    msg(e);
  }
}
async function withdraw(a) {
  try {
    await ElMessageBox.confirm("确认退出这个活动吗？", "退出活动");
    await api(`/activities/${a.id}/applications/me`, { method: "DELETE" });
    ElMessage.success("已退出");
    await loadMine();
  } catch (e) {
    if (e !== "cancel") msg(e);
  }
}
async function cancel(a) {
  try {
    await ElMessageBox.confirm(
      "活动将标记为取消，成员会收到通知。",
      "取消活动",
    );
    await api(`/activities/${a.id}`, { method: "DELETE" });
    await load();
    await loadMine();
  } catch (e) {
    if (e !== "cancel") msg(e);
  }
}
function toggleAvailability(weekday, period) {
  profile.value.availability = profile.value.availability || [];
  const at = profile.value.availability.findIndex(
    (x) => x.weekday === weekday && x.period === period,
  );
  at < 0
    ? profile.value.availability.push({ weekday, period })
    : profile.value.availability.splice(at, 1);
}
async function saveProfile() {
  try {
    await api("/users/me", {
      method: "PATCH",
      body: JSON.stringify(profile.value),
    });
    ElMessage.success("资料已保存");
    await load();
  } catch (e) {
    msg(e);
  }
}
async function markRead(n) {
  try {
    await api(`/notifications/${n.id}/read`, { method: "PATCH" });
    n.read = 1;
  } catch (e) {
    msg(e);
  }
}
async function report(a) {
  try {
    const { value } = await ElMessageBox.prompt("请描述举报原因", "举报活动");
    await api("/reports", {
      method: "POST",
      body: JSON.stringify({
        target_type: "activity",
        target_id: a.id,
        reason: value,
      }),
    });
    ElMessage.success("举报已提交，感谢反馈");
  } catch (e) {
    if (e !== "cancel") msg(e);
  }
}
async function recommend() {
  try {
    activities.value = await api("/recommendations");
    page.value = "recommend";
  } catch (e) {
    msg(e);
  }
}
async function uploadImage(ev) {
  const f = ev.target.files?.[0];
  if (!f) return;
  const data = new FormData();
  data.append("image", f);
  try {
    const x = await api("/uploads", { method: "POST", body: data });
    form.value.image = x.url;
    ElMessage.success("图片已上传");
  } catch (e) {
    msg(e);
  }
}
async function reportAction(r, status) {
  try {
    await api(`/admin/reports/${r.id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    r.status = status;
  } catch (e) {
    msg(e);
  }
}
async function adminRemove(a) {
  try {
    await api(`/admin/activities/${a.id}`, { method: "DELETE" });
    a.status = "removed";
  } catch (e) {
    msg(e);
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
  } catch (e) {
    if (e !== "cancel") msg(e);
  }
}
onMounted(load);
</script>
<template>
  <div class="app-shell">
    <header class="topbar">
      <a class="brand" @click="navigate('discover')"
        ><span class="brand-icon">C</span
        ><span
          >campus<span class="brand-light">mate</span
          ><small>让校园生活，多一个同行的人</small></span
        ></a
      >
      <nav>
        <a
          :class="{ active: page === 'discover' }"
          @click="navigate('discover')"
          >发现活动</a
        ><a @click="recommend">为你推荐 <span class="spark">✦</span></a
        ><a
          v-if="token"
          :class="{ active: page === 'mine' }"
          @click="navigate('mine')"
          >我的活动</a
        >
      </nav>
      <div class="top-actions">
        <el-input
          v-model="query"
          placeholder="搜活动、地点…"
          class="search"
          @keyup.enter="search"
          ><template #prefix>⌕</template></el-input
        ><el-badge
          v-if="token"
          :value="notifications.filter((n) => !n.read).length"
          :hidden="!notifications.some((n) => !n.read)"
          ><button class="icon-btn" @click="navigate('notifications')">
            ♧
          </button></el-badge
        ><el-dropdown v-if="token"
          ><button class="user-chip">
            <span class="avatar">{{ user?.name?.[0] }}</span
            >{{ user?.name }}⌄</button
          ><template #dropdown
            ><el-dropdown-menu
              ><el-dropdown-item @click="navigate('profile')"
                >个人主页</el-dropdown-item
              ><el-dropdown-item @click="navigate('favorites')"
                >我的收藏</el-dropdown-item
              ><el-dropdown-item
                v-if="user?.role === 'admin'"
                @click="navigate('admin')"
                >管理后台</el-dropdown-item
              ><el-dropdown-item divided @click="logout"
                >退出登录</el-dropdown-item
              ></el-dropdown-menu
            ></template
          ></el-dropdown
        ><el-button v-else text @click="showAuth = true">登录</el-button
        ><el-button
          type="primary"
          round
          @click="token ? newActivity() : (showAuth = true)"
          >＋ 发布活动</el-button
        >
      </div>
    </header>
    <main>
      <template v-if="page === 'discover' || page === 'recommend'"
        ><section class="hero">
          <div class="hero-copy">
            <div class="eyebrow">
              <span class="pulse"></span> CAMPUS LIFE, TOGETHER
            </div>
            <h1>好玩的事，<br /><em>和对的人一起。</em></h1>
            <p>
              找个球友、饭搭子，或一起探索校园周边。<br />下一段校园记忆，也许从这里开始。
            </p>
            <div class="hero-buttons">
              <el-button
                type="primary"
                size="large"
                round
                @click="document?.querySelector?.('#activity-list')"
                >探索活动 <span>↗</span></el-button
              ><el-button
                size="large"
                round
                plain
                @click="token ? newActivity() : (showAuth = true)"
                >＋ 发起一个活动</el-button
              >
            </div>
            <div class="social-proof">
              <div class="avatar-stack">
                <i>L</i><i>陈</i><i>周</i><i>＋</i>
              </div>
              <span><b>1,200+</b> 位同学正在寻找搭子</span>
            </div>
          </div>
          <div class="hero-art">
            <div class="sun"></div>
            <div class="hero-card card-one">
              <div class="mini-photo photo-run">🏸</div>
              <div><b>周五羽毛球</b><small>今晚 19:00 · 还差 2 人</small></div>
              <span class="live-dot"></span>
            </div>
            <div class="hero-card card-two">
              <div class="mini-photo photo-hike">🥾</div>
              <div><b>周末去徒步</b><small>周六 · 4 位同学参加</small></div>
              <span class="live-dot"></span>
            </div>
            <div class="hero-card card-three">
              <div class="mini-photo photo-coffee">☕</div>
              <div><b>咖啡与自习</b><small>明天下午 · 图书馆</small></div>
            </div>
            <div class="person-illustration">
              <div class="blob"></div>
              <div class="person-head">☀</div>
              <div class="person-body">✦</div>
            </div>
            <div class="hero-note">
              ✺ <span>你的校园<br />生活新搭子</span>
            </div>
          </div>
        </section>
        <section class="content" id="activity-list">
          <div class="section-heading">
            <div>
              <div class="eyebrow muted">FIND YOUR PEOPLE</div>
              <h2>
                {{ page === "recommend" ? "为你挑选" : "正在发生的校园生活" }}
              </h2>
              <p>总有一件想做的事，刚好有人也想一起。</p>
            </div>
            <button
              class="text-link"
              @click="
                page = 'discover';
                search();
              "
            >
              查看全部 <span>→</span>
            </button>
          </div>
          <div class="filter-row">
            <div class="category-pills">
              <button
                v-for="c in cats"
                :key="c"
                :class="{ chosen: category === c }"
                @click="
                  category = c;
                  search();
                "
              >
                {{ c }}
              </button>
            </div>
            <button class="filter-control">☷ <span>筛选</span></button>
          </div>
          <div v-if="activities.length" class="activity-grid">
            <article
              v-for="a in activities"
              :key="a.id"
              class="activity-card"
              @click="openDetail(a)"
            >
              <div
                class="activity-cover"
                :class="'cover-' + a.category"
                :style="
                  a.image
                    ? {
                        backgroundImage: `linear-gradient(0deg,#12242d88,transparent),url(${a.image})`,
                      }
                    : {}
                "
              >
                <span class="tag">{{ a.category }}</span
                ><button
                  class="heart"
                  :class="{ hearted: a.is_favorite }"
                  @click.stop="toggleFavorite(a)"
                >
                  {{ a.is_favorite ? "♥" : "♡" }}</button
                ><span class="cover-emoji">{{
                  a.category === "运动"
                    ? "🏸"
                    : a.category === "户外"
                      ? "🌿"
                      : a.category === "学习"
                        ? "📚"
                        : a.category === "生活"
                          ? "☕"
                          : "✦"
                }}</span>
                <div class="cover-caption">{{ a.location }}</div>
              </div>
              <div class="activity-info">
                <div class="date-line">
                  {{
                    new Date(a.starts_at).toLocaleDateString("zh-CN", {
                      month: "long",
                      day: "numeric",
                      weekday: "short",
                    })
                  }}
                  ·
                  {{
                    new Date(a.starts_at).toLocaleTimeString("zh-CN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  }}
                </div>
                <h3>{{ a.title }}</h3>
                <p>{{ a.description }}</p>
                <div class="card-bottom">
                  <span class="host"
                    ><span class="small-avatar">{{ a.creator_name?.[0] }}</span
                    >{{ a.creator_name }}</span
                  ><span class="member-count"
                    >♧ {{ a.member_count }} / {{ a.capacity }} 人</span
                  >
                </div>
              </div>
            </article>
          </div>
          <div v-else class="empty">
            还没有找到合适的活动，试试换个关键词吧。
          </div>
        </section></template
      >
      <section
        v-else-if="page === 'mine' || page === 'favorites'"
        class="dashboard"
      >
        <div class="section-heading">
          <div>
            <div class="eyebrow muted">YOUR CAMPUS JOURNEY</div>
            <h2>{{ page === "mine" ? "我的活动" : "我的收藏" }}</h2>
            <p>
              {{
                page === "mine"
                  ? "看看你发起和加入的校园小计划。"
                  : "想做的事，先收好。"
              }}
            </p>
          </div>
          <el-button
            v-if="page === 'mine'"
            type="primary"
            round
            @click="newActivity"
            >＋ 发布活动</el-button
          >
        </div>
        <div v-if="page === 'mine'" class="stats-row">
          <div>
            <b>{{ stats.published || 0 }}</b
            ><span>发起活动</span>
          </div>
          <div>
            <b>{{ stats.joined || 0 }}</b
            ><span>参与活动</span>
          </div>
          <div>
            <b>{{ stats.hostedMembers || 0 }}</b
            ><span>结识同伴</span>
          </div>
          <div>
            <b>★ {{ stats.averageRating || "—" }}</b
            ><span>收到评价</span>
          </div>
        </div>
        <div class="tabs">
          <button
            :class="{ selected: activeTab === 'activities' }"
            @click="activeTab = 'activities'"
          >
            我发起的</button
          ><button
            :class="{ selected: activeTab === 'applications' }"
            @click="activeTab = 'applications'"
          >
            我参加的
          </button>
        </div>
        <div
          v-if="page === 'favorites' || activeTab === 'activities'"
          class="activity-grid"
        >
          <article
            v-for="a in page === 'favorites' ? favoriteList : myActivities"
            :key="a.id"
            class="activity-card"
          >
            <div
              class="activity-cover"
              :class="'cover-' + a.category"
              @click="openDetail(a)"
            >
              <span class="tag">{{ a.category }}</span
              ><button
                v-if="page === 'favorites'"
                class="heart hearted"
                @click.stop="toggleFavorite(a)"
              >
                ♥</button
              ><span class="cover-emoji">✦</span>
            </div>
            <div class="activity-info">
              <h3>{{ a.title }}</h3>
              <p>
                {{ a.location }} ·
                {{
                  new Date(a.starts_at).toLocaleString("zh-CN", {
                    month: "numeric",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                }}
              </p>
              <div class="card-bottom">
                <span>{{ a.member_count }} / {{ a.capacity }} 人</span>
                <div v-if="page === 'mine'" class="inline-actions">
                  <el-button size="small" @click="openApplicants(a)"
                    >报名管理
                    <span v-if="a.pending_count" class="pending">{{
                      a.pending_count
                    }}</span></el-button
                  ><el-button size="small" @click="editActivity(a)"
                    >编辑</el-button
                  ><el-button
                    size="small"
                    type="danger"
                    plain
                    @click="cancel(a)"
                    >取消</el-button
                  >
                </div>
              </div>
            </div>
          </article>
          <div
            v-if="!(page === 'favorites' ? favoriteList : myActivities).length"
            class="empty"
          >
            这里还没有活动。
          </div>
        </div>
        <div v-else class="application-list">
          <div
            v-for="a in myApplications"
            :key="a.application_id"
            class="application-row"
          >
            <div>
              <h3>{{ a.title }}</h3>
              <p>
                {{ a.location }} ·
                {{ new Date(a.starts_at).toLocaleString("zh-CN") }}
              </p>
            </div>
            <span class="status" :class="a.status">{{
              { pending: "待审核", approved: "已通过", rejected: "未通过" }[
                a.status
              ] || a.status
            }}</span
            ><el-button
              v-if="a.status === 'approved'"
              size="small"
              @click="reviewMember(a.id, a.creator_id)"
              >评价活动搭子</el-button
            ><el-button size="small" @click="withdraw(a)">退出</el-button>
          </div>
        </div>
      </section>
      <section v-else-if="page === 'notifications'" class="dashboard">
        <div class="section-heading">
          <div>
            <div class="eyebrow muted">INBOX</div>
            <h2>消息通知</h2>
            <p>报名和活动动态都在这里。</p>
          </div>
          <el-button
            text
            @click="
              api('/notifications/read-all', { method: 'POST' }).then(() =>
                notifications.forEach((n) => (n.read = 1)),
              )
            "
            >全部标为已读</el-button
          >
        </div>
        <div class="notification-list">
          <div
            v-for="n in notifications"
            :class="{ unread: !n.read }"
            @click="markRead(n)"
          >
            <span class="notif-icon">✦</span>
            <div>
              <b>{{ n.title }}</b>
              <p>{{ n.body }}</p>
              <small>{{
                new Date(n.created_at + "Z").toLocaleString("zh-CN")
              }}</small>
            </div>
            <i v-if="!n.read"></i>
          </div>
          <p v-if="!notifications.length" class="empty">暂时没有新消息。</p>
        </div>
      </section>
      <section v-else-if="page === 'profile'" class="dashboard profile-page">
        <div class="section-heading">
          <div>
            <div class="eyebrow muted">YOUR PROFILE</div>
            <h2>个人主页</h2>
            <p>让同学更了解你，一起找到兴趣相投的搭子。</p>
          </div>
        </div>
        <div class="profile-layout">
          <div class="profile-card">
            <span class="profile-avatar">{{ user?.name?.[0] }}</span>
            <h2>{{ user?.name }}</h2>
            <p>
              {{ profile.major || "专业尚未填写" }} ·
              {{ profile.year || "年级尚未填写" }}
            </p>
            <div class="interest-tags">
              <span v-for="i in profile.interests || []">{{ i }}</span>
            </div>
            <hr />
            <div class="profile-stats">
              <div>
                <b>{{ stats.joined || 0 }}</b
                ><small>参与活动</small>
              </div>
              <div>
                <b>{{ stats.reviews || 0 }}</b
                ><small>收到评价</small>
              </div>
              <div>
                <b>{{ stats.averageRating || "—" }}</b
                ><small>平均评分</small>
              </div>
            </div>
          </div>
          <div class="profile-edit">
            <h3>编辑资料</h3>
            <label>昵称</label><el-input v-model="profile.name" /><label
              >个人介绍</label
            ><el-input
              v-model="profile.bio"
              type="textarea"
              :rows="3"
              placeholder="介绍一下你的兴趣和期待…"
            />
            <div class="form-cols">
              <div>
                <label>专业</label
                ><el-input
                  v-model="profile.major"
                  placeholder="例如：设计学院"
                />
              </div>
              <div>
                <label>年级</label
                ><el-input v-model="profile.year" placeholder="例如：大二" />
              </div>
            </div>
            <label>兴趣标签</label
            ><el-select
              v-model="profile.interests"
              multiple
              placeholder="选择感兴趣的事"
              style="width: 100%"
              ><el-option
                v-for="i in interests"
                :key="i.id"
                :label="i.name"
                :value="i.name" /></el-select
            ><label>每周空闲时间偏好</label>
            <div class="availability-grid">
              <div v-for="(day, index) in days" :key="day">
                <b>{{ day }}</b
                ><button
                  v-for="period in periods"
                  :key="period"
                  :class="{
                    picked: (profile.availability || []).some(
                      (x) => x.weekday === index && x.period === period,
                    ),
                  }"
                  @click="toggleAvailability(index, period)"
                >
                  {{ period }}
                </button>
              </div>
            </div>
            <el-button type="primary" round @click="saveProfile"
              >保存资料</el-button
            >
          </div>
        </div>
      </section>
      <section
        v-else-if="page === 'admin' && user?.role === 'admin'"
        class="dashboard"
      >
        <div class="section-heading">
          <div>
            <div class="eyebrow muted">CAMPUS MATE ADMIN</div>
            <h2>内容管理</h2>
            <p>处理同学举报，维护活动社区秩序。</p>
          </div>
        </div>
        <h3>待处理举报</h3>
        <div class="application-list">
          <div v-for="r in reports" class="application-row">
            <div>
              <b>{{ r.target_type }} #{{ r.target_id }} · {{ r.reason }}</b>
              <p>来自 {{ r.reporter_name }} · {{ r.created_at }}</p>
            </div>
            <span class="status">{{ r.status }}</span
            ><el-button
              size="small"
              type="primary"
              @click="reportAction(r, 'resolved')"
              >处理完成</el-button
            ><el-button size="small" @click="reportAction(r, 'dismissed')"
              >忽略</el-button
            >
          </div>
          <p v-if="!reports.length" class="empty">没有待处理举报。</p>
        </div>
        <h3 class="admin-subhead">活动列表</h3>
        <div class="application-list">
          <div v-for="a in adminActivities" class="application-row">
            <b>{{ a.title }}</b
            ><span>{{ a.creator_name }} · {{ a.status }}</span
            ><el-button
              v-if="a.status === 'open'"
              type="danger"
              size="small"
              @click="adminRemove(a)"
              >下架活动</el-button
            >
          </div>
        </div>
      </section>
      <section v-else class="dashboard">
        <el-button text @click="navigate('discover')">← 返回活动</el-button>
        <div v-if="selected" class="detail-panel">
          <div class="detail-cover" :class="'cover-' + selected.category">
            <span>{{ selected.category === "运动" ? "🏸" : "🌿" }}</span>
          </div>
          <div class="detail-body">
            <div class="eyebrow muted">
              {{ selected.category }} · {{ selected.location }}
            </div>
            <h1>{{ selected.title }}</h1>
            <p class="detail-desc">{{ selected.description }}</p>
            <div class="detail-meta">
              <span
                >◷
                {{ new Date(selected.starts_at).toLocaleString("zh-CN") }}</span
              ><span
                >♧ {{ selected.member_count }} /
                {{ selected.capacity }} 位成员</span
              >
            </div>
            <div class="host-detail">
              <span class="avatar">{{ selected.creator_name?.[0] }}</span>
              <div>
                <b>{{ selected.creator_name }}</b
                ><small>活动发起人</small>
              </div>
              <el-button
                v-if="selected.creator_id === user?.id"
                @click="openApplicants(selected)"
                >管理报名</el-button
              ><el-button v-else type="primary" round @click="join(selected)"
                >申请加入</el-button
              >
            </div>
            <div
              v-if="selected.creator_id === user?.id || selected.is_member"
              class="privacy-hint"
            >
              🔒 联系方式仅对组织者和已通过成员开放。<el-button
                size="small"
                @click="
                  api(`/activities/${selected.id}/contact`)
                    .then((d) =>
                      ElMessage.info(d.members.map((m) => m.name).join('、')),
                    )
                    .catch(msg)
                "
                >查看成员</el-button
              >
            </div>
            <el-button text type="danger" @click="report(selected)"
              >举报活动</el-button
            >
          </div>
        </div>
        <div v-else class="empty">请选择一项活动查看详情。</div>
      </section>
    </main>
    <footer>
      <div class="brand small-brand">
        <span class="brand-icon">C</span
        ><span>campus<span class="brand-light">mate</span></span>
      </div>
      <span>让校园生活，多一个同行的人。</span><span>© 2026 Campus Mate</span>
    </footer>
    <el-dialog
      v-model="showAuth"
      width="430"
      class="auth-dialog"
      :show-close="true"
      ><div class="dialog-heading">
        <div class="brand-icon">C</div>
        <h2>{{ authMode === "login" ? "欢迎回来" : "加入 Campus Mate" }}</h2>
        <p>找到一起分享校园生活的人。</p>
      </div>
      <el-form @submit.prevent="login"
        ><el-form-item v-if="authMode === 'register'"
          ><el-input
            v-model="authForm.name"
            placeholder="你的昵称"
            size="large" /></el-form-item
        ><el-form-item
          ><el-input
            v-model="authForm.email"
            placeholder="校园邮箱"
            size="large" /></el-form-item
        ><el-form-item
          ><el-input
            v-model="authForm.password"
            type="password"
            show-password
            placeholder="密码（至少 8 位）"
            size="large"
            @keyup.enter="login" /></el-form-item
        ><el-button
          type="primary"
          size="large"
          round
          class="full-btn"
          :loading="busy"
          @click="login"
          >{{ authMode === "login" ? "登录" : "创建账号" }}</el-button
        ></el-form
      >
      <p class="switch-auth">
        {{ authMode === "login" ? "还没有账号？" : "已经有账号？" }}
        <a @click="authMode = authMode === 'login' ? 'register' : 'login'">{{
          authMode === "login" ? "立即注册" : "去登录"
        }}</a>
      </p>
      <div v-if="authMode === 'login'" class="demo-tip">
        演示账号：alice@campus.test / mate1234
      </div></el-dialog
    >
    <el-dialog
      v-model="dialog"
      :title="editing ? '编辑活动' : '发起一个活动'"
      width="600"
      class="activity-dialog"
      ><el-form label-position="top"
        ><el-form-item label="活动名称"
          ><el-input v-model="form.title" placeholder="例如：周五晚羽毛球双打"
        /></el-form-item>
        <div class="form-cols">
          <el-form-item label="活动类型"
            ><el-select v-model="form.category"
              ><el-option
                v-for="c in cats.slice(1)"
                :key="c"
                :label="c"
                :value="c" /></el-select></el-form-item
          ><el-form-item label="活动地点"
            ><el-input
              v-model="form.location"
              placeholder="例如：体育馆 2 号馆"
          /></el-form-item>
        </div>
        <div class="form-cols">
          <el-form-item label="开始时间"
            ><el-date-picker
              v-model="form.starts_at"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              placeholder="选择时间" /></el-form-item
          ><el-form-item label="结束时间"
            ><el-date-picker
              v-model="form.ends_at"
              type="datetime"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DDTHH:mm"
              placeholder="可选"
          /></el-form-item>
        </div>
        <div class="form-cols">
          <el-form-item label="人数上限"
            ><el-input-number
              v-model="form.capacity"
              :min="2"
              :max="100" /></el-form-item
          ><el-form-item label="兴趣标签"
            ><el-select
              v-model="form.interests"
              multiple
              placeholder="选几个相关兴趣"
              ><el-option
                v-for="i in interests"
                :key="i.id"
                :label="i.name"
                :value="i.name" /></el-select
          ></el-form-item>
        </div>
        <el-form-item label="活动介绍"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            placeholder="介绍活动内容、适合人群和需要准备的东西…" /></el-form-item
        ><el-form-item label="活动图片"
          ><label class="upload-box"
            >＋ 上传活动图片（JPG / PNG / WebP，最大 5MB）<input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              @change="uploadImage"
              hidden /><img
              v-if="form.image"
              :src="form.image" /></label></el-form-item></el-form
      ><template #footer
        ><el-button @click="dialog = false">取消</el-button
        ><el-button type="primary" round @click="saveActivity">{{
          editing ? "保存修改" : "发布活动"
        }}</el-button></template
      ></el-dialog
    >
    <el-dialog
      v-if="selected && applications.length >= 0"
      v-model="selected"
      title="报名管理"
      width="580"
      class="applicants-dialog"
      :before-close="() => (selected = null)"
      ><div v-for="x in applications" class="applicant-row">
        <span class="avatar">{{ x.name?.[0] }}</span>
        <div class="applicant-info">
          <b>{{ x.name }}</b
          ><small>{{ x.major || "同学" }} · {{ x.year || "" }}</small>
          <p>{{ x.message || "期待一起参加" }}</p>
        </div>
        <span class="status" :class="x.status">{{
          x.status === "pending"
            ? "待审核"
            : x.status === "approved"
              ? "已通过"
              : "未通过"
        }}</span
        ><template v-if="x.status === 'pending'"
          ><el-button
            size="small"
            type="primary"
            @click="reviewApp(x, 'approved')"
            >通过</el-button
          ><el-button size="small" @click="reviewApp(x, 'rejected')"
            >拒绝</el-button
          ></template
        >
      </div>
      <p v-if="!applications.length" class="empty">还没有人报名。</p></el-dialog
    >
  </div>
</template>
