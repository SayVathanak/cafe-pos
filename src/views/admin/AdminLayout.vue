<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../../services/supabase";
import { 
  LayoutDashboard, Coffee, Settings, LogOut, ArrowLeft, Menu, X 
} from 'lucide-vue-next'

const router = useRouter();
const isSidebarOpen = ref(false);

const handleLogout = async () => {
  await supabase.auth.signOut();
  router.push("/login");
};
</script>

<template>
  <div class="flex h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
    
    <div 
      v-if="isSidebarOpen" 
      class="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 lg:hidden"
      @click="isSidebarOpen = false"
    ></div>

    <aside 
      class="fixed inset-y-0 left-0 z-50 w-72 bg-white border-r border-slate-100 flex flex-col transition-transform duration-300 lg:static lg:translate-x-0"
      :class="isSidebarOpen ? 'translate-x-0' : '-translate-x-full'"
    >
      <div class="p-8 pb-4 flex items-center justify-between">
        <div>
          <h1 class="text-xl font-medium font-khmer uppercase tracking-widest text-slate-900">សាយ័ណ្ហកាហ្វេ</h1>
          <p class="text-[10px] font-mono text-slate-400 mt-1 uppercase">Admin Console v1.0</p>
        </div>
        <button @click="isSidebarOpen = false" class="lg:hidden p-2 text-slate-400">
          <X class="w-5 h-5" />
        </button>
      </div>

      <nav class="flex-1 px-4 py-6 space-y-2">
        <router-link
          to="/admin"
          @click="isSidebarOpen = false"
          class="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200"
          active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="$route.path === '/admin' ? '' : 'text-slate-500 hover:bg-slate-50 hover:text-black'"
        >
          <LayoutDashboard class="w-5 h-5" />
          <span class="tracking-wide">Overview</span>
        </router-link>

        <router-link
          to="/admin/products"
          @click="isSidebarOpen = false"
          class="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200"
          active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="$route.path.includes('/products') ? '' : 'text-slate-500 hover:bg-slate-50 hover:text-black'"
        >
          <Coffee class="w-5 h-5" />
          <span class="tracking-wide">Inventory</span>
        </router-link>

        <router-link
          to="/admin/settings"
          @click="isSidebarOpen = false"
          class="flex items-center gap-4 px-5 py-4 rounded-2xl text-sm font-medium transition-all duration-200"
          active-class="bg-black text-white shadow-lg shadow-black/10"
          :class="$route.path.includes('/settings') ? '' : 'text-slate-500 hover:bg-slate-50 hover:text-black'"
        >
          <Settings class="w-5 h-5" />
          <span class="tracking-wide">Configuration</span>
        </router-link>
      </nav>

      <div class="p-6 border-t border-slate-50 space-y-3">
        <button
          @click="router.push('/')"
          class="w-full py-3 px-4 rounded-xl border border-slate-200 text-xs font-bold uppercase tracking-widest hover:bg-black hover:text-white hover:border-black transition-all flex items-center justify-center gap-2"
        >
          <ArrowLeft class="w-3 h-3" /> POS Terminal
        </button>

        <button
          @click="handleLogout"
          class="w-full py-3 px-4 rounded-xl bg-slate-50 text-slate-500 text-xs font-bold uppercase tracking-widest hover:bg-red-50 hover:text-red-600 transition-colors flex justify-center items-center gap-2"
        >
          <LogOut class="w-3 h-3" /> Sign Out
        </button>
      </div>
    </aside>

    <main class="flex-1 flex flex-col min-w-0 h-full relative">
      <header class="lg:hidden h-16 bg-white border-b border-slate-100 flex items-center justify-between px-6 flex-shrink-0">
        <div class="font-bold text-lg tracking-tight">Admin</div>
        <button @click="isSidebarOpen = true" class="p-2 -mr-2 text-slate-500">
          <Menu class="w-6 h-6" />
        </button>
      </header>

      <div class="flex-1 overflow-y-auto p-4 sm:p-8 lg:p-12">
        <div class="max-w-6xl mx-auto">
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
.fade-enter-active, .fade-leave-active { transition: opacity 0.2s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>