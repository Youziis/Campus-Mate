<script setup>
import { onMounted } from "vue";
import { days, periods, useCampus } from "../stores/campus";
const store = useCampus();
onMounted(store.loadProfile);
</script>
<template>
  <section class="dashboard profile-page motion-page" data-page>
    <div class="section-heading motion-item"><div><div class="eyebrow muted">个人档案</div><h2>让搭子先认识你</h2><p>兴趣、专业与空闲时间，会帮助推荐更合适的活动。</p></div></div>
    <div class="profile-layout"><aside v-motion-hover class="profile-card motion-item"><span class="profile-avatar">{{ store.user.value?.name?.[0] }}</span><h2>{{ store.user.value?.name }}</h2><p>{{ store.profile.value.major || "专业尚未填写" }} · {{ store.profile.value.year || "年级尚未填写" }}</p><div class="interest-tags"><span v-for="interest in store.profile.value.interests || []" :key="interest">{{ interest }}</span></div><hr /><div class="profile-stats"><div><b>{{ store.stats.value.joined || 0 }}</b><small>参与活动</small></div><div><b>{{ store.stats.value.reviews || 0 }}</b><small>收到评价</small></div><div><b>{{ store.stats.value.averageRating || "—" }}</b><small>平均评分</small></div></div></aside>
      <section class="profile-edit motion-item"><div class="form-section-heading"><span>01</span><div><h3>基本资料</h3><p>这些信息会显示在公开主页。</p></div></div><label>昵称</label><el-input v-model="store.profile.value.name" /><label>个人介绍</label><el-input v-model="store.profile.value.bio" type="textarea" :rows="3" placeholder="介绍一下你的兴趣和期待…" /><div class="form-cols"><div><label>专业</label><el-input v-model="store.profile.value.major" placeholder="例如：设计学院" /></div><div><label>年级</label><el-input v-model="store.profile.value.year" placeholder="例如：大二" /></div></div><label>兴趣标签</label><el-select v-model="store.profile.value.interests" multiple placeholder="选择感兴趣的事" style="width: 100%"><el-option v-for="interest in store.interests.value" :key="interest.id" :label="interest.name" :value="interest.name" /></el-select><div class="form-section-heading schedule-heading"><span>02</span><div><h3>空闲时间</h3><p>选择通常有空的时间段。</p></div></div><div class="availability-grid"><div v-for="(day, index) in days" :key="day"><b>{{ day }}</b><button v-for="period in periods" :key="period" :class="{ picked: (store.profile.value.availability || []).some((item) => item.weekday === index && item.period === period) }" @click="store.toggleAvailability(index, period)">{{ period }}</button></div></div><el-button type="primary" @click="store.saveProfile">保存资料</el-button></section>
    </div>
  </section>
</template>
