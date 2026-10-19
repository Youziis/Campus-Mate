<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { useRoute } from "vue-router";
import AppHeader from "./components/layout/AppHeader.vue";
import AppFooter from "./components/layout/AppFooter.vue";
import AuthDialog from "./components/dialogs/AuthDialog.vue";
import ActivityDialog from "./components/dialogs/ActivityDialog.vue";
import ApplicantsDialog from "./components/dialogs/ApplicantsDialog.vue";
import PublishFab from "./components/PublishFab.vue";
import RadialMenu from "./components/RadialMenu.vue";
import { usePageMotion } from "./composables/usePageMotion";
import { useCampus } from "./stores/campus";

const appRoot = ref(null);
const route = useRoute();
const store = useCampus();
const activityKey = computed(() => store.activities.value.map((activity) => activity.id).join(","));
const { scheduleMotion } = usePageMotion(appRoot);

watch(activityKey, () => scheduleMotion());
watch(store.activeTab, () => scheduleMotion());
watch(
  () => route.query.login,
  (value) => {
    if (value === "required") store.showAuth.value = true;
  },
  { immediate: true },
);

onMounted(async () => {
  await store.initialize();
  scheduleMotion(true);
});
</script>

<template>
  <div ref="appRoot" class="app-shell">
    <a class="skip-link" href="#main-content">跳到主要内容</a>
    <div class="scroll-progress" aria-hidden="true"></div>
    <AppHeader />
    <main id="main-content" :aria-busy="store.loading.value">
      <RouterView />
    </main>
    <AppFooter />
    <RadialMenu v-if="route.name === 'discover'" />
    <PublishFab v-else />
    <AuthDialog />
    <ActivityDialog />
    <ApplicantsDialog />
  </div>
</template>
