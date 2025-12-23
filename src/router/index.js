import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../services/supabase";
import POSView from "../views/POSView.vue";
import LoginView from "../views/LoginView.vue";
import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminOrders from "../views/admin/AdminOrders.vue";
import AdminProducts from "../views/admin/AdminProducts.vue";
import AdminDashboard from "../views/admin/AdminDashboard.vue";
import AdminSettings from "../views/admin/AdminSettings.vue";

const routes = [
  {
    path: "/",
    name: "pos",
    component: POSView,
    meta: { requiresAuth: true }, // ADDED: Forces login before seeing POS
  },
  {
    path: "/login",
    name: "login",
    component: LoginView,
  },

  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true },
    children: [
      {
        path: "",
        name: "admin-dashboard",
        component: AdminDashboard,
      },
      {
        path: "staff",
        name: "AdminStaff",
        component: () => import("../views/admin/AdminStaff.vue"), // Lazy Load
      },
      {
        path: "stores",
        name: "AdminStores",
        component: () => import("../views/admin/AdminStores.vue"), // Lazy Load
      },
      {
        path: "orders",
        name: "AdminOrders",
        component: AdminOrders,
      },
      {
        path: "products",
        name: "admin-products",
        component: AdminProducts,
      },
      {
        path: "settings",
        name: "admin-settings",
        component: AdminSettings,
      },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

// --- NAVIGATION GUARD ---
router.beforeEach(async (to, from, next) => {
  // Check if the route requires auth
  if (to.meta.requiresAuth) {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      next(); // User is logged in -> Go ahead
    } else {
      next("/login"); // Not logged in -> Go to Login
    }
  } else {
    next(); // Public route (Login page) -> Go ahead
  }
});

export default router;
