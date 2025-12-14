import { createRouter, createWebHistory } from "vue-router";
import { supabase } from "../services/supabase"; // Import supabase
import POSView from "../views/POSView.vue";
import LoginView from "../views/LoginView.vue"; // Import Login
import AdminLayout from "../views/admin/AdminLayout.vue";
import AdminProducts from "../views/admin/AdminProducts.vue";
import AdminDashboard from "../views/admin/AdminDashboard.vue";
import AdminSettings from "../views/admin/AdminSettings.vue";

const routes = [
  { path: "/", name: "pos", component: POSView },
  { path: "/login", name: "login", component: LoginView }, // Add Login Route

  {
    path: "/admin",
    component: AdminLayout,
    meta: { requiresAuth: true }, // <--- Tag this route as protected
    children: [
      {
        path: "", // Default path (Empty)
        name: "admin-dashboard",
        component: AdminDashboard, // <--- Set Dashboard as default
      },
      { path: "products", name: "admin-products", component: AdminProducts },
      {
        path: "settings", // /admin/settings
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
    // Check if user is logged in with Supabase
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session) {
      // User is logged in -> Allow
      next();
    } else {
      // User is NOT logged in -> Redirect to Login
      next("/login");
    }
  } else {
    // Route does not require auth -> Allow
    next();
  }
});

export default router;
