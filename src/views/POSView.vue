<script setup>
import { ref, computed, onMounted } from "vue";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";
import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";
import { LayoutGrid, Coffee, ShoppingBag, Menu } from "lucide-vue-next";

const cartStore = useCartStore();
const menu = ref([]);
const categories = ref([]);
const selectedCategory = ref("All");
const isCartOpen = ref(false);
const loading = ref(true);
const showOptions = ref(false);
const selectedDrink = ref(null);

const fetchMenu = async () => {
  loading.value = true;
  // Connecting to your 'drinks' table
  const { data, error } = await supabase
    .from("drinks")
    .select("*")
    .eq("available", true)
    .order("name", { ascending: true });

  if (data) {
    menu.value = data;
    const uniqueCats = new Set(data.map((item) => item.category));
    categories.value = ["All", ...uniqueCats];
  }
  loading.value = false;
};

const filteredMenu = computed(() => {
  if (selectedCategory.value === "All") return menu.value;
  return menu.value.filter((item) => item.category === selectedCategory.value);
});

const handleDrinkClick = (drink) => {
  selectedDrink.value = drink;
  showOptions.value = true;
};

const confirmAddToCart = (drinkWithModifiers) => {
  cartStore.addToCart(drinkWithModifiers);
  showOptions.value = false;
};

onMounted(() => fetchMenu());
</script>

<template>
  <div class="flex h-screen bg-zinc-50 font-sans text-zinc-900 overflow-hidden">
    <main class="flex-1 flex flex-col h-full relative z-0">
      <header
        class="bg-white border-b border-zinc-200 px-6 py-5 flex items-center justify-between flex-none"
      >
        <div>
          <h1
            class="text-xl font-khmer font-medium tracking-tight leading-none"
          >
            សាយ័ណ្ហកាហ្វេ
          </h1>
          <p class="text-xs font-mono text-zinc-400 mt-1">POS SYSTEM v1.0</p>
        </div>

        <button
          @click="isCartOpen = !isCartOpen"
          class="lg:hidden p-2 hover:bg-zinc-100 border border-zinc-200"
        >
          <ShoppingBag class="w-5 h-5" />
        </button>
      </header>

      <div
        class="px-6 py-4 bg-white flex gap-6 overflow-x-auto scrollbar-hide border-b border-zinc-200 flex-none"
      >
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat"
          class="pb-1 text-sm font-medium uppercase tracking-wide transition-all border-b-2 whitespace-nowrap"
          :class="
            selectedCategory === cat
              ? 'border-black text-black'
              : 'border-transparent text-zinc-400 hover:text-zinc-600'
          "
        >
          {{ cat }}
        </button>
      </div>

      <div class="flex-1 overflow-y-auto p-6 bg-zinc-50">
        <div
          v-if="loading"
          class="flex flex-col items-center justify-center h-64 opacity-50"
        >
          <div
            class="animate-spin w-6 h-6 border-2 border-black border-t-transparent rounded-full mb-4"
          ></div>
          <span class="font-mono text-xs">LOADING DATA...</span>
        </div>

        <div
          v-else
          class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6 pb-24 lg:pb-0"
        >
          <div
            v-for="drink in filteredMenu"
            :key="drink.id"
            @click="handleDrinkClick(drink)"
          >
            <CardDrink :drink="drink" />
          </div>
        </div>
      </div>
    </main>

    <aside
      class="fixed inset-y-0 right-0 z-30 w-full md:w-[400px] bg-white border-l border-zinc-200 transform transition-transform duration-300 lg:relative lg:translate-x-0"
      :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <button
        @click="isCartOpen = false"
        class="lg:hidden absolute top-4 right-4 z-50 p-2 bg-black text-white"
      >
        ✕
      </button>

      <CartSidebar />
    </aside>

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
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>
