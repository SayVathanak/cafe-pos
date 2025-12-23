<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore"; // 👈 Import the store
import {
  LayoutDashboard,
  Coffee,
  Settings,
  LogOut,
  ArrowLeft,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  Store,
  Users
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore(); // 👈 Initialize store

const isCollapsed = ref(false);

// Load user profile on mount (double check in case of refresh)
onMounted(async () => {
  if (!userStore.user) {
    await userStore.fetchUserProfile();
  }
});

const handleLogout = async () => {
  await userStore.logout(); // 👈 Use store action
  router.push("/login");
};

const isActive = (path) => {
  if (path === "/admin" && route.path === "/admin") return true;
  if (path !== "/admin" && route.path.startsWith(path)) return true;
  return false;
};

// 🟢 Define menu with permissions
const menuItems = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard, adminOnly: false },
  { name: "Orders", path: "/admin/orders", icon: ShoppingBag, adminOnly: false },
  { name: "Menu", path: "/admin/products", icon: Coffee, adminOnly: false }, // Staff might need this
  { name: "Staff", path: "/admin/staff", icon: Users, adminOnly: true }, // 👈 New: Admin Only
  { name: "Stores", path: "/admin/stores", icon: Store, adminOnly: true }, // 👈 New: Admin Only
  { name: "Settings", path: "/admin/settings", icon: Settings, adminOnly: true }, // 👈 Restricted
];

// 🟢 Filter menu items based on role
const visibleMenuItems = computed(() => {
  return menuItems.filter(item => {
    if (item.adminOnly && userStore.role !== 'admin') return false;
    return true;
  });
});

const textClass = computed(() =>
  isCollapsed.value
    ? "opacity-0 max-w-0 translate-x-[-10px]"
    : "opacity-100 max-w-[150px] translate-x-0 ml-3"
);
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-xs">
    
    <aside
      class="flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-40"
      :class="[
        isCollapsed ? 'lg:w-18' : 'lg:w-64',
        'fixed lg:relative h-full w-18' 
      ]"
    >
      <div class="h-16 hidden md:flex items-center justify-center min-h-16 relative overflow-hidden md:mt-6">
        <div class="flex items-center justify-start w-full px-4 transition-all duration-300">
           <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0">
             {{ userStore.storeName ? userStore.storeName.charAt(0) : 'S' }}
           </div>

           <div 
             class="flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
             :class="textClass"
           >
             <span class="text-sm font-bold text-slate-900 truncate">{{ userStore.storeName || 'Loading...' }}</span>
             <span class="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{{ userStore.role || 'Guest' }} Portal</span>
           </div>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-5 md:space-y-1.5 mt-6 overflow-x-hidden">
        <router-link
          v-for="item in visibleMenuItems" 
          :key="item.path"
          :to="item.path"
          class="group relative flex items-center px-3 py-3 rounded-xl transition-all duration-300 ease-out"
          :class="[
            isActive(item.path)
              ? 'bg-slate-50 text-slate-900 font-semibold' // Active state style
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          ]"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 shrink-0 transition-transform duration-300 ease-out"
            :class="{ 
              'text-slate-900': isActive(item.path)
            }"
          />

          <span
            class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out font-medium"
            :class="textClass"
          >
            {{ item.name }}
          </span>

          <div
            v-if="isCollapsed"
            class="absolute left-full ml-4 px-2.5 py-1.5 bg-slate-800 text-white text-[10px] rounded-md shadow-xl whitespace-nowrap opacity-0 -translate-x-2 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 z-50"
          >
            {{ item.name }}
            <div class="absolute left-0 top-1/2 -translate-x-1 -translate-y-1/2 w-2 h-2 bg-slate-800 rotate-45"></div>
          </div>
        </router-link>
      </nav>

      <div class="p-3 space-y-1 mb-6">
        <button
          @click="isCollapsed = !isCollapsed"
          class="hidden lg:flex w-full py-2.5 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-200 items-center justify-center group"
        >
          <component
            :is="isCollapsed ? ChevronRight : ChevronLeft"
            class="w-4 h-4 transition-transform duration-300 group-hover:scale-110"
          />
        </button>

        <div class="h-px bg-slate-100 my-2 mx-2"></div>

        <button
          @click="router.push('/')"
          class="w-full group relative flex items-center px-3 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-all duration-200"
        >
          <ArrowLeft class="w-5 h-5 shrink-0" />
          <span class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out" :class="textClass">
            POS Terminal
          </span>
        </button>

        <button
          @click="handleLogout"
          class="w-full group relative flex items-center px-3 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut class="w-5 h-5 shrink-0" />
          <span class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out" :class="textClass">
            Sign Out
          </span>
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full relative pl-18 lg:pl-0 transition-all duration-500">
      <div class="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
</style>