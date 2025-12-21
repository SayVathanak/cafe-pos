<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../services/supabase'
import AdminProductModal from '../../components/AdminProductModal.vue'
import { useToastStore } from '../../stores/toastStore'
import { 
  Plus, Search, Image as ImageIcon, LayoutGrid, List, 
  Edit2, Trash2, PackageOpen, Star, Filter, MoreHorizontal 
} from 'lucide-vue-next'

const toast = useToastStore()
const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const selectedItem = ref(null)
const searchQuery = ref('')
const selectedCategory = ref('All')
const viewMode = ref('list') // Defaults to list

const categories = computed(() => ['All', ...new Set(products.value.map(p => p.category))].sort())
const modalCategories = computed(() => [...new Set(products.value.map(p => p.category))].sort())

const filteredProducts = computed(() => products.value.filter(p => {
  const matchesSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
                        p.category.toLowerCase().includes(searchQuery.value.toLowerCase())
  const matchesCat = selectedCategory.value === 'All' || p.category === selectedCategory.value
  return matchesSearch && matchesCat
}))

const fetchProducts = async () => {
  loading.value = true
  const { data, error } = await supabase.from('drinks').select('*').order('created_at', { ascending: false })
  if (error) toast.addToast("Failed to load products", "error")
  else products.value = data || []
  loading.value = false
}

const deleteProduct = async (id) => {
  if (!confirm("Are you sure you want to delete this item?")) return
  const { error } = await supabase.from('drinks').delete().eq('id', id)
  if (error) toast.addToast("Could not delete item", "error")
  else { toast.addToast("Item deleted"); fetchProducts() }
}

const onSaved = () => { fetchProducts(); toast.addToast("Product saved") }
const openAdd = () => { selectedItem.value = null; showModal.value = true }
const openEdit = (item) => { selectedItem.value = item; showModal.value = true }

onMounted(fetchProducts)
</script>

<template>
  <div class="flex flex-col h-full space-y-4 pb-24 lg:pb-0">
    
    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row gap-4 justify-between md:items-center sticky top-0 md:static z-20">
      <div class="flex flex-col sm:flex-row sm:items-center gap-4 w-full md:w-auto">
        <h2 class="text-lg font-medium text-slate-900 tracking-tight hidden sm:block">Inventory</h2>
        <div class="relative w-full sm:w-64 group">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-slate-900 transition-colors" />
          <input 
            v-model="searchQuery" 
            type="text" 
            placeholder="Search products..." 
            class="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm outline-none focus:border-slate-900 focus:ring-1 focus:ring-slate-900 transition-all placeholder:text-slate-400" 
          />
        </div>
      </div>

      <div class="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
        <div class="flex bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button @click="viewMode = 'grid'" :class="viewMode === 'grid' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'" class="p-2 rounded-md transition-all"><LayoutGrid class="w-4 h-4" /></button>
          <button @click="viewMode = 'list'" :class="viewMode === 'list' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'" class="p-2 rounded-md transition-all"><List class="w-4 h-4" /></button>
        </div>
        <button @click="openAdd" class="bg-slate-900 text-white px-5 py-2.5 rounded-lg text-xs font-medium uppercase hover:bg-slate-800 flex items-center gap-2 transition-transform active:scale-95 shadow-lg shadow-slate-900/20">
          <Plus class="w-4 h-4" /> 
          <span class="hidden xs:inline">Add Product</span>
        </button>
      </div>
    </div>

    <div class="flex items-center gap-3">
      <Filter class="w-4 h-4 text-slate-400 shrink-0" />
      <div class="flex-1 flex gap-2 overflow-x-auto pb-2 scrollbar-hide mask-[linear-gradient(to_right,black_90%,transparent_100%)]">
        <button 
          v-for="cat in categories" :key="cat" @click="selectedCategory = cat" 
          class="px-4 py-1.5 rounded-full text-[11px] font-medium uppercase border transition-all whitespace-nowrap active:scale-95" 
          :class="selectedCategory === cat ? 'bg-slate-900 text-white border-slate-900 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="flex-1 flex justify-center items-center min-h-75">
      <div class="w-8 h-8 border-4 border-slate-200 border-t-slate-900 rounded-full animate-spin"></div>
    </div>
    
    <div v-else-if="filteredProducts.length === 0" class="flex-1 flex flex-col items-center justify-center text-slate-400 bg-white rounded-xl border border-dashed border-slate-200 py-16">
      <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4"><PackageOpen class="w-8 h-8 text-slate-300" /></div>
      <p class="font-medium text-sm text-slate-600">No products found</p>
    </div>
    
    <div v-else class="flex-1">
      
      <div v-if="viewMode === 'grid'" class="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
        <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" class="group bg-white p-3 rounded-2xl border border-slate-200 shadow-sm hover:border-slate-300 hover:shadow-md cursor-pointer flex flex-col gap-3 transition-all relative overflow-hidden">
          <div v-if="item.is_popular" class="absolute top-4 right-4 z-10 text-amber-500 bg-white/95 backdrop-blur rounded-full p-1.5 shadow-sm border border-amber-100">
            <Star class="w-3 h-3 fill-amber-500" />
          </div>
          
          <div class="aspect-square rounded-xl bg-slate-50 overflow-hidden relative border border-slate-100">
            <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
            <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon class="w-8 h-8" /></div>
          </div>
          
          <div class="min-w-0">
            <div class="flex justify-between items-start mb-1.5">
              <h3 class="font-medium text-sm text-slate-900 truncate pr-2 leading-tight">{{ item.name }}</h3>
              <span class=" text-xs font-medium text-slate-600">{{ item.price.toLocaleString() }}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md uppercase font-medium tracking-wide">{{ item.category }}</span>
              <span v-if="!item.available" class="w-2 h-2 bg-red-400 rounded-full ring-2 ring-red-100"></span>
            </div>
          </div>
        </div>
      </div>

      <div v-else class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left border-collapse min-w-175">
            <thead class="bg-slate-50/50 border-b border-slate-200 text-[10px] uppercase text-slate-500 font-medium tracking-wider">
              <tr>
                <th class="p-4 w-20">Image</th>
                <th class="p-4">Product Details</th>
                <th class="p-4">Category</th>
                <th class="p-4 text-right">Price (៛)</th>
                <th class="p-4 text-center">Status</th>
                <th class="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100 text-xs">
              <tr v-for="item in filteredProducts" :key="item.id" class="hover:bg-slate-50/80 transition-colors group">
                <td class="p-3">
                  <div class="w-12 h-12 rounded-lg bg-slate-100 overflow-hidden border border-slate-100"><img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/></div>
                </td>
                <td class="p-3">
                  <div class="font-medium text-slate-900 text-sm mb-0.5">{{ item.name }}</div>
                  <div v-if="item.is_popular" class="flex items-center gap-1 text-[10px] text-amber-600 font-medium"><Star class="w-3 h-3 fill-amber-500" /> Popular Item</div>
                </td>
                <td class="p-3"><span class="bg-slate-100 text-slate-500 px-2.5 py-1 rounded-md text-[10px] font-medium uppercase">{{ item.category }}</span></td>
                <td class="p-3 text-right text-sm font-medium">{{ item.price.toLocaleString() }}</td>
                <td class="p-3 text-center">
                  <span class="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-medium uppercase tracking-wide border" 
                    :class="item.available ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-red-50 text-red-600 border-red-100'">
                    {{ item.available ? 'Active' : 'Inactive' }}
                  </span>
                </td>
                <td class="p-3 text-center">
                  <div class="flex justify-center gap-2 opacity-100 transition-opacity">
                    <button @click="openEdit(item)" class="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"><Edit2 class="w-4 h-4" /></button>
                    <button @click="deleteProduct(item.id)" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <AdminProductModal :isOpen="showModal" :product="selectedItem" :allCategories="modalCategories" @close="showModal = false" @saved="onSaved" />
  </div>
</template>