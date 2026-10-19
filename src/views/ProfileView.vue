<script setup>
import InterestInput from "../components/InterestInput.vue";
import { computed, nextTick, onMounted, onUnmounted, ref } from "vue";
import { gsap } from "gsap";
import { days, periods, useCampus } from "../stores/campus";

const store = useCampus();
const pageRoot = ref(null);
const ready = ref(false);
const saving = ref(false);
let motionContext;

const profileCompletion = computed(() => {
  const profile = store.profile.value;
  const checks = [profile.name, profile.bio, profile.major, profile.year, profile.interests?.length, profile.availability?.length];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
});
const selectedSlots = computed(() => store.profile.value.availability?.length || 0);
const profileInitial = computed(() => store.user.value?.name?.trim()?.[0] || "同");

async function loadProfile() {
  await store.loadProfile();
  ready.value = true;
  await nextTick();
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  motionContext = gsap.context(() => {
    gsap.from(".profile-identity-copy > *", { autoAlpha: 0, y: 18, duration: 0.65, stagger: 0.07, ease: "power3.out" });
    gsap.from(".profile-portrait", { autoAlpha: 0, scale: 0.72, rotation: -8, duration: 0.8, ease: "back.out(1.6)" });
    gsap.from(".profile-stat-card", { autoAlpha: 0, y: 20, duration: 0.55, stagger: 0.07, ease: "power3.out", delay: 0.18 });
  }, pageRoot.value);
}

async function saveProfile() {
  if (saving.value) return;
  saving.value = true;
  await store.saveProfile();
  saving.value = false;
}

onMounted(loadProfile);
onUnmounted(() => motionContext?.revert());
</script>

<template>
  <section ref="pageRoot" class="profile-page-new" data-page>
    <div v-if="!ready" class="profile-loading" aria-live="polite"><span></span><b>正在整理你的校园档案</b><small>读取资料、兴趣和每周空闲时间…</small></div>

    <template v-else>
      <header class="profile-identity">
        <div class="profile-identity-pattern" aria-hidden="true"><i></i><i></i><i></i></div>
        <label class="profile-portrait" :class="{ uploading: store.avatarUploading.value }" title="修改头像">
          <img v-if="store.profile.value.avatar" :src="store.profile.value.avatar" :alt="`${store.user.value?.name || '用户'}的头像`" />
          <span v-else>{{ profileInitial }}</span>
          <small>{{ store.avatarUploading.value ? "上传中" : "更换头像" }}</small>
          <input type="file" accept="image/png,image/jpeg,image/webp" :disabled="store.avatarUploading.value" @change="store.uploadAvatar" />
        </label>
        <div class="profile-identity-copy">
          <div class="profile-kicker">CAMPUS ID · {{ String(store.user.value?.id || 0).padStart(4, "0") }}</div>
          <h1>{{ store.user.value?.name }}</h1>
          <p>{{ store.profile.value.bio || "写一句自我介绍，让未来的活动搭子更快认识你。" }}</p>
          <div class="profile-identity-meta"><span>{{ store.profile.value.major || "专业待填写" }}</span><i></i><span>{{ store.profile.value.year || "年级待填写" }}</span><i></i><span>{{ store.profile.value.campus || "Campus Mate 校园" }}</span></div>
        </div>
        <div class="profile-completion" :style="{ '--completion': `${profileCompletion * 3.6}deg` }"><div><b>{{ profileCompletion }}%</b><small>资料完整度</small></div></div>
      </header>

      <section class="profile-overview" aria-label="个人数据">
        <div class="profile-stat-card"><span>01</span><div><b>{{ store.stats.value.joined || 0 }}</b><small>参与活动</small></div><i>次同行</i></div>
        <div class="profile-stat-card"><span>02</span><div><b>{{ store.stats.value.published || 0 }}</b><small>发起活动</small></div><i>次召集</i></div>
        <div class="profile-stat-card"><span>03</span><div><b>{{ store.stats.value.reviews || 0 }}</b><small>收到评价</small></div><i>条反馈</i></div>
        <div class="profile-stat-card rating"><span>04</span><div><b>{{ store.stats.value.averageRating || "—" }}</b><small>搭子评分</small></div><i>★ 5.0</i></div>
      </section>

      <div class="profile-workspace">
        <main class="profile-editor">
          <div class="profile-editor-head"><div><div class="eyebrow muted">编辑个人档案</div><h2>把你介绍得刚刚好</h2><p>公开信息会帮助活动发起人了解你，空闲时间仅用于活动推荐。</p></div><span>PUBLIC PROFILE</span></div>

          <section class="profile-form-section">
            <div class="profile-section-title"><span>01</span><div><h3>基本资料</h3><p>昵称、专业和介绍会显示在你的校园档案中。</p></div></div>
            <div class="profile-field-grid">
              <label class="profile-field"><span>昵称</span><el-input v-model="store.profile.value.name" placeholder="你的称呼" /></label>
              <label class="profile-field"><span>专业</span><el-input v-model="store.profile.value.major" placeholder="例如：设计学院" /></label>
              <label class="profile-field"><span>年级</span><el-input v-model="store.profile.value.year" placeholder="例如：大二" /></label>
              <label class="profile-field profile-field-wide"><span>个人介绍</span><el-input v-model="store.profile.value.bio" type="textarea" :rows="4" maxlength="180" show-word-limit placeholder="说说你喜欢的活动，以及希望遇见怎样的搭子…" /></label>
              <label class="profile-field profile-field-wide"><span>兴趣标签</span><small>填写你喜欢的事，让推荐更贴近你的兴趣。</small><InterestInput v-model="store.profile.value.interests" /></label>
            </div>
          </section>

          <section class="profile-form-section availability-section">
            <div class="profile-section-title"><span>02</span><div><h3>每周空闲时间</h3><p>按学校课程节次选择没有课程、方便参加活动的时间，已选择 {{ selectedSlots }} 个时段。</p></div><div class="availability-legend"><i></i>可参加活动</div></div>
            <div class="availability-board">
              <div class="availability-corner">节次</div><b v-for="day in days" :key="day.weekday">{{ day.label }}</b>
              <template v-for="period in periods" :key="period.value">
                <strong><span>{{ period.label }}</span><small>{{ period.time }}</small></strong>
                <button
                  v-for="day in days"
                  :key="`${day.weekday}-${period.value}`"
                  :class="{ picked: (store.profile.value.availability || []).some((item) => item.weekday === day.weekday && item.period === period.value) }"
                  :aria-pressed="(store.profile.value.availability || []).some((item) => item.weekday === day.weekday && item.period === period.value)"
                  :aria-label="`${day.label}${period.label}，${period.time}`"
                  @click="store.toggleAvailability(day.weekday, period.value)"
                ><span></span></button>
              </template>
            </div>
          </section>

          <footer class="profile-savebar"><p><b>{{ profileCompletion }}%</b><span>资料越完整，推荐结果越准确</span></p><el-button type="primary" size="large" :loading="saving" @click="saveProfile">保存个人档案</el-button></footer>
        </main>
      </div>
    </template>
  </section>
</template>

<style src="../styles/pages/profile.css"></style>
