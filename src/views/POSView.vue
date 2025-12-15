<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useCartStore } from "../stores/cartStore";

import CardDrink from "../components/CardDrink.vue";
import CartSidebar from "../components/CartSidebar.vue";
import ProductOptionsModal from "../components/ProductOptionsModal.vue";

import { ShoppingBag, Menu, Search, X, Settings } from "lucide-vue-next";

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

  const { data } = await supabase
    .from("drinks")
    .select("*")
    .eq("available", true)
    .order("name");

  if (data) {
    menu.value = data;
    categories.value = ["All", ...new Set(data.map((d) => d.category))];
  }

  loading.value = false;
};

// ---------------- FILTER & SEARCH ----------------
const filteredMenu = computed(() => {
  return menu.value.filter((d) => {
    const matchesCat =
      selectedCategory.value === "All" || d.category === selectedCategory.value;
    const matchesSearch = d.name
      .toLowerCase()
      .includes(searchQuery.value.toLowerCase());
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
  isCartOpen.value = true;
  showOptions.value = false;
};

const goToAdmin = () => {
  router.push("/admin");
};

onMounted(fetchMenu);
</script>

<template>
  <div
    class="flex h-screen bg-white text-slate-900 font-sans antialiased overflow-hidden"
  >
    <main class="flex-1 flex flex-col min-w-0 relative">
      <header
        class="h-20 bg-white px-6 flex items-center justify-between sticky top-0 z-30 flex-shrink-0"
      >
        <div class="flex items-center gap-6 pt-6">
          <div class="lg:hidden">
            <button @click="goToAdmin">
              <Menu class="w-6 h-6 text-slate-500" />
            </button>
          </div>

          <button
            @click="goToAdmin"
            class="bg-white border-none"
            title="Admin Panel"
          >
            <div class="flex flex-col items-start">
              <div class="text-xl font-medium tracking-tight font-khmer">
                សាយ័ណ្ហកាហ្វេ
              </div>
              <p
                class="text-[10px] uppercase tracking-widest text-slate-400 font-semibold"
              >
                Cambodge POS System
              </p>
            </div>
          </button>
        </div>

        <div class="hidden sm:flex items-center gap-4 flex-1 max-w-md mx-8">
          <div class="relative w-full group">
            <Search
              class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-black transition-colors"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search beverages..."
              class="w-full bg-slate-50 border-none outline-none rounded-full py-2.5 pl-10 pr-4 text-sm placeholder:text-slate-400"
            />
          </div>
        </div>

        <button
          @click="isCartOpen = true"
          class="lg:hidden relative p-2 bg-slate-100 rounded-full flex-shrink-0"
        >
          <ShoppingBag class="w-5 h-5" />
          <span
            v-if="cartStore.items.length"
            class="absolute -top-1 -right-1 w-5 h-5 bg-black text-white text-[10px] font-medium flex items-center justify-center rounded-full border-2 border-white"
          >
            {{ cartStore.items.length }}
          </span>
        </button>
      </header>

      <div
        class="p-4 flex gap-3 overflow-x-auto scrollbar-hide flex-shrink-0"
      >
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat"
          class="border-none rounded-full px-5 py-2 text-xs font-medium uppercase tracking-wider transition-all whitespace-nowrap"
          :class="
            selectedCategory === cat
              ? 'bg-black text-white'
              : 'bg-white text-slate-500'
          "
        >
          {{ cat }}
        </button>
      </div>

      <section class="flex-1 overflow-y-auto scroll-smooth scrollbar-hide">
        <div v-if="loading" class="h-full flex items-center justify-center">
          <div
            class="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"
          ></div>
        </div>

        <div
          v-else-if="filteredMenu.length === 0"
          class="h-full flex flex-col items-center justify-center text-slate-400"
        >
          <Search class="w-12 h-12 mb-4 opacity-20" />
          <p>No drinks found in this category or search.</p>
        </div>

        <div
          v-else
          class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 pb-20 lg:pb-0"
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

    <aside
      class="fixed inset-y-0 right-0 z-50 w-full sm:w-[400px] bg-white border-l border-slate-200 shadow-2xl transition-transform duration-500 lg:static lg:translate-x-0 lg:shadow-none flex-shrink-0"
      :class="isCartOpen ? 'translate-x-0' : 'translate-x-full'"
    >
      <button
        @click="isCartOpen = false"
        class="lg:hidden absolute top-6 left-[-50px] w-10 h-10 bg-white border border-slate-200 rounded-full flex items-center justify-center shadow-lg z-50"
      >
        <X class="w-5 h-5" />
      </button>
      <CartSidebar @close-cart="isCartOpen = false" />
    </aside>

    <button
      v-if="cartStore.items.length > 0 && !isCartOpen"
      @click="isCartOpen = true"
      class="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-black text-white px-6 py-4 flex items-center justify-between text-sm font-medium safe-bottom shadow-2xl shadow-black/50"
    >
      <div class="flex items-center gap-3">
        <span
          class="bg-white text-black rounded-full w-6 h-6 flex items-center justify-center text-xs font-black"
        >
          {{ cartStore.items.length }}
        </span>
        <span class="uppercase tracking-widest">VIEW ORDER</span>
      </div>

      <span class="text-xl tracking-tight">
        {{ cartStore.cartTotal.toLocaleString() }}៛
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
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
}
.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>
