import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";

const API = "/api";
let router;
let initializationPromise;

const token = ref(localStorage.getItem("cm-token") || "");
const user = ref(null);
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
const activityDialogOpen = ref(false);
const applicantsOpen = ref(false);
const editing = ref(false);
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

export const cats = ["全部", "运动", "户外", "学习", "生活", "社交", "艺术"];
export const days = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
export const periods = ["上午", "下午", "晚上"];
const categoryIcons = { 运动: "🏃", 户外: "🌿", 学习: "📚", 生活: "☕", 社交: "✦", 艺术: "●" };

const form = ref(emptyActivity());
const headers = computed(() => (token.value ? { Authorization: `Bearer ${token.value}` } : {}));
const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length);

function emptyActivity() {
  return { title: "", description: "", category: "运动", location: "", starts_at: "", ends_at: "", capacity: 6, interests: [], image: "" };
}

export function formatDate(value, includeTime = false) {
  if (!value) return "时间待定";
  const options = includeTime
    ? { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }
    : { month: "long", day: "numeric", weekday: "short" };
  return new Date(value).toLocaleString("zh-CN", options);
}

export function iconFor(categoryName) {
  return categoryIcons[categoryName] || "✦";
}

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      ...headers.value,
      ...options.headers,
      ...(options.body && !(options.body instanceof FormData) ? { "Content-Type": "application/json" } : {}),
    },
  });
  let data = {};
  try { data = await response.json(); } catch {}
  if (!response.ok) throw Error(data.error || "请求失败");
  return data;
}

function showError(error) {
  ElMessage.error(error.message || "操作失败");
}

async function load() {
  loading.value = true;
  loadError.value = "";
  try {
    [activities.value, interests.value] = await Promise.all([api("/activities"), api("/interests")]);
    if (token.value) {
      user.value = await api("/auth/me");
      [notifications.value, stats.value, profile.value] = await Promise.all([
        api("/notifications"),
        api("/users/me/stats"),
        api(`/users/${user.value.id}`),
      ]);
    }
  } catch (error) {
    if (error.message === "请先登录") logout();
    else { loadError.value = error.message; showError(error); }
  } finally {
    loading.value = false;
  }
}

async function initialize() {
  initializationPromise ||= load();
  await initializationPromise;
}

async function search() {
  loading.value = true;
  loadError.value = "";
  try {
    const params = new URLSearchParams();
    if (query.value) params.set("q", query.value);
    if (category.value !== "全部") params.set("category", category.value);
    activities.value = await api(`/activities?${params}`);
    if (router.currentRoute.value.name !== "discover") await router.push({ name: "discover" });
  } catch (error) {
    loadError.value = error.message;
    showError(error);
  } finally { loading.value = false; }
}

async function login() {
  busy.value = true;
  try {
    const data = await api(authMode.value === "login" ? "/auth/login" : "/auth/register", {
      method: "POST",
      body: JSON.stringify(authForm.value),
    });
    token.value = data.token;
    user.value = data.user;
    localStorage.setItem("cm-token", data.token);
    showAuth.value = false;
    authForm.value = { email: "", password: "", name: "" };
    ElMessage.success("欢迎来到 Campus Mate");
    await load();
    const redirect = router.currentRoute.value.query.redirect;
    if (redirect) await router.push(String(redirect));
  } catch (error) { showError(error); }
  finally { busy.value = false; }
}

function logout() {
  token.value = "";
  user.value = null;
  localStorage.removeItem("cm-token");
  router?.push({ name: "discover" });
}

async function openDetail(activity) {
  await router.push({ name: "activity-detail", params: { id: activity.id } });
}

async function loadActivity(id) {
  loading.value = true;
  try {
    selected.value = await api(`/activities/${id}`);
    reviews.value = await api(`/users/${selected.value.creator_id}/reviews`).catch(() => []);
  } catch (error) {
    selected.value = null;
    showError(error);
  } finally { loading.value = false; }
}

async function toggleFavorite(activity) {
  if (!token.value) return (showAuth.value = true);
  try {
    await api(`/activities/${activity.id}/favorite`, { method: "POST" });
    activity.is_favorite = !activity.is_favorite;
    ElMessage.success(activity.is_favorite ? "已收藏" : "已取消收藏");
  } catch (error) { showError(error); }
}

async function join(activity) {
  if (!token.value) return (showAuth.value = true);
  try {
    const { value } = await ElMessageBox.prompt("给组织者留句话吧（可选）", "申请加入", { inputPlaceholder: "简单介绍一下自己" });
    await api(`/activities/${activity.id}/applications`, { method: "POST", body: JSON.stringify({ message: value || "" }) });
    ElMessage.success("申请已发送，等待组织者审核");
  } catch (error) { if (error !== "cancel" && error !== "close") showError(error); }
}

function newActivity() {
  editing.value = false;
  form.value = emptyActivity();
  activityDialogOpen.value = true;
}

function editActivity(activity) {
  editing.value = true;
  form.value = { ...activity, starts_at: activity.starts_at?.slice(0, 16), ends_at: activity.ends_at?.slice(0, 16) };
  activityDialogOpen.value = true;
}

async function saveActivity() {
  try {
    const body = {
      ...form.value,
      starts_at: new Date(form.value.starts_at).toISOString(),
      ends_at: form.value.ends_at ? new Date(form.value.ends_at).toISOString() : null,
    };
    await api(editing.value ? `/activities/${form.value.id}` : "/activities", {
      method: editing.value ? "PATCH" : "POST",
      body: JSON.stringify(body),
    });
    activityDialogOpen.value = false;
    ElMessage.success(editing.value ? "活动已更新" : "活动发布成功");
    await load();
    if (router.currentRoute.value.name === "my-activities") await loadMine();
  } catch (error) { showError(error); }
}

async function loadMine() {
  try {
    [myActivities.value, myApplications.value] = await Promise.all([api("/users/me/activities"), api("/users/me/applications")]);
  } catch (error) { showError(error); }
}

async function loadFavorites() {
  try { favoriteList.value = await api("/favorites"); }
  catch (error) { showError(error); }
}

async function loadProfile() {
  if (!user.value) await load();
  if (!user.value) return;
  try {
    [profile.value, availability.value] = await Promise.all([api(`/users/${user.value.id}`), api("/users/me/availability")]);
    profile.value.availability = availability.value;
  } catch (error) { showError(error); }
}

async function loadAdmin() {
  if (!user.value) await load();
  if (user.value?.role !== "admin") return router.push({ name: "not-found" });
  try { [reports.value, adminActivities.value] = await Promise.all([api("/admin/reports"), api("/admin/activities")]); }
  catch (error) { showError(error); }
}

async function openApplicants(activity) {
  selected.value = activity;
  try { applications.value = await api(`/activities/${activity.id}/applications`); applicantsOpen.value = true; }
  catch (error) { showError(error); }
}

async function reviewApp(application, status) {
  try {
    await api(`/applications/${application.id}`, { method: "PATCH", body: JSON.stringify({ status }) });
    application.status = status;
    ElMessage.success(status === "approved" ? "已通过" : "已拒绝");
  } catch (error) { showError(error); }
}

async function withdraw(activity) {
  try {
    await ElMessageBox.confirm("确认退出这个活动吗？", "退出活动");
    await api(`/activities/${activity.id}/applications/me`, { method: "DELETE" });
    ElMessage.success("已退出");
    await loadMine();
  } catch (error) { if (error !== "cancel") showError(error); }
}

async function cancel(activity) {
  try {
    await ElMessageBox.confirm("活动将标记为取消，成员会收到通知。", "取消活动");
    await api(`/activities/${activity.id}`, { method: "DELETE" });
    await Promise.all([load(), loadMine()]);
  } catch (error) { if (error !== "cancel") showError(error); }
}

function toggleAvailability(weekday, period) {
  profile.value.availability ||= [];
  const index = profile.value.availability.findIndex((item) => item.weekday === weekday && item.period === period);
  if (index < 0) profile.value.availability.push({ weekday, period });
  else profile.value.availability.splice(index, 1);
}

async function saveProfile() {
  try { await api("/users/me", { method: "PATCH", body: JSON.stringify(profile.value) }); ElMessage.success("资料已保存"); await load(); }
  catch (error) { showError(error); }
}

async function markRead(notification) {
  try { await api(`/notifications/${notification.id}/read`, { method: "PATCH" }); notification.read = 1; }
  catch (error) { showError(error); }
}

async function markAllRead() {
  try { await api("/notifications/read-all", { method: "POST" }); notifications.value.forEach((item) => (item.read = 1)); }
  catch (error) { showError(error); }
}

async function report(activity) {
  try {
    const { value } = await ElMessageBox.prompt("请描述举报原因", "举报活动");
    await api("/reports", { method: "POST", body: JSON.stringify({ target_type: "activity", target_id: activity.id, reason: value }) });
    ElMessage.success("举报已提交，感谢反馈");
  } catch (error) { if (error !== "cancel") showError(error); }
}

async function recommend() {
  if (!token.value) return (showAuth.value = true);
  loading.value = true;
  try { activities.value = await api("/recommendations"); }
  catch (error) { showError(error); }
  finally { loading.value = false; }
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const data = new FormData();
  data.append("image", file);
  try { form.value.image = (await api("/uploads", { method: "POST", body: data })).url; ElMessage.success("图片已上传"); }
  catch (error) { showError(error); }
}

async function reportAction(item, status) {
  try { await api(`/admin/reports/${item.id}`, { method: "PATCH", body: JSON.stringify({ status }) }); item.status = status; }
  catch (error) { showError(error); }
}

async function adminRemove(activity) {
  try { await api(`/admin/activities/${activity.id}`, { method: "DELETE" }); activity.status = "removed"; }
  catch (error) { showError(error); }
}

async function reviewMember(activityId, reviewee) {
  try {
    const { value } = await ElMessageBox.prompt("写一句活动体验评价", "活动评价", { inputPlaceholder: "友善、守时、相处愉快…" });
    await api(`/activities/${activityId}/reviews`, { method: "POST", body: JSON.stringify({ reviewee_id: reviewee, rating: 5, comment: value || "" }) });
    ElMessage.success("评价已提交");
  } catch (error) { if (error !== "cancel") showError(error); }
}

async function showMembers() {
  try { const data = await api(`/activities/${selected.value.id}/contact`); ElMessage.info(data.members.map((member) => member.name).join("、")); }
  catch (error) { showError(error); }
}

const campus = {
  token, user, activities, interests, notifications, stats, selected, query, category,
  showAuth, authMode, busy, loading, loadError, activityDialogOpen, applicantsOpen,
  editing, form, applications, myApplications, myActivities, favoriteList, reports,
  adminActivities, profile, availability, reviews, activeTab, authForm, unreadCount,
  initialize, load, search, login, logout, openDetail, loadActivity, toggleFavorite,
  join, newActivity, editActivity, saveActivity, loadMine, loadFavorites, loadProfile,
  loadAdmin, openApplicants, reviewApp, withdraw, cancel, toggleAvailability,
  saveProfile, markRead, markAllRead, report, recommend, uploadImage, reportAction,
  adminRemove, reviewMember, showMembers,
};

export function useCampus() {
  router ||= useRouter();
  return campus;
}
