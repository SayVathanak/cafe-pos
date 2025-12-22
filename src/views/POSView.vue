<script setup>
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";
import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";
import { ShoppingBag, Menu, Search, Wifi, WifiOff, RefreshCw, Star } from "lucide-vue-next";

const router = useRouter();
const cartStore = useCartStore();

// STATE
const menu = ref([]);
const categories = ref([]);
const selectedCategory = ref("Popular"); // Default to Popular
const isCartOpen = ref(false);
const loading = ref(true);
const searchQuery = ref("");
const showOptions = ref(false);
const selectedDrink = ref(null);
const isOnline = ref(navigator.onLine);

const updateOnlineStatus = () => {
  isOnline.value = navigator.onLine;
  if (isOnline.value) {
    cartStore.syncOfflineOrders();
    fetchMenu();
  }
};

const fetchMenu = async () => {
  if (!navigator.onLine) {
    const cached = localStorage.getItem('cachedMenu');
    if (cached) {
      menu.value = JSON.parse(cached);
      initCategories();
    }
    loading.value = false;
    return;
  }

  loading.value = true;
  const { data, error } = await supabase
    .from("drinks")
    .select("*")
    .eq("available", true)
    .order("name");

  if (data) {
    menu.value = data;
    localStorage.setItem('cachedMenu', JSON.stringify(data));
    initCategories();
  }
  loading.value = false;
};

const initCategories = () => {
  const uniqueCats = [...new Set(menu.value.map((d) => d.category))].sort();
  categories.value = ["Popular", "All", ...uniqueCats];
};

const filteredMenu = computed(() => {
  // 1. Search Override
  if (searchQuery.value) {
    return menu.value.filter(d => 
      d.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
      d.category.toLowerCase().includes(searchQuery.value.toLowerCase())
    );
  }

  // 2. "Popular" Tab Logic (MANUAL SELECTION)
  if (selectedCategory.value === 'Popular') {
    // ✅ Returns only items where seller clicked the Star
    return menu.value.filter(item => item.is_popular === true);
  }

  // 3. Standard Tabs
  return menu.value.filter((d) => {
    return selectedCategory.value === "All" || d.category === selectedCategory.value;
  });
});

const handleDrinkClick = (drink) => {
  selectedDrink.value = drink;
  showOptions.value = true;
};

const confirmAddToCart = (drinkWithOptions) => {
  cartStore.addToCart(drinkWithOptions);
  isCartOpen.value = true;
  showOptions.value = false;
};

onMounted(() => {
  fetchMenu();
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
});

onUnmounted(() => {
  window.removeEventListener('online', updateOnlineStatus);
  window.removeEventListener('offline', updateOnlineStatus);
});
</script>

<template>
  <div class="flex h-screen bg-slate-50 text-slate-900 font-sans antialiased overflow-hidden">
    
    <main class="flex-1 flex flex-col min-w-0 relative">
      <header class="h-20 bg-white/80 backdrop-blur-lg px-6 flex items-center justify-between sticky top-0 z-30 shrink-0 border-b border-slate-200/50">
        <div class="flex items-center gap-6">
          <button @click="router.push('/admin')" class="text-left group">
            <div class="flex flex-col items-start">
              <div class="text-xl font-medium tracking-tight font-khmer group-hover:text-slate-600 transition-colors">សាយ័ណ្ហកាហ្វេ</div>
              <p class="text-[10px] uppercase tracking-widest text-slate-400 font-medium">POS System</p>
            </div>
          </button>
        </div>

        <div class="hidden sm:flex items-center gap-4 flex-1 max-w-md mx-8">
          <div class="relative w-full group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input v-model="searchQuery" type="text" placeholder="Search beverages..." class="w-full bg-white shadow-sm border border-slate-200 outline-none rounded-full py-2.5 pl-10 pr-4 text-sm font-medium placeholder:text-slate-400 focus:ring-2 focus:ring-black/5 transition-all" />
          </div>
        </div>

        <div class="flex items-center gap-4">
          <button v-if="cartStore.offlineQueue.length > 0" @click="cartStore.syncOfflineOrders()" class="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 rounded-full text-[10px] font-medium uppercase tracking-wide hover:bg-amber-200 transition-colors">
            <RefreshCw class="w-3 h-3 animate-spin-slow" />
            <span>Sync ({{ cartStore.offlineQueue.length }})</span>
          </button>
          <div class="flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-300" :class="isOnline ? 'bg-green-50 border-green-100 text-green-700' : 'bg-red-50 border-red-100 text-red-700'">
            <component :is="isOnline ? Wifi : WifiOff" class="w-3.5 h-3.5" />
            <span class="text-[10px] font-medium uppercase tracking-widest hidden lg:inline">{{ isOnline ? 'Online' : 'Offline' }}</span>
          </div>
          <button @click="isCartOpen = true" class="lg:hidden relative p-2 bg-slate-100 rounded-full shrink-0">
            <ShoppingBag class="w-5 h-5" />
            <span v-if="cartStore.items.length" class="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-[10px] font-medium flex items-center justify-center rounded-full border-2 border-white">{{ cartStore.items.length }}</span>
          </button>
        </div>
      </header>

      <div class="px-6 py-4 flex gap-3 overflow-x-auto scrollbar-hide shrink-0">
        <button v-for="cat in categories" :key="cat" @click="selectedCategory = cat" class="border-none rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap flex items-center gap-1.5"
          :class="selectedCategory === cat ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20' : 'bg-white text-slate-500 hover:bg-slate-50 border border-slate-200'">
          <Star v-if="cat === 'Popular'" class="w-3 h-3 fill-current" />
          {{ cat === 'Popular' ? 'Top Picks' : cat }}
        </button>
      </div>

      <section class="flex-1 overflow-y-auto scroll-smooth p-6 pt-0">
        <div v-if="loading" class="h-full flex items-center justify-center"><div class="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div></div>
        <div v-else-if="filteredMenu.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400"><Search class="w-12 h-12 mb-4 opacity-20" /><p class="text-sm font-medium">No drinks found.</p></div>
        <div v-else class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pb-20 lg:pb-0 auto-rows-fr">
          <CardDrink v-for="drink in filteredMenu" :key="drink.id" :drink="drink" @click="handleDrinkClick(drink)" />
        </div>
      </section>
    </main>

    <aside class="fixed inset-y-0 right-0 z-50 w-full sm:w-100 bg-white border-l border-slate-200 shadow-2xl transition-transform duration-500 lg:static lg:translate-x-0 lg:shadow-none shrink-0" :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'">
      <CartSidebar @close-cart="isCartOpen = false" />
    </aside>

    <button v-if="cartStore.items.length > 0 && !isCartOpen" @click="isCartOpen = true" class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black text-white px-6 py-4 flex items-center justify-between text-sm font-medium safe-bottom shadow-[0_-10px_40px_rgba(0,0,0,0.3)]">
      <div class="flex items-center gap-3"><span class="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black">{{ cartStore.items.length }}</span><span class="uppercase tracking-widest font-medium">View Order</span></div>
      <span class="text-lg font-medium font-khmer">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
    </button>
    
    <ProductOptionsModal :isOpen="showOptions" :drink="selectedDrink" @close="showOptions = false" @add-to-cart="confirmAddToCart" />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; }
.safe-bottom { padding-bottom: env(safe-area-inset-bottom); }
.animate-spin-slow { animation: spin 3s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
</style>