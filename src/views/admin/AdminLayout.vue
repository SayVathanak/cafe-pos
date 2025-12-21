<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../services/supabase";
import {
  LayoutDashboard,
  Coffee,
  Settings,
  LogOut,
  ArrowLeft,
  Menu,
  X,
} from "lucide-vue-next";

const router = useRouter();
const isSidebarOpen = ref(false);

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<template>
  <div
    class="flex h-screen bg-white font-sans text-slate-900 overflow-hidden text-xs"
  >
    <div
      v-if="isSidebarOpen"
      class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <aside
      class="fixed inset-y-0 left-0 z-50 w-56 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0 shadow-[4px_0_24px_-12px_rgba(0,0,0,0.05)]"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div
        class="h-16 flex items-center justify-between px-5 border-b border-slate-50 mt-6"
      >
        <div>
          <div class="text-xl font-medium font-khmer text-slate-900">
            សាយ័ណ្ហកាហ្វេ
          </div>
          <p
            class="text-[10px] text-slate-400 uppercase tracking-widest mt-0.5"
          >
            Admin Console
          </p>
        </div>
        <button
          @click="isSidebarOpen = false"
          class="lg:hidden text-slate-400 hover:text-black transition-colors"
        >
          <X class="w-4 h-4" />
        </button>
      </div>

      <nav class="flex-1 px-3 py-6 space-y-1">
        <div
          class="px-3 mb-2 text-[10px] font-bold text-slate-300 uppercase tracking-widest"
        >
          Analytics
        </div>

        <router-link
          to="/admin"
          @click="isSidebarOpen = false"
          class="group flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200"
          exact-active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="
            $route.path === '/admin'
              ? ''
              : 'text-slate-500 hover:bg-slate-50 hover:text-black'
          "
        >
          <LayoutDashboard
            class="w-4 h-4 transition-transform group-hover:scale-110 duration-200"
          />
          <span>Overview</span>
        </router-link>

        <div
          class="px-3 mb-2 mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest"
        >
          Management
        </div>

        <router-link
          to="/admin/products"
          @click="isSidebarOpen = false"
          class="group flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200"
          active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="
            $route.path.includes('/products')
              ? ''
              : 'text-slate-500 hover:bg-slate-50 hover:text-black'
          "
        >
          <Coffee
            class="w-4 h-4 transition-transform group-hover:scale-110 duration-200"
          />
          <span>Inventory & Menu</span>
        </router-link>

        <div
          class="px-3 mb-2 mt-6 text-[10px] font-bold text-slate-300 uppercase tracking-widest"
        >
          System
        </div>

        <router-link
          to="/admin/settings"
          @click="isSidebarOpen = false"
          class="group flex items-center gap-3 px-3 py-2 rounded-lg font-medium transition-all duration-200"
          active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="
            $route.path.includes('/settings')
              ? ''
              : 'text-slate-500 hover:bg-slate-50 hover:text-black'
          "
        >
          <Settings
            class="w-4 h-4 transition-transform group-hover:scale-110 duration-200"
          />
          <span>Configuration</span>
        </router-link>
      </nav>

      <div class="p-3 border-t border-slate-50 space-y-2 bg-slate-50/30">
        <button
          @click="router.push('/')"
          class="w-full py-2.5 px-3 rounded-lg border border-slate-200 bg-white font-bold uppercase tracking-wider hover:border-slate-300 hover:shadow-sm transition-all flex items-center justify-center gap-2 text-[10px] text-slate-700"
        >
          <ArrowLeft class="w-3 h-3" /> POS Terminal
        </button>

        <button
          @click="handleLogout"
          class="w-full py-2.5 px-3 rounded-lg border border-transparent font-bold uppercase tracking-wider text-red-500 hover:bg-red-50 transition-all flex items-center justify-center gap-2 text-[10px]"
        >
          <LogOut class="w-3 h-3" /> Sign Out
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full relative bg-slate-50/50">
      <header
        class="lg:hidden h-14 bg-white border-b border-slate-100 flex items-center justify-between px-4 shrink-0 shadow-sm z-30"
      >
        <div class="font-bold text-sm tracking-tight">Admin Dashboard</div>
        <button
          @click="isSidebarOpen = true"
          class="p-2 -mr-2 text-slate-500 hover:text-black"
        >
          <Menu class="w-5 h-5" />
        </button>
      </header>

      <div
        class="flex-1 overflow-y-auto p-4 lg:p-8 scroll-smooth scrollbar-hide"
      >
        <div class="max-w-5xl mx-auto space-y-6">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in">
              <component :is="Component" />
            </transition>
          </router-view>
        </div>
      </div>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateY(4px);
}
</style>
