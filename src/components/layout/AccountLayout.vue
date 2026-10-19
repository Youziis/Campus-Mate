<script setup>
import { computed, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useCampus } from "../../stores/campus";

const store = useCampus();
const route = useRoute();
const router = useRouter();

const navigationGroups = computed(() => [
  {
    label: "账户设置",
    items: [
      { name: "profile", icon: "user", title: "个人资料", note: "头像、简介与空闲时间" },
      { name: "favorites", icon: "bookmark", title: "我的收藏", note: "保存的校园活动" },
    ],
  },
  {
    label: "消息与管理",
    items: [
      {
        name: "notifications",
        icon: "bell",
        title: "消息通知",
        note: "报名与活动动态",
        badge: store.unreadCount.value,
      },
      ...(store.user.value?.role === "admin"
        ? [{ name: "admin", icon: "shield", title: "管理后台", note: "内容与举报管理" }]
        : []),
    ],
  },
]);

const currentItem = computed(() =>
  navigationGroups.value.flatMap((group) => group.items).find((item) => item.name === route.name),
);

function iconPath(icon) {
  return {
    user: "M20 21a8 8 0 0 0-16 0M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z",
    bookmark: "M6 3h12a1 1 0 0 1 1 1v17l-7-4-7 4V4a1 1 0 0 1 1-1Z",
    bell: "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9m-8 13h4",
    shield: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Zm-3-10 2 2 4-4",
  }[icon];
}

onMounted(store.initialize);
</script>

<template>
  <div class="account-settings-shell">
    <header class="account-settings-header">
      <div>
        <h1>{{ currentItem?.title || "个人资料" }}</h1>
      </div>
      <button class="account-activities-link" type="button" @click="router.push({ name: 'my-activities' })">
        查看我的活动
        <span aria-hidden="true">→</span>
      </button>
    </header>

    <div class="account-settings-grid">
      <aside class="account-settings-sidebar">
        <nav class="account-settings-nav" aria-label="个人中心导航">
          <section v-for="group in navigationGroups" :key="group.label" class="account-nav-group">
            <h2>{{ group.label }}</h2>
            <button
              v-for="item in group.items"
              :key="item.name"
              type="button"
              :class="{ active: route.name === item.name }"
              :aria-current="route.name === item.name ? 'page' : undefined"
              @click="router.push({ name: item.name })"
            >
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path :d="iconPath(item.icon)" />
              </svg>
              <span><b>{{ item.title }}</b><small>{{ item.note }}</small></span>
              <em v-if="item.badge">{{ item.badge > 99 ? "99+" : item.badge }}</em>
              <i aria-hidden="true">›</i>
            </button>
          </section>
        </nav>

        <button class="account-signout" type="button" @click="store.logout">
          退出当前账号
        </button>
      </aside>

      <main id="account-content" class="account-settings-content">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<style src="../../styles/components/account-layout.css"></style>
