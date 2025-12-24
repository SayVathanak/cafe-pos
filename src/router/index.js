import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";

const routes = [
  {
    path: "/login",
    name: "login",
    component: () => import("../views/LoginView.vue"),
  },
  {
    path: "/",
    name: "pos",
    component: () => import("../views/POSView.vue"),
    meta: { requiresAuth: true },
  },
  {
    path: "/setup-branch",
    name: "BranchSetup",
    component: () => import("../views/BranchSetup.vue"),
  },
  {
    path: "/admin",
    component: () => import("../views/admin/AdminLayout.vue"),
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "admin-dashboard",
        component: () => import("../views/admin/AdminDashboard.vue"),
      },
      {
        path: "orders",
        name: "AdminOrders",
        component: () => import("../views/admin/AdminOrders.vue"),
      },
      {
        path: "products",
        name: "admin-products",
        component: () => import("../views/admin/AdminProducts.vue"),
      },
      {
        path: "staff",
        name: "AdminStaff",
        component: () => import("../views/admin/AdminStaff.vue"),
      },
      {
        path: "stores",
        name: "AdminStores",
        component: () => import("../views/admin/AdminStores.vue"),
      },
      {
        path: "settings",
        name: "admin-settings",
        component: () => import("../views/admin/AdminSettings.vue"),
      },
    ],
  },
  {
    path: "/super-admin",
    name: "super-admin",
    component: () => import("../views/SuperAdmin.vue"),
    meta: { requiresAuth: true },
    beforeEnter: async (to, from, next) => {
      const userStore = useUserStore();
      if (!userStore.role) await userStore.fetchUserProfile();
      userStore.role === "super_admin" ? next() : next("/admin");
    },
  },
];

const router = createRouter({ history: createWebHistory(), routes });

router.beforeEach(async (to, from, next) => {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const userStore = useUserStore();

  // 1. Auth Guard
  if (to.meta.requiresAuth && !session) return next("/login");

  // 2. Profile Load Guard
  if (session && !userStore.role) await userStore.fetchUserProfile();

  // 3. Role Access Guard (Prevent Staff from accessing Management)
  const managerRoutes = ["AdminStaff", "AdminStores", "admin-settings"];
  if (managerRoutes.includes(to.name) && userStore.role === "staff") {
    return next("/admin");
  }

  next();
});

export default router;
