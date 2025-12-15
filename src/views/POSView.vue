<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";

import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";

import { ShoppingBag } from "lucide-vue-next";

const cartStore = useCartStore();

const menu = ref([]);
const categories = ref([]);
const selectedCategory = ref("All");
const isCartOpen = ref(false);
const loading = ref(true);

const showOptions = ref(false);
const selectedDrink = ref(null);

// ---------------- FETCH MENU ----------------
const fetchMenu = async () => {
  loading.value = true;

  const { data, error } = await supabase
    .from("drinks")
    .select("*")
    .eq("available", true)
    .order("name");

  if (data) {
    menu.value = data;
    categories.value = ["All", ...new Set(data.map(d => d.category))];
  }

  loading.value = false;
};

// ---------------- FILTER ----------------
const filteredMenu = computed(() => {
  if (selectedCategory.value === "All") return menu.value;
  return menu.value.filter(d => d.category === selectedCategory.value);
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
  <div class="flex h-screen bg-zinc-50 overflow-hidden">

    <!-- ================= MAIN ================= -->
    <main class="flex-1 flex flex-col min-w-0">

      <!-- HEADER -->
      <header class="bg-white border-b px-4 sm:px-6 py-4 flex justify-between items-center">
        <div>
          <h1 class="text-lg sm:text-xl font-medium font-khmer tracking-tight">
            សាយ័ណ្ហកាហ្វេ
          </h1>
          <p class="text-xs font-mono text-zinc-400">POS SYSTEM v1.0</p>
        </div>

        <!-- Cart toggle (mobile) -->
        <button
          @click="isCartOpen = true"
          class="lg:hidden p-2 border rounded hover:bg-zinc-100"
        >
          <ShoppingBag class="w-5 h-5" />
        </button>
      </header>

      <!-- CATEGORIES -->
      <div class="bg-white border-b px-3 sm:px-6 py-3 flex gap-4 overflow-x-auto scrollbar-hide">
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat"
          class="pb-1 text-xs sm:text-sm uppercase tracking-wide border-b-2 whitespace-nowrap transition"
          :class="selectedCategory === cat
            ? 'border-black text-black'
            : 'border-transparent text-zinc-400 hover:text-zinc-600'"
        >
          {{ cat }}
        </button>
      </div>

      <!-- PRODUCT GRID -->
      <section class="flex-1 overflow-y-auto px-3 sm:px-6 py-4 scrollbar-hide">
        <!-- Loading -->
        <div v-if="loading" class="flex justify-center py-24">
          <div class="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full"></div>
        </div>

        <!-- Grid -->
        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4
                 gap-3 sm:gap-6 pb-28 lg:pb-6"
        >
          <CardDrink
            v-for="drink in filteredMenu"
            :key="drink.id"
            :drink="drink"
            @click="handleDrinkClick(drink)"
          />
        </div>
      </section>
    </main>

    <!-- ================= CART ================= -->
    <aside
      class="fixed inset-y-0 right-0 z-40 w-full sm:w-[380px] bg-white border-l
             transform transition-transform duration-300
             lg:relative lg:translate-x-0"
      :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <!-- Close button (mobile) -->
      <button
        @click="isCartOpen = false"
        class="lg:hidden absolute top-4 right-4 p-2 bg-black text-white"
      >
        ✕
      </button>

      <CartSidebar />
    </aside>

    <!-- ================= MOBILE BOTTOM CART BUTTON ================= -->
    <button
      v-if="cartStore.items.length > 0"
      @click="isCartOpen = true"
      class="lg:hidden fixed bottom-0 left-0 right-0 z-30
             bg-black text-white
             px-4 py-4
             flex items-center justify-between
             text-sm font-bold
             safe-bottom"
    >
      <div class="flex items-center gap-3">
        <span
          class="bg-white text-black rounded-full w-6 h-6
                 flex items-center justify-center text-xs"
        >
          {{ cartStore.items.length }}
        </span>
        <span>VIEW CART</span>
      </div>

      <span class="text-lg tracking-tight">
        {{ cartStore.cartTotal.toLocaleString() }}៛
      </span>
    </button>

    <!-- ================= OPTIONS MODAL ================= -->
    <ProductOptionsModal
      :isOpen="showOptions"
      :drink="selectedDrink"
      @close="showOptions = false"
      @add-to-cart="confirmAddToCart"
    />
  </div>
</template>

<style scoped>
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
}

/* iOS Safe Area */
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>