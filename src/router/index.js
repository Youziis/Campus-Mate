import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
  routes: [
    { path: "/", name: "discover", component: () => import("../views/DiscoverView.vue") },
    { path: "/recommendations", name: "recommendations", component: () => import("../views/DiscoverView.vue"), meta: { requiresAuth: true } },
    { path: "/activities/:id", name: "activity-detail", component: () => import("../views/ActivityDetailView.vue"), props: true },
    { path: "/my/activities", name: "my-activities", component: () => import("../views/MyActivitiesView.vue"), meta: { requiresAuth: true } },
    { path: "/favorites", name: "favorites", component: () => import("../views/MyActivitiesView.vue"), meta: { requiresAuth: true } },
    { path: "/notifications", name: "notifications", component: () => import("../views/NotificationsView.vue"), meta: { requiresAuth: true } },
    { path: "/profile", name: "profile", component: () => import("../views/ProfileView.vue"), meta: { requiresAuth: true } },
    { path: "/admin", name: "admin", component: () => import("../views/AdminView.vue"), meta: { requiresAuth: true, requiresAdmin: true } },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../views/NotFoundView.vue") },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem("cm-token")) {
    return { name: "discover", query: { login: "required", redirect: to.fullPath } };
  }
});

export default router;
