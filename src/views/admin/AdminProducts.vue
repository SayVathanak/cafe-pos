<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../services/supabase";
import AdminProductModal from "../../components/AdminProductModal.vue";
import { useToastStore } from "../../stores/toastStore";
import { useUserStore } from "../../stores/userStore";
import { usePlanLimits } from "../../composables/usePlanLimits"; // <--- IMPORT
import { Plus, Search, Image as ImageIcon, LayoutGrid, List, Edit2, Trash2, Star, Lock, Filter } from "lucide-vue-next";

const toast = useToastStore();
const userStore = useUserStore();
const { fetchUsage, checkLimit, usage, limits } = usePlanLimits(); // <--- USE

const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const selectedItem = ref(null);
const searchQuery = ref("");
const selectedCategory = ref("All");
const viewMode = ref("grid");

const categories = computed(() => ["All", ...new Set(products.value.map((p) => p.category))].sort());
const modalCategories = computed(() => [...new Set(products.value.map((p) => p.category))].sort());
const filteredProducts = computed(() => products.value.filter((p) => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || p.category.toLowerCase().includes(searchQuery.value.toLowerCase());
    const matchesCat = selectedCategory.value === "All" || p.category === selectedCategory.value;
    return matchesSearch && matchesCat;
}));

const fetchProducts = async () => {
  loading.value = true;
  await fetchUsage(); // <--- Refresh limits on load
  const { data, error } = await supabase.from("drinks").select("*").eq("organization_id", userStore.organizationId).order("created_at", { ascending: false });
  if (error) toast.addToast("Failed to load products", "error");
  else products.value = data || [];
  loading.value = false;
};

const deleteProduct = async (id) => {
  if (!confirm("Delete item?")) return;
  const { error } = await supabase.from("drinks").delete().eq("id", id);
  if (!error) { toast.addToast("Deleted"); fetchProducts(); }
};

const onSaved = () => { fetchProducts(); toast.addToast("Saved"); };

const openAdd = () => {
  if (!userStore.isAdminOrSuper) return;
  // --- LIMIT CHECK ---
  if (!checkLimit('add_item')) {
     alert(`Limit Reached: The ${limits.value.name} Plan allows max ${limits.value.max_items} items. Upgrade to Standard for unlimited.`);
     return;
  }
  selectedItem.value = null;
  showModal.value = true;
};

const openEdit = (item) => { 
  if (!userStore.isAdminOrSuper) return;
  selectedItem.value = item; 
  showModal.value = true; 
};

onMounted(fetchProducts);
</script>

<template>
  <div class="mx-auto min-h-screen bg-slate-50 pb-24 lg:pb-12 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
      <div>
        <h1 class="text-2xl font-medium text-slate-900 tracking-tight">Drinks Menu</h1>
        <p class="text-sm text-slate-500 mt-1">Manage catalogue. <span class="font-bold text-slate-900">{{ usage.items }} / {{ limits.max_items }} used.</span></p>
      </div>

      <div class="hidden md:flex items-center gap-3">
        <div class="bg-white p-1 rounded-lg border border-slate-200 shadow-sm flex items-center">
          <button @click="viewMode = 'grid'" :class="viewMode === 'grid' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'" class="p-2 rounded-md"><LayoutGrid class="w-4 h-4" /></button>
          <div class="w-px h-4 bg-slate-100 mx-1"></div>
          <button @click="viewMode = 'list'" :class="viewMode === 'list' ? 'bg-indigo-50 text-indigo-600' : 'text-slate-400'" class="p-2 rounded-md"><List class="w-4 h-4" /></button>
        </div>

        <button v-if="userStore.isAdminOrSuper" @click="openAdd"
          :class="checkLimit('add_item') ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'"
          class="px-5 py-2.5 rounded-xl text-sm shadow-lg flex items-center gap-2 transition-all active:scale-95">
          <component :is="checkLimit('add_item') ? Plus : Lock" class="w-4 h-4" />
          <span>{{ checkLimit('add_item') ? 'Add Product' : 'Limit Reached' }}</span>
        </button>
      </div>
    </header>

    <div class="sticky top-0 z-30 -mx-4 px-4 md:mx-0 md:px-0 mb-6">
      <div class="bg-white/80 backdrop-blur-xl border-y md:border border-slate-200 md:rounded-2xl p-3 shadow-lg flex flex-col gap-3">
        <div class="flex gap-3">
          <div class="relative flex-1 group">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600" />
            <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full pl-10 pr-4 py-2.5 bg-white md:bg-slate-50 border border-slate-200 rounded-xl text-sm outline-none focus:border-indigo-500 transition-all" />
          </div>
        </div>
        <div class="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          <div class="flex items-center gap-1.5 pr-4">
            <Filter class="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <div class="w-px h-4 bg-slate-200 mx-1"></div>
            <button v-for="cat in categories" :key="cat" @click="selectedCategory = cat" class="px-3.5 py-1.5 rounded-full text-[10px] font-medium uppercase tracking-widest whitespace-nowrap border transition-all"
              :class="selectedCategory === cat ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500 border-slate-200 hover:bg-slate-50'">
              {{ cat }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="loading" class="py-20 flex justify-center"><div class="w-8 h-8 border-4 border-slate-200 border-t-indigo-600 rounded-full animate-spin"></div></div>
    <div v-else-if="filteredProducts.length === 0" class="py-20 text-center text-slate-400">No products found.</div>

    <div v-else>
      <div v-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer">
          <div class="aspect-square relative overflow-hidden bg-slate-50">
            <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon class="w-10 h-10" /></div>
            <div v-if="item.is_popular" class="absolute top-2 right-2 bg-amber-400 text-white p-1.5 rounded-lg"><Star class="w-3 h-3 fill-white" /></div>
          </div>
          <div class="p-3 md:p-4 flex flex-col flex-1">
            <div class="mb-2">
              <span class="inline-block text-[9px] font-medium text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded">{{ item.category }}</span>
              <h3 class="font-medium text-slate-900 text-sm leading-tight line-clamp-2">{{ item.name }}</h3>
            </div>
            <div class="mt-auto flex items-end justify-between border-t border-slate-50 pt-2">
              <span class="text-sm text-slate-700">{{ item.price.toLocaleString() }} <span class="text-xs text-slate-400">៛</span></span>
              <div v-if="userStore.isAdminOrSuper" class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors"><Edit2 class="w-3.5 h-3.5" /></div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="space-y-3">
          <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" class="flex items-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 cursor-pointer">
             <div class="w-12 h-12 bg-slate-100 rounded-lg mr-4 overflow-hidden"><img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/></div>
             <div class="flex-1">
                <div class="font-bold text-sm">{{ item.name }}</div>
                <div class="text-xs text-slate-500">{{ item.category }}</div>
             </div>
             <div class="font-bold text-sm mr-4">{{ item.price.toLocaleString() }} ៛</div>
             <button v-if="userStore.isAdminOrSuper" @click.stop="deleteProduct(item.id)" class="p-2 text-slate-400 hover:text-red-600"><Trash2 class="w-4 h-4"/></button>
          </div>
        </div>
      </div>
    </div>

    <button v-if="userStore.isAdminOrSuper" @click="openAdd" class="md:hidden fixed bottom-24 right-6 w-12 h-12 bg-indigo-600 text-white rounded-full shadow-xl flex items-center justify-center z-40">
       <component :is="checkLimit('add_item') ? Plus : Lock" class="w-6 h-6" />
    </button>

    <AdminProductModal v-if="userStore.isAdminOrSuper" :isOpen="showModal" :product="selectedItem" :allCategories="modalCategories" @close="showModal = false" @saved="onSaved" />
  </div>
</template>