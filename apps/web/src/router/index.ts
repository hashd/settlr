import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: "/",
      name: "home",
      component: () => import("@/views/HomeView.vue"),
    },
    {
      path: "/login",
      name: "login",
      component: () => import("@/views/LoginView.vue"),
      meta: { guest: true },
    },
    {
      path: "/auth/callback",
      name: "auth-callback",
      component: () => import("@/views/AuthCallbackView.vue"),
    },
    {
      path: "/groups",
      name: "groups",
      component: () => import("@/views/GroupsView.vue"),
      meta: { requiresAuth: true },
    },
    {
      path: "/groups/:id",
      name: "group-detail",
      component: () => import("@/views/GroupDetailView.vue"),
      meta: { requiresAuth: true },
    },
  ],
});

// Navigation guard for auth
router.beforeEach(async (to, _from, next) => {
  const authStore = useAuthStore();

  // Initialize auth if not done yet
  if (authStore.loading) {
    await authStore.initialize();
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const isGuestOnly = to.matched.some((record) => record.meta.guest);

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to login with return URL
    next({ name: "login", query: { redirect: to.fullPath } });
  } else if (isGuestOnly && authStore.isAuthenticated) {
    // Already logged in, redirect to home
    next({ name: "home" });
  } else {
    next();
  }
});

export default router;
