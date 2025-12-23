<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../services/supabase";
import AdminProductModal from "../../components/AdminProductModal.vue";
import { useToastStore } from "../../stores/toastStore";
import { useUserStore } from "../../stores/userStore";
import {
  Plus,
  Search,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  PackageOpen,
  Star,
  XCircle,
  Filter,
} from "lucide-vue-next";

const toast = useToastStore();
const userStore = useUserStore();

const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const selectedItem = ref(null);
const searchQuery = ref("");
const selectedCategory = ref("All");
const viewMode = ref("grid");

// Computed Properties
const categories = computed(() =>
  ["All", ...new Set(products.value.map((p) => p.category))].sort()
);
const modalCategories = computed(() =>
  [...new Set(products.value.map((p) => p.category))].sort()
);

const filteredProducts = computed(() =>
  products.value.filter((p) => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
      p.category.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCat =
      selectedCategory.value === "All" || p.category === selectedCategory.value;
    return matchesSearch && matchesCat;
  })
);

// Data Fetching
const fetchProducts = async () => {
  loading.value = true;
  let query = supabase
    .from("drinks")
    .select("*")
    .order("created_at", { ascending: false });

  const { data, error } = await query;
  
  if (error) toast.addToast("Failed to load products", "error");
  else products.value = data || [];
  
  loading.value = false;
};

// Actions
const deleteProduct = async (id) => {
  if (userStore.role !== 'admin') return; // 🔒 Security Check
  
  if (!confirm("Are you sure you want to delete this item?")) return;
  const { error } = await supabase.from("drinks").delete().eq("id", id);
  if (error) toast.addToast("Could not delete item", "error");
  else {
    toast.addToast("Item deleted");
    fetchProducts();
  }
};

const onSaved = () => {
  fetchProducts();
  toast.addToast("Product saved");
};

const openAdd = () => {
  if (userStore.role !== 'admin') return; // 🔒 Security Check
  selectedItem.value = null;
  showModal.value = true;
};

const openEdit = (item) => {
  if (userStore.role !== 'admin') return; // 🔒 Security Check
  selectedItem.value = item;
  showModal.value = true;
};

onMounted(fetchProducts);
</script>

<template>
  <div class="mx-auto min-h-screen bg-slate-50 pb-24 lg:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <header
      class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"
    >
      <div>
        <h1 class="text-2xl font-medium text-slate-900 tracking-tight">
          Drinks Menu
        </h1>
        <p class="text-sm text-slate-500 mt-1">
          Manage your catalogue, pricing, and availability.
        </p>
      </div>

      <div class="hidden md:flex items-center gap-3">
        <div
          class="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center"
        >
          <button
            @click="viewMode = 'grid'"
            :class="
              viewMode === 'grid'
                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            "
            class="p-2 rounded-md transition-all duration-200"
          >
            <LayoutGrid class="w-4 h-4" />
          </button>
          <div class="w-px h-4 bg-slate-100 mx-1"></div>
          <button
            @click="viewMode = 'list'"
            :class="
              viewMode === 'list'
                ? 'bg-indigo-50 text-indigo-600 shadow-sm'
                : 'text-slate-400 hover:text-slate-600'
            "
            class="p-2 rounded-md transition-all duration-200"
          >
            <List class="w-4 h-4" />
          </button>
        </div>

        <button
          v-if="userStore.role === 'admin'"
          @click="openAdd"
          class="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-sm shadow-lg shadow-indigo-200 flex items-center gap-2 transition-all active:scale-95"
        >
          <Plus class="w-4 h-4" />
          <span>Add Product</span>
        </button>
      </div>
    </header>

    <div class="sticky top-0 z-30 -mx-4 px-4 md:mx-0 md:px-0 mb-6">
      <div
        class="bg-white/80 backdrop-blur-xl border-y md:border border-slate-200 md:rounded-2xl p-3 shadow-lg shadow-slate-200/40 flex flex-col gap-3"
      >
        <div class="flex gap-3">
          <div class="relative flex-1 group">
            <Search
              class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or category..."
              class="w-full pl-10 pr-4 py-2.5 bg-white md:bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all"
            />
          </div>

          <div class="md:hidden flex bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              @click="viewMode = 'grid'"
              :class="viewMode === 'grid' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'"
              class="p-2.5 rounded-lg transition-all"
            >
              <LayoutGrid class="w-4 h-4" />
            </button>
            <button
              @click="viewMode = 'list'"
              :class="viewMode === 'list' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-400'"
              class="p-2.5 rounded-lg transition-all"
            >
              <List class="w-4 h-4" />
            </button>
          </div>
        </div>

        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div class="flex items-center gap-1.5 pr-4">
            <Filter class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div class="w-px h-4 bg-slate-200 mx-1"></div>
            <button
              v-for="cat in categories"
              :key="cat"
              @click="selectedCategory = cat"
              class="px-3.5 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest whitespace-nowrap border transition-all select-none"
              :class="
                selectedCategory === cat
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-200'
                  : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              "
            >
              {{ cat }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div
      v-if="loading"
      class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
    >
      <div v-for="i in 10" :key="i" class="bg-white rounded-2xl p-3 border border-slate-100 shadow-sm">
        <div class="aspect-square bg-slate-100 rounded-xl animate-pulse mb-3"></div>
        <div class="h-4 bg-slate-100 rounded w-3/4 animate-pulse mb-2"></div>
        <div class="h-3 bg-slate-100 rounded w-1/2 animate-pulse"></div>
      </div>
    </div>

    <div
      v-else-if="filteredProducts.length === 0"
      class="flex flex-col items-center justify-center py-20 px-4 text-center"
    >
      <div class="w-20 h-20 bg-slate-100 rounded-full flex items-center justify-center mb-4 ring-8 ring-slate-50">
        <PackageOpen class="w-9 h-9 text-slate-400" />
      </div>
      <h3 class="text-lg font-medium text-slate-900 mb-1">No products found</h3>
      <p class="text-slate-500 text-sm max-w-xs mx-auto mb-6">
        We couldn't find anything matching your search.
      </p>
      <button
        @click="searchQuery = ''; selectedCategory = 'All';"
        class="text-sm text-indigo-600 hover:text-indigo-700 hover:underline"
      >
        Clear all filters
      </button>
    </div>

    <div v-else>
      <div
        v-if="viewMode === 'grid'"
        class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6"
      >
        <div
          v-for="item in filteredProducts"
          :key="item.id"
          class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-xl hover:shadow-indigo-100/50 transition-all duration-300 flex flex-col relative active:scale-[0.98]"
        >
          <div class="aspect-square relative overflow-hidden bg-slate-50">
            <img
              v-if="item.image_url"
              :src="item.image_url"
              class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
              loading="lazy"
            />
            <div
              v-else
              class="w-full h-full flex items-center justify-center text-slate-300"
            >
              <ImageIcon class="w-10 h-10" />
            </div>

            <div class="absolute top-2 right-2 flex flex-col gap-1 items-end">
              <span v-if="item.is_popular" class="bg-amber-400 text-white p-1.5 rounded-lg shadow-sm shadow-amber-200">
                <Star class="w-3 h-3 fill-white" />
              </span>
            </div>

            <div v-if="!item.available" class="absolute inset-0 bg-slate-900/10 backdrop-blur-[1px] flex items-center justify-center">
              <span class="bg-slate-900 text-white text-[10px] font-medium uppercase tracking-widest px-3 py-1 rounded-full shadow-lg">Out of Stock</span>
            </div>
          </div>

          <div class="p-3 md:p-4 flex flex-col flex-1">
            <div class="mb-2">
              <span class="inline-block text-[9px] font-medium text-slate-400 uppercase tracking-widest mb-1 bg-slate-50 px-1.5 py-0.5 rounded">{{ item.category }}</span>
              <h3 class="font-medium text-slate-900 text-sm md:text-sm leading-tight line-clamp-2">
                {{ item.name }}
              </h3>
            </div>

            <div class="mt-auto flex items-end justify-between border-t border-slate-50 pt-2">
              <span class="text-sm md:text-sm text-slate-700">{{ item.price.toLocaleString() }} <span class="text-xs text-slate-400">៛</span></span>
              
              <div v-if="userStore.role === 'admin'" 
                   @click="openEdit(item)"
                   class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 cursor-pointer hover:bg-indigo-600 hover:text-white transition-colors">
                <Edit2 class="w-3.5 h-3.5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3 md:gap-0">
        <div class="hidden md:grid grid-cols-12 gap-4 px-6 py-3 bg-slate-100/50 border-b border-slate-200 text-[10px] font-medium uppercase tracking-widest text-slate-500 rounded-t-2xl">
          <div class="col-span-5">Product</div>
          <div class="col-span-2">Category</div>
          <div class="col-span-2">Price</div>
          <div class="col-span-2">Status</div>
          <div class="col-span-1 text-right">Actions</div>
        </div>

        <div class="space-y-3 md:space-y-0 bg-transparent md:bg-white md:border md:border-slate-200 md:rounded-b-2xl md:divide-y md:divide-slate-50">
          <div
            v-for="item in filteredProducts"
            :key="item.id"
            class="group relative flex flex-col md:grid md:grid-cols-12 md:gap-4 md:items-center p-3 md:px-6 md:py-4 bg-white md:bg-transparent rounded-2xl md:rounded-none border border-slate-200 md:border-0 shadow-sm md:shadow-none hover:bg-slate-50/80 transition-colors"
          >
            <div class="flex items-center gap-3 md:col-span-5 md:w-full">
              <div class="relative w-16 h-16 md:w-12 md:h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0 border border-slate-100">
                <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
                <div v-if="!item.available" class="absolute inset-0 bg-slate-900/30 flex items-center justify-center">
                  <XCircle class="w-4 h-4 text-white" />
                </div>
              </div>
              <div class="flex-1 min-w-0">
                <div class="flex items-center gap-2 mb-0.5">
                  <h3 class="font-medium text-slate-900 text-sm truncate">{{ item.name }}</h3>
                  <Star v-if="item.is_popular" class="w-3 h-3 fill-amber-400 text-amber-400 shrink-0" />
                </div>
                <div class="md:hidden flex items-center gap-2 text-xs text-slate-500">
                  <span>{{ item.price.toLocaleString() }} ៛</span>
                </div>
              </div>
            </div>

            <div class="hidden md:block col-span-2">
              <span class="inline-flex bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-[10px] font-medium uppercase tracking-wider">{{ item.category }}</span>
            </div>

            <div class="hidden md:block col-span-2 text-sm text-slate-700">
              {{ item.price.toLocaleString() }} ៛
            </div>

            <div class="hidden md:block col-span-2">
              <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full" :class="item.available ? 'bg-green-500' : 'bg-red-400'"></span>
                <span class="text-xs font-medium text-slate-600">{{ item.available ? "Active" : "Archived" }}</span>
              </div>
            </div>

            <div class="absolute top-3 right-3 md:static md:col-span-1 md:flex md:justify-end">
              <div v-if="userStore.role === 'admin'" class="flex items-center gap-1">
                <button
                  @click.stop="openEdit(item)"
                  class="p-2 md:p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                  title="Edit"
                >
                  <Edit2 class="w-5 h-5 md:w-4 md:h-4" />
                </button>
                <button
                  @click.stop="deleteProduct(item.id)"
                  class="hidden md:block p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Delete"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="userStore.role === 'admin'"
      @click="openAdd"
      class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-indigo-600 text-white rounded-2xl shadow-xl shadow-indigo-300 flex items-center justify-center z-40 active:scale-90 active:rotate-90 transition-all duration-300"
    >
      <Plus class="w-7 h-7" />
    </button>

    <AdminProductModal
      v-if="userStore.role === 'admin'"
      :isOpen="showModal"
      :product="selectedItem"
      :allCategories="modalCategories"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>

<style scoped>
.no-scrollbar::-webkit-scrollbar {
  display: none;
}
.no-scrollbar {
  -ms-overflow-style: none;
  scrollbar-width: none;
}
</style>