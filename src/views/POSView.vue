<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";
import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";
import { useUserStore } from "../stores/userStore";
import { ShoppingBag, Search, Wifi, WifiOff, RefreshCw, Star } from "lucide-vue-next";

const router = useRouter();
const cartStore = useCartStore();
const userStore = useUserStore();

const menu = ref([]);
const categories = ref([]);
const selectedCategory = ref("Popular"); 
const isCartOpen = ref(false);
const loading = ref(true);
const searchQuery = ref("");
const showOptions = ref(false);
const selectedDrink = ref(null);
const isOnline = ref(navigator.onLine);
const logoUrl = ref(null);

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
  if (isOnline.value) {
    cartStore.syncOfflineOrders();
    fetchMenu();
  }
};

const fetchSettings = async () => {
  if (!userStore.organizationId) return;
  const { data } = await supabase.from('settings').select('logo_url').eq('organization_id', userStore.organizationId).single();
  if (data?.logo_url) logoUrl.value = data.logo_url;
}

const fetchMenu = async () => {
  if (!navigator.onLine) {
    const cached = localStorage.getItem('cachedMenu');
    if (cached) { menu.value = JSON.parse(cached); initCategories(); }
    loading.value = false; return;
  }
  loading.value = true;
  const { data } = await supabase.from("drinks").select("*").eq("available", true).eq("organization_id", userStore.organizationId).order("name");
  if (data) { menu.value = data; localStorage.setItem('cachedMenu', JSON.stringify(data)); initCategories(); }
  loading.value = false;
};

const initCategories = () => {
  const uniqueCats = [...new Set(menu.value.map((d) => d.category))].sort();
  categories.value = ["Popular", "All", ...uniqueCats];
};

const filteredMenu = computed(() => {
  if (searchQuery.value) return menu.value.filter(d => d.name.toLowerCase().includes(searchQuery.value.toLowerCase()));
  if (selectedCategory.value === 'Popular') return menu.value.filter(item => item.is_popular === true);
  return menu.value.filter((d) => selectedCategory.value === "All" || d.category === selectedCategory.value);
});

const handleDrinkClick = (drink) => { selectedDrink.value = drink; showOptions.value = true; };
const confirmAddToCart = (item) => { cartStore.addToCart(item); showOptions.value = false; };

onMounted(() => {
  fetchMenu();
  fetchSettings();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<template>
  <div class="flex h-screen bg-slate-50 text-slate-900 font-sans overflow-hidden">
    <main class="flex-1 flex flex-col min-w-0 relative">
      <header class="h-20 bg-white/80 backdrop-blur-lg px-6 flex items-center justify-between sticky top-0 z-30 border-b border-slate-200/50">
        <div class="flex items-center gap-6">
          <button @click="router.push('/admin')" class="text-left group">
            <img v-if="logoUrl" :src="logoUrl" class="h-5 md:h-10 w-auto object-contain transition-opacity group-hover:opacity-80" />
            <div v-else class="flex flex-col items-start">
              <div class="text-xl font-medium tracking-tight group-hover:text-slate-600">Cambodge</div>
              <p class="text-[10px] uppercase tracking-widest text-slate-400 font-medium">POS System</p>
            </div>
          </button>
        </div>

        <div class="hidden sm:flex items-center gap-4 flex-1 max-w-md mx-8">
          <div class="relative w-full group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full bg-white shadow-sm border border-slate-200 outline-none rounded-full py-2.5 pl-10 pr-4 text-sm font-medium focus:ring-2 focus:ring-black/5" />
          </div>
        </div>

        <div class="flex items-center gap-4">
           <button v-if="cartStore.offlineQueue.length > 0" @click="cartStore.syncOfflineOrders()" class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium uppercase"><RefreshCw class="w-3 h-3 animate-spin" /> Sync ({{ cartStore.offlineQueue.length }})</button>
           <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border" :class="isOnline ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'">
            <component :is="isOnline ? Wifi : WifiOff" class="w-3.5 h-3.5" />
            <span class="text-[10px] font-medium uppercase hidden lg:inline">{{ isOnline ? 'Online' : 'Offline' }}</span>
          </div>
          <button @click="isCartOpen = true" class="lg:hidden relative p-2 bg-slate-100 rounded-full shrink-0"><ShoppingBag class="w-5 h-5" /><span v-if="cartStore.items.length" class="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-[10px] font-medium flex items-center justify-center rounded-full border-2 border-white">{{ cartStore.items.length }}</span></button>
        </div>
      </header>

      <div class="px-6 py-4 flex gap-3 overflow-x-auto scrollbar-hide shrink-0">
        <button v-for="cat in categories" :key="cat" @click="selectedCategory = cat" class="rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider border transition-all whitespace-nowrap flex items-center gap-1.5" :class="selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg' : 'bg-white text-slate-500 border-slate-200'"><Star v-if="cat === 'Popular'" class="w-3 h-3 fill-current" />{{ cat === 'Popular' ? 'Top Picks' : cat }}</button>
      </div>

      <section class="flex-1 overflow-y-auto p-6 pt-0">
        <div v-if="loading" class="h-full flex items-center justify-center"><div class="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div></div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-32 lg:pb-0">
          <CardDrink v-for="drink in filteredMenu" :key="drink.id" :drink="drink" @click="handleDrinkClick(drink)" />
        </div>
      </section>
    </main>

    <aside class="fixed inset-y-0 right-0 z-50 w-full sm:w-100 bg-white border-l border-slate-200 transition-all duration-500 lg:static lg:translate-x-0 shrink-0" :class="isCartOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-full lg:shadow-none'"><CartSidebar @close-cart="isCartOpen = false" /></aside>
    <button v-if="cartStore.items.length > 0 && !isCartOpen" @click="isCartOpen = true" class="lg:hidden fixed left-4 right-4 bottom-4 z-50 bg-black text-white px-6 py-4 flex items-center justify-between text-sm font-medium rounded-2xl shadow-2xl"><div class="flex items-center gap-3"><span class="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">{{ cartStore.items.length }}</span><span>View Order</span></div><span class="text-lg">{{ cartStore.cartTotal.toLocaleString() }}៛</span></button>
    <ProductOptionsModal :isOpen="showOptions" :drink="selectedDrink" @close="showOptions = false" @add-to-cart="confirmAddToCart" />
  </div>
</template>