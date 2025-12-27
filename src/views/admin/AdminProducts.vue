<script setup>
import { ref, onMounted, computed } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../../services/supabase";
import AdminProductModal from "../../components/AdminProductModal.vue";
import { useToastStore } from "../../stores/toastStore";
import { useUserStore } from "../../stores/userStore";
import { usePlanLimits } from "../../composables/usePlanLimits";
import {
  Plus,
  Search,
  Image as ImageIcon,
  LayoutGrid,
  List,
  Edit2,
  Trash2,
  Star,
  Lock,
  Filter,
  AlertTriangle,
  ArrowLeft,
  Archive,
  RotateCcw,
} from "lucide-vue-next";

const route = useRoute();
const toast = useToastStore();
const userStore = useUserStore();
const { fetchUsage, checkLimit, usage, limits } = usePlanLimits();
const isFixMode = computed(
  () => route.query.redirect_reason === "downgrade_fix"
);
const products = ref([]);
const loading = ref(true);
const showModal = ref(false);
const selectedItem = ref(null);
const searchQuery = ref("");
const selectedCategory = ref("All");
const viewMode = ref("grid");

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

const fetchProducts = async () => {
  loading.value = true;
  await fetchUsage();
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
  if (error) toast.addToast("Error updating product", "error");
  else {
    toast.addToast(
      newValue ? "Product Archived" : "Product Restored",
      "success"
    );
    fetchProducts();
    fetchUsage();
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

const onSaved = () => {
  fetchProducts();
  toast.addToast("Saved");
};
const openAdd = () => {
  if (!userStore.isAdminOrSuper) return;
  if (!checkLimit("add_item")) {
    alert(`Limit Reached. Upgrade to add more.`);
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
  <div
    class="space-y-6 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500"
  >
    <div
      v-if="isFixMode"
      class="bg-amber-50 border border-amber-200 rounded-xl p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 shadow-sm"
    >
      <div class="flex items-center gap-4">
        <div
          class="size-10 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 shrink-0"
        >
          <AlertTriangle class="size-5" />
        </div>
        <div>
          <h3 class="font-bold text-amber-900 text-sm">
            Limit Resolution Required
          </h3>
          <p class="text-xs text-amber-700 mt-0.5">
            Please archive/delete extra products to proceed.
          </p>
        </div>
      </div>
      <router-link
        to="/admin/settings"
        class="text-xs font-bold text-slate-700 bg-white px-4 py-2.5 rounded-lg border border-amber-200 hover:bg-amber-50 transition-colors shadow-sm flex items-center gap-2"
        ><ArrowLeft class="size-3" /> Settings</router-link
      >
    </div>

    <div
      class="flex flex-col sm:flex-row justify-between gap-4"
    >
      <div class="relative flex-1 max-w-md">
        <Search
          class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
        />
        <input
          v-model="searchQuery"
          placeholder="Search..."
          class="w-full pl-10 pr-4 py-2.5 border border-slate-200 outline-none rounded-lg text-sm font-medium"
        />
      </div>
      <div class="flex items-center gap-2 overflow-x-auto no-scrollbar">
        <div
          class="hidden md:flex bg-slate-50 p-1 rounded-lg border border-slate-200 mr-2"
        >
          <button
            @click="viewMode = 'grid'"
            :class="
              viewMode === 'grid'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-400'
            "
            class="p-2 rounded-md transition-all"
          >
            <LayoutGrid class="size-4" />
          </button>
          <button
            @click="viewMode = 'list'"
            :class="
              viewMode === 'list'
                ? 'bg-white shadow-sm text-slate-900'
                : 'text-slate-400'
            "
            class="p-2 rounded-md transition-all"
          >
            <List class="size-4" />
          </button>
        </div>
        <button
          v-for="cat in categories"
          :key="cat"
          @click="selectedCategory = cat"
          class="px-4 py-2 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border"
          :class="
            selectedCategory === cat
              ? 'bg-slate-900 text-white border-slate-900'
              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
          "
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-20 flex justify-center">
      <Loader2 class="size-8 animate-spin text-slate-300" />
    </div>
    <div
      v-else-if="filteredProducts.length === 0"
      class="py-20 text-center text-slate-400"
    >
      No products found.
    </div>

    <div
      v-else
      class="grid gap-4"
      :class="
        viewMode === 'grid'
          ? 'grid-cols-2 md:grid-cols-3 xl:grid-cols-4'
          : 'grid-cols-1'
      "
    >
      <button
        v-if="viewMode === 'grid'"
        @click="openAdd"
        class="group flex flex-col items-center justify-center min-h-48 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl hover:border-slate-400 hover:bg-slate-100 transition-all"
      >
        <div
          class="size-10 bg-white rounded-full shadow-sm flex items-center justify-center mb-2 group-hover:scale-110 transition-transform"
        >
          <Plus class="size-5 text-slate-900" />
        </div>
        <span class="text-sm font-bold text-slate-900">Add Product</span>
      </button>

      <div
        v-for="item in filteredProducts"
        :key="item.id"
        @click="openEdit(item)"
        class="group relative bg-white border border-slate-200 rounded-xl p-3 hover:shadow-lg hover:border-slate-300 transition-all cursor-pointer overflow-hidden"
        :class="viewMode === 'list' ? 'flex gap-4' : ''"
      >
        <div
          class="bg-slate-100 rounded-lg shrink-0 overflow-hidden relative"
          :class="viewMode === 'list' ? 'size-20' : 'aspect-square mb-3'"
        >
          <img
            v-if="item.image_url"
            :src="item.image_url"
            class="size-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
          <div
            v-else
            class="size-full flex items-center justify-center text-slate-300"
          >
            <ImageIcon class="size-8" />
          </div>
          <div
            v-if="item.is_archived"
            class="absolute inset-0 bg-slate-100/80 backdrop-blur-[1px] flex items-center justify-center"
          >
            <Archive class="size-5 text-slate-500" />
          </div>
        </div>

        <div
          class="flex-1 flex flex-col justify-between"
          :class="viewMode === 'list' ? 'py-1' : ''"
        >
          <div>
            <div class="flex justify-between items-start">
              <h3 class="text-sm font-bold text-slate-900 line-clamp-1 pr-4">
                {{ item.name }}
              </h3>
              <span class="text-sm font-bold text-slate-900 shrink-0">{{
                item.price.toLocaleString()
              }}</span>
            </div>
            <p class="text-xs text-slate-500 mt-1">{{ item.category }}</p>
          </div>
          <div
            class="flex items-center justify-between mt-3 pt-3 border-t border-slate-50"
          >
            <span
              class="text-[0.65rem] uppercase font-bold text-slate-400 tracking-wider"
              >{{ item.is_archived ? "Archived" : "Active" }}</span
            >
            <div
              class="flex gap-2"
              :class="
                viewMode === 'grid'
                  ? 'opacity-100'
                  : ''
              "
            >
              <button
                @click.stop="toggleArchive(item)"
                class="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-900"
              >
                <component
                  :is="item.is_archived ? RotateCcw : Archive"
                  class="size-4"
                />
              </button>
              <button
                @click.stop="deleteProduct(item.id)"
                class="p-1.5 hover:bg-red-50 rounded text-slate-400 hover:text-red-600"
              >
                <Trash2 class="size-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>

    <button
      v-if="userStore.isAdminOrSuper"
      @click="openAdd"
      class="md:hidden fixed bottom-24 right-6 size-14 bg-slate-900 text-white rounded-full shadow-xl flex items-center justify-center z-40"
    >
      <component :is="checkLimit('add_item') ? Plus : Lock" class="size-6" />
    </button>
    <AdminProductModal
      v-if="userStore.isAdminOrSuper"
      :isOpen="showModal"
      :product="selectedItem"
      :allCategories="modalCategories"
      @close="showModal = false"
      @saved="onSaved"
    />
  </div>
</template>
