import { computed, ref } from "vue";
import { useRouter } from "vue-router";
import { ElMessage, ElMessageBox } from "element-plus";

const API = "/api";
let router;
let initializationPromise;

const token = ref(localStorage.getItem("cm-token") || "");
const user = ref(null);
const activities = ref([]);
const recommendations = ref([]);
const recommendationLoading = ref(false);
const interests = ref([]);
const categories = ref([]);
const notifications = ref([]);
const stats = ref({});
const selected = ref(null);
const query = ref("");
const category = ref("全部");
const showAuth = ref(false);
const authMode = ref("login");
const busy = ref(false);
const avatarUploading = ref(false);
const loading = ref(true);
const loadError = ref("");
const activityDialogOpen = ref(false);
const applicantsOpen = ref(false);
const cancellationOpen = ref(false);
const cancellationTarget = ref(null);
const cancellationBusy = ref(false);
const cancellationForm = ref({ reason: "", announcement: "" });
const editing = ref(false);
const applications = ref([]);
const memberOrganizer = ref(null);
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

export const cats = computed(() => ["全部", ...categories.value.map((item) => item.name)]);
export const days = [
  { label: "周一", weekday: 1 },
  { label: "周二", weekday: 2 },
  { label: "周三", weekday: 3 },
  { label: "周四", weekday: 4 },
  { label: "周五", weekday: 5 },
  { label: "周六", weekday: 6 },
  { label: "周日", weekday: 0 },
];
export const periods = [
  { value: "1-2", label: "上午 1", time: "08:20–09:55" },
  { value: "3-4", label: "上午 2", time: "10:15–11:50" },
  { value: "5-6", label: "下午 1", time: "14:20–15:55" },
  { value: "7-8", label: "下午 2", time: "16:15–17:50" },
  { value: "19:00-21:00", label: "晚 1", time: "19:00–21:00" },
  { value: "21:00-23:00", label: "晚 2", time: "21:00–23:00" },
];

const legacyPeriodMap = {
  上午: ["1-2", "3-4"],
  下午: ["5-6", "7-8"],
  晚上: ["19:00-21:00", "21:00-23:00"],
};
const categoryIcons = { 运动: "🏃", 户外: "🌿", 学习: "📚", 生活: "☕", 社交: "✦", 艺术: "●", 文化: "🎬" };

const form = ref(emptyActivity());
const headers = computed(() => (token.value ? { Authorization: `Bearer ${token.value}` } : {}));
const unreadCount = computed(() => notifications.value.filter((item) => !item.read).length);

function emptyActivity() {
  return { title: "", description: "", category: categories.value[0]?.name || "运动", location: "", starts_at: "", ends_at: "", capacity: 6, interests: [], image: "" };
}

export function formatDate(value, includeTime = false) {
  if (!value) return "时间待定";
  const options = includeTime
    ? { month: "numeric", day: "numeric", weekday: "short", hour: "2-digit", minute: "2-digit" }
    : { month: "long", day: "numeric", weekday: "short" };
  return new Date(value).toLocaleString("zh-CN", options);
}

export function iconFor(categoryName) {
  return categories.value.find((item) => item.name === categoryName)?.icon || categoryIcons[categoryName] || "✦";
}

export function coverStyle(activity, overlay = "rgba(21,39,34,.6)") {
  const cover = activity?.image || activity?.category_cover;
  return cover
    ? { backgroundImage: `linear-gradient(0deg,${overlay},transparent 68%),url(${cover})` }
    : {};
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
    [activities.value, interests.value, categories.value] = await Promise.all([
      api("/activities"),
      api("/interests"),
      api("/categories"),
    ]);
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
    if (token.value && selected.value?.creator_id !== user.value?.id) {
      const joined = await api("/users/me/applications").catch(() => []);
      const record = joined.find((item) => Number(item.id) === Number(id));
      if (record) {
        selected.value.application_status = record.status;
        selected.value.is_member = record.status === "approved";
      }
    }
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
    availability.value = availability.value.flatMap((item) => {
      const replacements = legacyPeriodMap[item.period];
      return replacements
        ? replacements.map((period) => ({ weekday: item.weekday, period }))
        : [item];
    }).filter((item, index, list) =>
      list.findIndex((candidate) =>
        candidate.weekday === item.weekday && candidate.period === item.period
      ) === index
    );
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
  memberOrganizer.value = null;
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
  cancellationTarget.value = activity;
  cancellationForm.value = { reason: "", announcement: "" };
  cancellationOpen.value = true;
}

async function submitCancellation() {
  if (cancellationBusy.value) return;
  const { reason, announcement } = cancellationForm.value;
  if (!reason.trim() || !announcement.trim()) return ElMessage.warning("请填写取消原因和公告内容");
  cancellationBusy.value = true;
  try {
    const id = cancellationTarget.value.id;
    await api(`/activities/${id}`, { method: "DELETE", body: JSON.stringify({ reason, announcement }) });
    cancellationOpen.value = false;
    favoriteList.value = favoriteList.value.filter((item) => item.id !== id);
    if (selected.value?.id === id) selected.value = null;
    await Promise.all([load(), loadMine()]);
    ElMessage.success("活动已删除，取消通知已发送");
  } catch (error) { showError(error); }
  finally { cancellationBusy.value = false; }
}

function toggleAvailability(weekday, period) {
  profile.value.availability ||= [];
  const index = profile.value.availability.findIndex((item) => item.weekday === weekday && item.period === period);
  if (index < 0) profile.value.availability.push({ weekday, period });
  else profile.value.availability.splice(index, 1);
}

async function saveProfile() {
  try {
    await api("/users/me", { method: "PATCH", body: JSON.stringify(profile.value) });
    await load();
    await loadProfile();
    ElMessage.success("资料已保存");
  }
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

async function deleteNotification(notification) {
  if (notification.deleting) return;
  try {
    await ElMessageBox.confirm("确定删除这条通知吗？", "删除通知", { type: "warning", confirmButtonText: "删除", cancelButtonText: "保留" });
    if (notification.deleting) return;
    notification.deleting = true;
    await api(`/notifications/${notification.id}`, { method: "DELETE" });
    notifications.value = notifications.value.filter((item) => item.id !== notification.id);
    ElMessage.success("通知已删除");
  } catch (error) {
    if (error !== "cancel" && error !== "close") showError(error);
  } finally { notification.deleting = false; }
}

async function report(activity) {
  try {
    const { value } = await ElMessageBox.prompt("请描述举报原因", "举报活动");
    await api("/reports", { method: "POST", body: JSON.stringify({ target_type: "activity", target_id: activity.id, reason: value }) });
    ElMessage.success("举报已提交，感谢反馈");
  } catch (error) { if (error !== "cancel") showError(error); }
}

async function recommend(mode = "same") {
  if (!token.value) return (showAuth.value = true);
  recommendationLoading.value = true;
  try { recommendations.value = await api(`/recommendations?mode=${encodeURIComponent(mode)}`); }
  catch (error) { showError(error); }
  finally { recommendationLoading.value = false; }
}

async function uploadImage(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const data = new FormData();
  data.append("image", file);
  try { form.value.image = (await api("/uploads", { method: "POST", body: data })).url; ElMessage.success("图片已上传"); }
  catch (error) { showError(error); }
}

async function uploadAvatar(event) {
  const input = event.target;
  const file = input.files?.[0];
  if (!file || avatarUploading.value) return;
  const data = new FormData();
  data.append("image", file);
  avatarUploading.value = true;
  try {
    const { url } = await api("/uploads", { method: "POST", body: data });
    await api("/users/me", { method: "PATCH", body: JSON.stringify({ avatar: url }) });
    profile.value.avatar = url;
    if (user.value) user.value.avatar = url;
    ElMessage.success("头像已更新");
  } catch (error) {
    showError(error);
  } finally {
    avatarUploading.value = false;
    input.value = "";
  }
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
  if (selected.value?.creator_id === user.value?.id) return openApplicants(selected.value);
  try {
    const data = await api(`/activities/${selected.value.id}/contact`);
    memberOrganizer.value = data.organizer;
    applications.value = data.members.map((member) => ({ ...member, user_id: member.id }));
    applicantsOpen.value = true;
  }
  catch (error) { showError(error); }
}

async function copyOrganizerContact() {
  const contact = selected.value?.creator_contact;
  if (!contact) return ElMessage.warning("发起人未填写联系方式");
  try { await navigator.clipboard.writeText(contact); ElMessage.success("发起人联系方式已复制"); }
  catch { ElMessage.error("复制失败，请手动记录联系方式"); }
}

const campus = {
  recommendations, recommendationLoading,
  cancellationOpen, cancellationTarget, cancellationForm, cancellationBusy, submitCancellation,
  token, user, activities, interests, categories, notifications, stats, selected, query, category,
  showAuth, authMode, busy, avatarUploading, loading, loadError, activityDialogOpen, applicantsOpen,
  editing, form, applications, memberOrganizer, myApplications, myActivities, favoriteList, reports,
  adminActivities, profile, availability, reviews, activeTab, authForm, unreadCount,
  initialize, load, search, login, logout, openDetail, loadActivity, toggleFavorite,
  join, newActivity, editActivity, saveActivity, loadMine, loadFavorites, loadProfile,
  loadAdmin, openApplicants, reviewApp, withdraw, cancel, toggleAvailability,
  saveProfile, markRead, markAllRead, deleteNotification, report, recommend, uploadImage, uploadAvatar, reportAction,
  adminRemove, reviewMember, showMembers, copyOrganizerContact,
};

export function useCampus() {
  router ||= useRouter();
  return campus;
}
