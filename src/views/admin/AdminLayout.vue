<script setup>
import { useRouter } from "vue-router";
import { supabase } from "../../services/supabase";
import { LayoutDashboard, Coffee, Settings, LogOut, ArrowLeft } from 'lucide-vue-next'

const router = useRouter();

const handleLogout = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    router.push("/login");
  } catch (error) {
    alert("Error signing out");
  }
};
</script>

<template>
  <div class="flex h-screen bg-zinc-50 font-sans text-zinc-900">
    
    <aside class="w-64 bg-white border-r border-zinc-200 flex flex-col z-10">
      
      <div class="p-6 border-b border-zinc-200">
        <h1 class="text-xl font-medium font-khmer tracking-widest uppercase">សាយ័ណ្ហកាហ្វេ</h1>
        <p class="text-[10px] font-mono text-zinc-400 mt-1">SAYON COFFEE v1.0</p>
      </div>

      <nav class="flex-1 p-4 space-y-1">
        <router-link
          to="/admin"
          class="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group border border-transparent"
          active-class="bg-black text-white shadow-sm"
          exact-active-class="bg-black text-white"
        >
          <LayoutDashboard class="w-4 h-4" />
          <span>DASHBOARD</span>
        </router-link>

        <router-link
          to="/admin/products"
          class="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group border border-transparent hover:bg-zinc-50"
          active-class="bg-black text-white hover:bg-black"
        >
          <Coffee class="w-4 h-4" />
          <span>INVENTORY</span>
        </router-link>

        <router-link
          to="/admin/settings"
          class="flex items-center gap-3 px-4 py-3 text-sm font-medium transition-all group border border-transparent hover:bg-zinc-50"
          active-class="bg-black text-white hover:bg-black"
        >
          <Settings class="w-4 h-4" />
          <span>SETTINGS</span>
        </router-link>
      </nav>

      <div class="p-4 border-t border-zinc-200 space-y-2">
        <button
          @click="router.push('/')"
          class="w-full py-2 px-4 border border-zinc-200 text-xs font-bold uppercase hover:bg-zinc-900 hover:text-white transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft class="w-3 h-3" /> Back to POS
        </button>

        <button
          @click="handleLogout"
          class="w-full py-2 px-4 bg-zinc-100 text-zinc-600 text-xs font-bold uppercase hover:bg-red-600 hover:text-white transition-colors flex justify-center items-center gap-2"
        >
          <LogOut class="w-3 h-3" /> Sign Out
        </button>
      </div>
    </aside>

    <main class="flex-1 overflow-y-auto p-8 lg:p-12 relative">
      <router-view v-slot="{ Component }">
        <transition name="fade" mode="out-in">
          <component :is="Component" />
        </transition>
      </router-view>
    </main>
  </div>
</template>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.15s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>