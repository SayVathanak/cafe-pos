<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router"; 
import { supabase } from "../../services/supabase";
import AdminProductModal from "../../components/AdminProductModal.vue";
import { useToastStore } from "../../stores/toastStore";
import { useUserStore } from "../../stores/userStore";
import { usePlanLimits } from "../../composables/usePlanLimits"; 
import { 
  Plus, Search, Image as ImageIcon, LayoutGrid, List, Edit2, Trash2, 
  Star, Lock, Filter, AlertTriangle, ArrowLeft, Archive, RotateCcw 
} from "lucide-vue-next";

const route = useRoute();
const toast = useToastStore();
const userStore = useUserStore();
const { fetchUsage, checkLimit, usage, limits } = usePlanLimits();

// Check if user was sent here to fix a downgrade issue
const isFixMode = computed(() => route.query.redirect_reason === 'downgrade_fix');

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
  await fetchUsage(); // Refresh limits on load
  const { data, error } = await supabase
    .from("drinks")
    .select("*")
    .eq("organization_id", userStore.organizationId)
    .order("created_at", { ascending: false });

  if (error) toast.addToast("Failed to load products", "error");
  else products.value = data || [];
  loading.value = false;
};

const toggleArchive = async (item) => {
  const newValue = !item.is_archived;
  const { error } = await supabase
    .from("drinks")
    .update({ is_archived: newValue })
    .eq("id", item.id);

  if (error) {
    toast.addToast("Error updating product", "error");
  } else {
    toast.addToast(newValue ? "Product Archived" : "Product Restored", "success");
    fetchProducts(); // Update list UI
    fetchUsage();    // Update Plan Limits
  }
};

const deleteProduct = async (id) => {
  if (!confirm("Delete item?")) return;
  const { error } = await supabase.from("drinks").delete().eq("id", id);
  if (!error) { 
    toast.addToast("Deleted"); 
    fetchProducts(); 
    fetchUsage();
  }
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
    
    <div v-if="isFixMode" class="bg-amber-50 border-b border-amber-200 px-4 py-3 mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
      <div class="flex items-center gap-3">
        <div class="p-2 bg-amber-100 rounded-full text-amber-600 shrink-0">
          <AlertTriangle class="w-5 h-5" />
        </div>
        <div>
          <h3 class="font-bold text-amber-900 text-sm">Limit Resolution Required</h3>
          <p class="text-xs text-amber-700">Please archive or delete extra products to proceed with your plan downgrade.</p>
        </div>
      </div>
      <router-link to="/admin/settings" class="text-xs font-bold text-slate-600 hover:text-slate-900 flex items-center gap-1 bg-white px-3 py-2 rounded-lg border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap">
        <ArrowLeft class="w-3 h-3" /> Return to Settings
      </router-link>
    </div>

    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 px-4 md:px-0">
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

    <div class="sticky top-0 z-30 px-4 md:px-0 mb-6">
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

    <div v-else class="px-4 md:px-0">
      <div v-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-6">
        <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" 
          class="group bg-white rounded-2xl border border-slate-200 overflow-hidden hover:border-indigo-300 hover:shadow-xl transition-all cursor-pointer"
          :class="{ 'opacity-60 grayscale': item.is_archived }">
          
          <div class="aspect-square relative overflow-hidden bg-slate-50">
            <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform" />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon class="w-10 h-10" /></div>
            <div v-if="item.is_popular" class="absolute top-2 right-2 bg-amber-400 text-white p-1.5 rounded-lg"><Star class="w-3 h-3 fill-white" /></div>
            
            <div v-if="item.is_archived" class="absolute inset-0 bg-slate-100/50 flex items-center justify-center">
               <span class="px-3 py-1 bg-slate-200 text-slate-600 text-xs font-bold rounded-full border border-slate-300 shadow-sm">Archived</span>
            </div>
          </div>
          
          <div class="p-3 md:p-4 flex flex-col flex-1">
            <div class="mb-2">
              <span class="inline-block text-[9px] font-medium text-slate-400 uppercase bg-slate-50 px-1.5 py-0.5 rounded">{{ item.category }}</span>
              <h3 class="font-medium text-slate-900 text-sm leading-tight line-clamp-2">{{ item.name }}</h3>
            </div>
            
            <div class="mt-auto flex items-end justify-between border-t border-slate-50 pt-2">
              <span class="text-sm text-slate-700">{{ item.price.toLocaleString() }} <span class="text-xs text-slate-400">៛</span></span>
              
              <div v-if="userStore.isAdminOrSuper" class="flex items-center gap-2">
                <button 
                  @click.stop="toggleArchive(item)"
                  class="w-8 h-8 rounded-full flex items-center justify-center transition-colors"
                  :class="item.is_archived ? 'bg-amber-100 text-amber-600 hover:bg-amber-200' : 'bg-slate-50 text-slate-400 hover:bg-slate-200'"
                  :title="item.is_archived ? 'Restore' : 'Archive'"
                >
                  <component :is="item.is_archived ? RotateCcw : Archive" class="w-3.5 h-3.5" />
                </button>
                
                <button class="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 hover:bg-indigo-600 hover:text-white transition-colors">
                  <Edit2 class="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="flex flex-col gap-3">
        <div class="space-y-3">
          <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" 
            class="flex items-center p-3 bg-white rounded-xl border border-slate-200 shadow-sm hover:bg-slate-50 cursor-pointer"
            :class="{ 'opacity-60 bg-slate-50': item.is_archived }">
            
             <div class="w-12 h-12 bg-slate-100 rounded-lg mr-4 overflow-hidden relative">
                <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/>
                <div v-if="item.is_archived" class="absolute inset-0 bg-slate-200/50 flex items-center justify-center">
                   <Archive class="w-4 h-4 text-slate-600" />
                </div>
             </div>
             
             <div class="flex-1">
                <div class="font-bold text-sm flex items-center gap-2">
                  {{ item.name }}
                  <span v-if="item.is_archived" class="text-[9px] px-1.5 py-0.5 bg-slate-200 text-slate-600 rounded">Archived</span>
                </div>
                <div class="text-xs text-slate-500">{{ item.category }}</div>
             </div>
             
             <div class="font-bold text-sm mr-4">{{ item.price.toLocaleString() }} ៛</div>
             
             <div v-if="userStore.isAdminOrSuper" class="flex items-center gap-1">
                <button @click.stop="toggleArchive(item)" class="p-2 transition-colors"
                  :class="item.is_archived ? 'text-amber-600 hover:text-amber-700' : 'text-slate-400 hover:text-slate-600'"
                  :title="item.is_archived ? 'Restore' : 'Archive'">
                   <component :is="item.is_archived ? RotateCcw : Archive" class="w-4 h-4" />
                </button>
                <button @click.stop="deleteProduct(item.id)" class="p-2 text-slate-400 hover:text-red-600"><Trash2 class="w-4 h-4"/></button>
             </div>
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