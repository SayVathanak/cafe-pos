<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";

import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";

import { ShoppingBag, Search, Settings } from "lucide-vue-next";

const router = useRouter();
const cartStore = useCartStore();

const menu = ref([]);
const categories = ref([]);
const selectedCategory = ref("All");
const isCartOpen = ref(false);
const loading = ref(true);
const searchQuery = ref("");
const showOptions = ref(false);
const selectedDrink = ref(null);

// ---------------- FETCH MENU ----------------
const fetchMenu = async () => {
  loading.value = true;
  const { data } = await supabase.from("drinks").select("*").eq("available", true).order("name");
  if (data) {
    menu.value = data;
    categories.value = ["All", ...new Set(data.map((d) => d.category))];
  }
  loading.value = false;
};

// ---------------- FILTER ----------------
const filteredMenu = computed(() => {
  return menu.value.filter((d) => {
    const matchesCat = selectedCategory.value === "All" || d.category === selectedCategory.value;
    const matchesSearch = d.name.toLowerCase().includes(searchQuery.value.toLowerCase());
    return matchesCat && matchesSearch;
  });
});

// ---------------- ACTIONS ----------------
const handleDrinkClick = (drink) => {
  selectedDrink.value = drink;
  showOptions.value = true;
};

const confirmAddToCart = (drinkWithOptions) => {
  cartStore.addToCart(drinkWithOptions);
  showOptions.value = false; 
};

onMounted(fetchMenu);
</script>

<template>
  <div class="flex h-screen bg-white text-slate-900 font-sans antialiased overflow-hidden selection:bg-slate-100 selection:text-black">
    
    <main class="flex-1 flex flex-col min-w-0 relative h-full">
      
      <header class="h-16 bg-white border-b border-slate-100 flex items-center justify-between px-4 sticky top-0 z-30 flex-shrink-0 gap-4">
        
        <div class="flex flex-col select-none">
          <h1 class="text-lg font-medium font-khmer leading-none text-slate-900">សាយ័ណ្ហកាហ្វេ</h1>
          <span class="text-[10px] font-medium uppercase tracking-widest text-slate-400 mt-0.5">POS System</span>
        </div>

        <div class="hidden sm:flex items-center flex-1 max-w-sm mx-auto">
          <div class="relative w-full group">
            <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-600 transition-colors" />
            <input 
              v-model="searchQuery" 
              type="text" 
              placeholder="Search items..." 
              class="w-full bg-slate-50 border-none outline-none rounded-full py-2 pl-9 pr-4 text-sm font-medium focus:bg-slate-100 transition-all placeholder:text-slate-400" 
            />
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button 
            @click="router.push('/admin')" 
            class="p-2.5 rounded-full text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-colors"
            title="Admin Dashboard"
          >
            <Settings class="w-5 h-5" />
          </button>

          <button 
            @click="isCartOpen = !isCartOpen" 
            class="lg:hidden relative p-2.5 rounded-full text-slate-900 hover:bg-slate-50 transition-colors"
          >
            <ShoppingBag class="w-5 h-5" />
            <span v-if="cartStore.items.length" class="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full ring-2 ring-white"></span>
          </button>
        </div>
      </header>

      <div class="sm:hidden px-4 pb-2 pt-2 bg-white border-b border-slate-50">
        <div class="relative w-full">
           <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
           <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full bg-slate-50 rounded-xl py-2 pl-9 pr-4 text-sm font-medium outline-none" />
        </div>
      </div>

      <div class="bg-white py-3 px-4 overflow-x-auto scrollbar-hide flex-shrink-0 border-b border-slate-50">
        <div class="flex gap-2">
          <button 
            v-for="cat in categories" :key="cat" 
            @click="selectedCategory = cat"
            class="px-5 py-2 rounded-full text-xs font-medium uppercase tracking-wide whitespace-nowrap transition-all border"
            :class="selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-sm' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:text-slate-700'"
          >
            {{ cat }}
          </button>
        </div>
      </div>

      <section class="flex-1 overflow-y-auto md:p-4 scroll-smooth pb-24 lg:pb-4" id="menu-grid">
        <div v-if="loading" class="h-64 flex items-center justify-center">
          <div class="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
        </div>

        <div v-else-if="filteredMenu.length === 0" class="h-64 flex flex-col items-center justify-center text-slate-400">
          <p class="text-xs font-medium uppercase tracking-widest">No items found</p>
        </div>

        <div v-else class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2 lg:gap-4">
          <CardDrink 
            v-for="drink in filteredMenu" 
            :key="drink.id" 
            :drink="drink" 
            @click="handleDrinkClick(drink)" 
          />
        </div>
      </section>
    </main>

    <div 
      v-if="isCartOpen" 
      class="fixed inset-0 bg-slate-900/20 backdrop-blur-[2px] z-40 lg:hidden transition-opacity"
      @click="isCartOpen = false"
    ></div>

    <aside 
      class="fixed inset-y-0 right-0 z-50 w-[85vw] sm:w-[400px] bg-white shadow-2xl transition-transform duration-300 ease-out lg:static lg:translate-x-0 lg:shadow-none lg:border-l border-slate-100"
      :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <CartSidebar @close-cart="isCartOpen = false" />
    </aside>

    <button
      v-if="cartStore.items.length > 0 && !isCartOpen"
      @click="isCartOpen = true"
      class="lg:hidden fixed bottom-6 left-4 right-4 z-30 bg-slate-900 text-white p-4 rounded-2xl shadow-xl shadow-slate-900/20 flex items-center justify-between active:scale-95 transition-transform"
    >
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-xs font-medium">
          {{ cartStore.items.length }}
        </div>
        <div class="flex flex-col items-start">
          <span class="text-[10px] uppercase font-medium text-white/60 tracking-wider">Total</span>
          <span class="text-sm font-bold font-mono">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
      </div>
      <span class="text-xs font-medium uppercase tracking-widest flex items-center gap-2">
        View Order <ShoppingBag class="w-4 h-4" />
      </span>
    </button>

    <ProductOptionsModal 
      :isOpen="showOptions" 
      :drink="selectedDrink" 
      @close="showOptions = false" 
      @add-to-cart="confirmAddToCart" 
    />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none; }
</style>
