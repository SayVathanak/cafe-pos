<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useSubscription } from "../../composables/useSubscription";
import { 
  LayoutDashboard, Coffee, Settings, LogOut, ArrowLeft, ShoppingBag, 
  Store, Users, ShieldCheck, Menu as MenuIcon, X as XIcon, Lock, Eye // <--- Added Eye
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const { checkSubscription, isExpired, loading: subLoading } = useSubscription();

const showMobileMenu = ref(false);
const logoUrl = ref(null);

// NEW: Check Impersonation State
const isImpersonating = computed(() => !!sessionStorage.getItem('superAdmin_restore'));

const exitImpersonation = () => {
  const original = JSON.parse(sessionStorage.getItem('superAdmin_restore'));
  if (original) {
    userStore.role = original.role;
    userStore.organizationId = original.orgId;
    userStore.storeName = original.storeName;
    sessionStorage.removeItem('superAdmin_restore');
    router.push('/super-admin');
  }
};

onMounted(async () => {
  if (!userStore.user) await userStore.fetchUserProfile();
  
  if (userStore.organizationId) {
    await checkSubscription();
    const { data } = await supabase.from('settings').select('logo_url').eq('organization_id', userStore.organizationId).single();
    if (data?.logo_url) logoUrl.value = data.logo_url;
  }
});

const handleLogout = async () => { if (confirm("Sign out?")) { await userStore.logout(); router.push("/login"); } };
router.afterEach(() => { showMobileMenu.value = false; });
const isActive = (path) => path === "/admin" && route.path === "/admin" ? true : path !== "/admin" && route.path.startsWith(path);

const menuItems = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "Orders", path: "/admin/orders", icon: ShoppingBag },
  { name: "Menu", path: "/admin/products", icon: Coffee },
  { name: "Staff", path: "/admin/staff", icon: Users, adminOnly: true },
  { name: "Stores", path: "/admin/stores", icon: Store, adminOnly: true },
  { name: "Platform", path: "/super-admin", icon: ShieldCheck, superOnly: true },
  { name: "Settings", path: "/admin/settings", icon: Settings, adminOnly: true },
];

const visibleMenuItems = computed(() => menuItems.filter(item => {
  if (item.superOnly && userStore.role !== "super_admin") return false;
  if (item.adminOnly && !["admin", "super_admin"].includes(userStore.role)) return false;
  return true;
}));

const isCollapsed = ref(false);
</script>

<template>
  <div class="flex h-screen bg-slate-50 text-slate-900 overflow-hidden text-sm font-sans relative">
    
    <div v-if="isImpersonating" class="absolute top-0 left-0 right-0 z-60 bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-md">
       <div class="flex items-center gap-2">
          <Eye class="w-4 h-4 animate-pulse" />
          <span class="font-bold text-xs">Viewing as: {{ userStore.storeName }}</span>
       </div>
       <button @click="exitImpersonation" class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-bold transition-colors">
          Exit View
       </button>
    </div>

    <div v-if="isExpired && !subLoading && userStore.role !== 'super_admin' && !isImpersonating" class="absolute inset-0 z-100 bg-slate-50/80 backdrop-blur-md flex flex-col items-center justify-center text-center p-6">
       <div class="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Lock class="w-8 h-8 text-red-600" />
       </div>
       <h2 class="text-2xl font-bold text-slate-900 mb-2">Subscription Expired</h2>
       <p class="text-slate-500 max-w-md mb-6">
          Your access to the Admin Dashboard has been suspended because your plan has expired. Please contact support to renew your subscription.
       </p>
       <div class="flex gap-3">
          <button @click="handleLogout" class="px-6 py-2.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50">
             Sign Out
          </button>
          <a href="https://t.me/sayvathanak" target="_blank" class="px-6 py-2.5 bg-black text-white rounded-xl font-bold hover:bg-slate-800">
             Contact Support
          </a>
       </div>
    </div>

    <aside class="hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-40" :class="isCollapsed ? 'w-20' : 'w-64'">
      <div class="h-20 flex items-center justify-center relative overflow-hidden" :class="isImpersonating ? 'mt-8' : ''">
        <div v-if="logoUrl && !isCollapsed" class="w-full px-6 flex justify-start">
           <img :src="logoUrl" class="h-5 md:h-10 object-contain" />
        </div>
        <div v-else class="flex items-center gap-3 px-4 w-full">
           <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0 font-preah">
             {{ userStore.storeName ? userStore.storeName.charAt(0) : "S" }}
           </div>
           <div v-if="!isCollapsed" class="flex flex-col overflow-hidden whitespace-nowrap">
             <span class="font-bold truncate">{{ userStore.storeName || 'Loading...' }}</span>
             <span class="text-[9px] uppercase font-bold text-slate-400">{{ userStore.role }}</span>
           </div>
        </div>
      </div>

      <nav class="flex-1 px-3 space-y-1 mt-4">
        <router-link v-for="item in visibleMenuItems" :key="item.path" :to="item.path" class="flex items-center gap-3 px-3 py-3 rounded-xl transition-all" :class="isActive(item.path)?'bg-slate-50 text-slate-900 font-semibold':'text-slate-500 hover:bg-slate-50'">
          <component :is="item.icon" class="w-5 h-5 shrink-0" :class="{'text-slate-900':isActive(item.path)}" />
          <span v-if="!isCollapsed" class="whitespace-nowrap">{{ item.name }}</span>
        </router-link>
      </nav>

      <div class="p-3 mb-4 space-y-1">
        <button @click="router.push('/')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-slate-500 hover:bg-slate-100">
          <ArrowLeft class="w-5 h-5 shrink-0"/> <span v-if="!isCollapsed">POS Terminal</span>
        </button>
        <button @click="handleLogout" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl font-medium text-red-500 hover:bg-red-50">
          <LogOut class="w-5 h-5 shrink-0"/> <span v-if="!isCollapsed">Sign Out</span>
        </button>
      </div>
    </aside>

    <nav class="lg:hidden fixed bottom-0 pb-12 w-full bg-black rounded-t-xl backdrop-blur z-50 flex justify-around pt-6">
      <button @click="router.push('/')" class="flex flex-col items-center gap-1 text-slate-400"><ArrowLeft class="w-6 h-6"/><span class="text-[9px] font-bold">POS</span></button>
      <router-link v-for="item in visibleMenuItems.slice(0,3)" :key="item.path" :to="item.path" class="flex flex-col items-center gap-1" :class="isActive(item.path)?'text-zinc-600':'text-slate-400'"><component :is="item.icon" class="w-6 h-6"/><span class="text-[9px] font-bold">{{item.name}}</span></router-link>
      <button @click="showMobileMenu=true" class="flex flex-col items-center gap-1 text-slate-400"><MenuIcon class="w-6 h-6"/><span class="text-[9px] font-bold">More</span></button>
    </nav>

    <div v-if="showMobileMenu" class="lg:hidden fixed inset-0 z-50 flex flex-col justify-end">
      <div class="absolute inset-0 bg-black/40 backdrop-blur-sm" @click="showMobileMenu=false"></div>
      <div class="bg-white w-full rounded-t-3xl p-6 relative z-10 pb-20">
         <div class="flex justify-between items-center mb-6">
           <div class="flex items-center gap-3">
             <div class="w-10 h-10 bg-black rounded-full flex items-center justify-center text-white font-bold">{{userStore.storeName?.charAt(0)}}</div>
             <div><h3 class="font-bold">{{userStore.storeName}}</h3><p class="text-xs text-slate-500 uppercase">{{userStore.role}}</p></div>
           </div>
           <button @click="showMobileMenu=false" class="p-2 bg-slate-100 rounded-full"><XIcon class="w-5 h-5"/></button>
         </div>
         <div class="grid grid-cols-4 gap-4 mb-6">
           <router-link v-for="item in visibleMenuItems" :key="item.path" :to="item.path" @click="showMobileMenu=false" class="flex flex-col items-center gap-2"><div class="w-14 h-14 rounded-2xl flex items-center justify-center" :class="isActive(item.path)?'bg-black text-white':'bg-slate-50 text-slate-600'"><component :is="item.icon" class="w-6 h-6"/></div><span class="text-[10px] font-bold">{{item.name}}</span></router-link>
         </div>
         <button @click="handleLogout" class="w-full p-3.5 rounded-xl bg-red-50 text-red-600 font-bold flex justify-center gap-2"><LogOut class="w-5 h-5"/> Sign Out</button>
      </div>
    </div>

    <main class="flex-1 overflow-y-auto p-4 lg:p-8 pb-32 lg:pb-8" :class="isImpersonating ? 'pt-12' : ''">
      <div class="max-w-6xl mx-auto"><router-view /></div>
    </main>
  </div>
</template>