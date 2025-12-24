<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { useUserStore } from "../../stores/userStore";
import {
  LayoutDashboard,
  Coffee,
  Settings,
  LogOut,
  ArrowLeft,
  ShoppingBag,
  Store,
  Users,
  ShieldCheck,
  Menu as MenuIcon, // 🆕 Added Menu Icon
  X as XIcon, // 🆕 Added Close Icon
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const showMobileMenu = ref(false); // 🆕 State for mobile drawer

// Load user profile
onMounted(async () => {
  if (!userStore.user || !userStore.role) {
    await userStore.fetchUserProfile();
    
    // Safety Check: If after fetching there is still no role, kick to login
    if (!userStore.role) {
      router.push("/login");
    }
  }
});

const handleLogout = async () => {
  if (!confirm("Are you sure you want to sign out?")) return;
  await userStore.logout();
  router.push("/login");
};

// Close drawer on route change
router.afterEach(() => {
  showMobileMenu.value = false;
});

const isActive = (path) => {
  if (path === "/admin" && route.path === "/admin") return true;
  if (path !== "/admin" && route.path.startsWith(path)) return true;
  return false;
};

const menuItems = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard, adminOnly: false },
  { name: "Orders", path: "/admin/orders", icon: ShoppingBag, adminOnly: false },
  { name: "Menu", path: "/admin/products", icon: Coffee, adminOnly: false },
  { name: "Staff", path: "/admin/staff", icon: Users, adminOnly: true },
  { name: "Stores", path: "/admin/stores", icon: Store, adminOnly: true },
  { name: "Platform", path: "/super-admin", icon: ShieldCheck, superOnly: true }, // 👈 Super Admin Link
  { name: "Settings", path: "/admin/settings", icon: Settings, adminOnly: true },
];

const visibleMenuItems = computed(() => {
  return menuItems.filter((item) => {
    // 1. If item is Super Admin only, check role
    if (item.superOnly && userStore.role !== "super_admin") return false;

    // 2. If item is Admin only, check if they are at least an Admin (or Super Admin)
    if (item.adminOnly && !["admin", "super_admin"].includes(userStore.role))
      return false;

    return true;
  });
});

// DESKTOP: Sidebar State
const isCollapsed = ref(false);
const textClass = computed(() =>
  isCollapsed.value
    ? "opacity-0 max-w-0 translate-x-[-10px]"
    : "opacity-100 max-w-[150px] translate-x-0 ml-3"
);
</script>

<template>
  <div
    class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-sm"
  >
    <aside
      class="hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-40 relative h-full"
      :class="isCollapsed ? 'w-18' : 'w-64'"
    >
      <div
        class="h-16 flex items-center justify-center min-h-16 relative overflow-hidden mt-6"
      >
        <div
          class="flex items-center justify-start w-full px-4 transition-all duration-300"
        >
          <div
            class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0 font-preah"
          >
            {{ userStore.storeName ? userStore.storeName.charAt(0) : "S" }}
          </div>
          <div
            class="flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
            :class="textClass"
          >
            <span class="text-sm font-bold text-slate-900 truncate font-sans">
              {{
                userStore.role === "super_admin"
                  ? "Platform Control"
                  : userStore.storeName || "Loading..."
              }}
            </span>
            <span
              class="text-[9px] text-slate-400 uppercase tracking-widest font-semibold"
            >
              {{
                userStore.role === "super_admin"
                  ? "Super Admin"
                  : userStore.role === "admin"
                  ? "Admin"
                  : "Staff"
              }}
              Portal
            </span>
          </div>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-1.5 mt-6 overflow-x-hidden">
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.path"
          :to="item.path"
          class="group relative flex items-center px-3 py-3 rounded-xl transition-all duration-300 ease-out"
          :class="
            isActive(item.path)
              ? 'bg-slate-50 text-slate-900 font-semibold'
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          "
        >
          <component
            :is="item.icon"
            class="w-5 h-5 shrink-0 transition-transform duration-300 ease-out"
            :class="{ 'text-slate-900': isActive(item.path) }"
          />
          <span
            class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out font-medium"
            :class="textClass"
            >{{ item.name }}</span
          >
        </router-link>
      </nav>

      <div class="p-3 space-y-1 mb-6">
        <button
          @click="router.push('/')"
          class="w-full group relative flex items-center px-3 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
        >
          <ArrowLeft class="w-5 h-5 shrink-0" />
          <span
            class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
            :class="textClass"
            >POS Terminal</span
          >
        </button>
        <button
          @click="handleLogout"
          class="w-full group relative flex items-center px-3 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut class="w-5 h-5 shrink-0" />
          <span
            class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
            :class="textClass"
            >Sign Out</span
          >
        </button>
      </div>
    </aside>

    <nav
      class="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white/95 backdrop-blur-xl border-t border-slate-200 shadow-lg mobile-nav-fix"
    >
      <button
        @click="router.push('/')"
        class="flex flex-col items-center justify-center w-14 gap-1 text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
      >
        <ArrowLeft class="w-6 h-6 stroke-[1.5]" />
        <span class="text-[9px] font-bold tracking-wide">POS</span>
      </button>

      <router-link
        v-for="item in visibleMenuItems.slice(0, 3)"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-14 gap-1 transition-all duration-300 active:scale-95"
        :class="
          isActive(item.path)
            ? 'text-indigo-600'
            : 'text-slate-400 hover:text-slate-600'
        "
      >
        <component
          :is="item.icon"
          class="w-6 h-6 transition-all duration-300"
          :class="isActive(item.path) ? 'fill-indigo-50' : ''"
          :stroke-width="isActive(item.path) ? 2.5 : 1.5"
        />
        <span
          class="text-[9px] font-bold tracking-wide"
          :class="isActive(item.path) ? 'opacity-100' : 'opacity-75'"
        >
          {{ item.name }}
        </span>
      </router-link>

      <button
        @click="showMobileMenu = true"
        class="flex flex-col items-center justify-center w-14 gap-1 text-slate-400 hover:text-slate-900 active:scale-95 transition-all"
        :class="{ 'text-indigo-600': showMobileMenu }"
      >
        <MenuIcon class="w-6 h-6 stroke-[1.5]" />
        <span class="text-[9px] font-bold tracking-wide">More</span>
      </button>
    </nav>

    <transition name="slide-up">
      <div
        v-if="showMobileMenu"
        class="lg:hidden fixed inset-0 z-60 flex flex-col justify-end"
      >
        <div
          @click="showMobileMenu = false"
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
        ></div>

        <div
          class="bg-white w-full rounded-t-3xl p-6 relative z-10 shadow-2xl pb-safe"
        >
          <div class="w-12 h-1.5 bg-slate-200 rounded-full mx-auto mb-6"></div>

          <div class="flex items-center justify-between mb-6">
            <div class="flex items-center gap-3">
              <div
                class="w-10 h-10 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold font-preah text-lg"
              >
                {{ userStore.storeName ? userStore.storeName.charAt(0) : "S" }}
              </div>
              <div>
                <h3 class="font-bold text-base text-slate-900">
                  {{ userStore.storeName || "Store" }}
                </h3>
                <p class="text-xs text-slate-500 font-medium uppercase">
                  {{ userStore.role }} Account
                </p>
              </div>
            </div>
            <button
              @click="showMobileMenu = false"
              class="p-2 bg-slate-100 rounded-full text-slate-500 hover:bg-slate-200"
            >
              <XIcon class="w-5 h-5" />
            </button>
          </div>

          <div class="grid grid-cols-4 gap-4 mb-8">
            <router-link
              v-for="item in visibleMenuItems"
              :key="item.path"
              :to="item.path"
              class="flex flex-col items-center gap-2"
              @click="showMobileMenu = false"
            >
              <div
                class="w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200"
                :class="
                  isActive(item.path)
                    ? 'bg-indigo-600 text-white shadow-indigo-200 shadow-lg'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                "
              >
                <component :is="item.icon" class="w-6 h-6" :stroke-width="2" />
              </div>
              <span
                class="text-[10px] font-semibold text-slate-600 text-center leading-tight"
                >{{ item.name }}</span
              >
            </router-link>
          </div>

          <div class="space-y-3 pt-4 border-t border-slate-100">
            <button
              @click="handleLogout"
              class="w-full flex items-center justify-center gap-2 p-3.5 rounded-xl bg-red-50 text-red-600 font-bold hover:bg-red-100 transition-colors"
            >
              <LogOut class="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>
      </div>
    </transition>

    <main
      class="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-500"
    >
      <div
        class="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
      >
        <div class="max-w-6xl mx-auto space-y-6">
          <router-view v-slot="{ Component }">
            <transition name="smooth-fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
/* Mobile Drawer Transitions */
.slide-up-enter-active,
.slide-up-leave-active {
  transition: opacity 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}
.slide-up-enter-active .bg-white,
.slide-up-leave-active .bg-white {
  transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}
.slide-up-enter-from .bg-white,
.slide-up-leave-to .bg-white {
  transform: translateY(100%);
}

/* Smooth page transitions */
.smooth-fade-enter-active,
.smooth-fade-leave-active {
  transition: opacity 0.3s ease, transform 0.3s cubic-bezier(0.25, 0.8, 0.5, 1);
}
.smooth-fade-enter-from {
  opacity: 0;
  transform: translateY(10px);
}
.smooth-fade-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

.mobile-nav-fix {
  padding-bottom: calc(env(safe-area-inset-bottom) + 16px);
  padding-top: 12px;
}
.pb-safe {
  padding-bottom: calc(env(safe-area-inset-bottom) + 24px);
}
</style>
