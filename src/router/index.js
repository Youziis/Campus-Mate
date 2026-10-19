import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(),
  scrollBehavior() {
    return { top: 0, behavior: "smooth" };
  },
  routes: [
    { path: "/", name: "discover", component: () => import("../views/DiscoverView.vue") },
    { path: "/recommendations", name: "recommendations", component: () => import("../views/RecommendationView.vue"), meta: { requiresAuth: true } },
    { path: "/activities/:id", name: "activity-detail", component: () => import("../views/ActivityDetailView.vue"), props: true },
    { path: "/my/activities", name: "my-activities", component: () => import("../views/MyActivitiesView.vue"), meta: { requiresAuth: true } },
    {
      path: "/account",
      component: () => import("../components/layout/AccountLayout.vue"),
      meta: { requiresAuth: true },
      redirect: { name: "profile" },
      children: [
        { path: "favorites", name: "favorites", component: () => import("../views/MyActivitiesView.vue") },
        { path: "notifications", name: "notifications", component: () => import("../views/NotificationsView.vue") },
        { path: "profile", name: "profile", component: () => import("../views/ProfileView.vue") },
        { path: "admin", name: "admin", component: () => import("../views/AdminView.vue"), meta: { requiresAdmin: true } },
      ],
    },
    { path: "/account/activities", redirect: { name: "my-activities" } },
    { path: "/favorites", redirect: { name: "favorites" } },
    { path: "/notifications", redirect: { name: "notifications" } },
    { path: "/profile", redirect: { name: "profile" } },
    { path: "/admin", redirect: { name: "admin" } },
    { path: "/:pathMatch(.*)*", name: "not-found", component: () => import("../views/NotFoundView.vue") },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth && !localStorage.getItem("cm-token")) {
    return { name: "discover", query: { login: "required", redirect: to.fullPath } };
  }
});

export default router;
