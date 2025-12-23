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
  Users
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();

// Load user profile
onMounted(async () => {
  if (!userStore.user) {
    await userStore.fetchUserProfile();
  }
});

const handleLogout = async () => {
  // 🔒 Logout Confirmation
  if (!confirm("Are you sure you want to sign out?")) return;

  await userStore.logout();
  router.push("/login");
};

const isActive = (path) => {
  if (path === "/admin" && route.path === "/admin") return true;
  if (path !== "/admin" && route.path.startsWith(path)) return true;
  return false;
};

// 🟢 Define menu
const menuItems = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard, adminOnly: false },
  { name: "Orders", path: "/admin/orders", icon: ShoppingBag, adminOnly: false },
  { name: "Menu", path: "/admin/products", icon: Coffee, adminOnly: false }, 
  { name: "Staff", path: "/admin/staff", icon: Users, adminOnly: true },
  { name: "Stores", path: "/admin/stores", icon: Store, adminOnly: true },
  { name: "Settings", path: "/admin/settings", icon: Settings, adminOnly: true },
];

// 🟢 Filter menu items
const visibleMenuItems = computed(() => {
  return menuItems.filter(item => {
    if (item.adminOnly && userStore.role !== 'admin') return false;
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
  <div class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden text-xs">
    
    <aside
      class="hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-500 ease-[cubic-bezier(0.25,0.8,0.25,1)] z-40 relative h-full"
      :class="isCollapsed ? 'w-18' : 'w-64'"
    >
      <div class="h-16 flex items-center justify-center min-h-16 relative overflow-hidden mt-6">
        <div class="flex items-center justify-start w-full px-4 transition-all duration-300">
           <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0 font-preah">
             {{ userStore.storeName ? userStore.storeName.charAt(0) : 'S' }}
           </div>

           <div 
             class="flex flex-col justify-center whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out"
             :class="textClass"
           >
             <span class="text-sm font-bold text-slate-900 truncate font-preah">{{ userStore.storeName || 'Loading...' }}</span>
             <span class="text-[9px] text-slate-400 uppercase tracking-widest font-semibold">{{ userStore.role === 'admin' ? 'Admin' : 'Staff' }} Portal</span>
           </div>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-1.5 mt-6 overflow-x-hidden">
        <router-link
          v-for="item in visibleMenuItems" 
          :key="item.path"
          :to="item.path"
          class="group relative flex items-center px-3 py-3 rounded-xl transition-all duration-300 ease-out"
          :class="[
            isActive(item.path)
              ? 'bg-slate-50 text-slate-900 font-semibold' 
              : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900'
          ]"
        >
          <component
            :is="item.icon"
            class="w-5 h-5 shrink-0 transition-transform duration-300 ease-out"
            :class="{ 'text-slate-900': isActive(item.path) }"
          />

          <span
            class="whitespace-nowrap overflow-hidden transition-all duration-500 ease-in-out font-medium"
            :class="textClass"
          >
            {{ item.name }}
          </span>
        </router-link>
      </nav>

      <div class="p-3 space-y-1 mb-6">
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


    <nav class="lg:hidden fixed bottom-0 left-0 right-0 z-50 flex justify-around items-center bg-white/90 backdrop-blur-lg border-t border-slate-200/60 shadow-[0_-8px_30px_rgba(0,0,0,0.04)] mobile-nav-fix">
      
      <router-link
        v-for="item in visibleMenuItems.slice(0, 4)" 
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center justify-center w-16 gap-1 transition-all duration-300 active:scale-95"
        :class="isActive(item.path) ? 'text-indigo-600' : 'text-slate-400 hover:text-slate-600'"
      >
        <component 
          :is="item.icon" 
          class="w-6 h-6 transition-all duration-300" 
          :class="isActive(item.path) ? 'fill-indigo-100' : ''"
          :stroke-width="isActive(item.path) ? 2.5 : 2" 
        />
        
        <span class="text-[9px] font-bold tracking-wide transition-all duration-300"
           :class="isActive(item.path) ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 h-0 overflow-hidden'">
           {{ item.name }}
        </span>
      </router-link>

      <button @click="handleLogout" class="flex flex-col items-center justify-center w-16 gap-1 text-slate-300 hover:text-red-500 transition-colors duration-300 active:scale-90">
        <LogOut class="w-6 h-6" />
        <span class="text-[9px] font-medium opacity-0 h-0">Exit</span>
      </button>
    </nav>


    <main class="flex-1 flex flex-col min-w-0 h-full relative transition-all duration-500">
      <div class="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-8 scroll-smooth scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent">
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
/* Smooth transitions */
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

/* 📱 MOBILE NAV FIX */
.mobile-nav-fix {
  /* Adds 24px (py-6) padding on top of the System Safe Area */
  padding-bottom: calc(env(safe-area-inset-bottom) + 24px); 
  padding-top: 20px;
}
</style>