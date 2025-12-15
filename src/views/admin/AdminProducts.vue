<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../services/supabase'
import AdminProductModal from '../../components/AdminProductModal.vue'
import { Plus, Search, Edit2, Image as ImageIcon } from 'lucide-vue-next'

const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const selectedItem = ref(null)
const searchQuery = ref('')
const selectedCategory = ref('All')

const categories = computed(() => ['All', ...new Set(products.value.map(p => p.category))])

const filteredProducts = computed(() => {
  return products.value.filter(p => {
    const matchSearch = p.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    const matchCat = selectedCategory.value === 'All' || p.category === selectedCategory.value
    return matchSearch && matchCat
  })
})

const fetchProducts = async () => {
  loading.value = true
  const { data } = await supabase.from('drinks').select('*').order('name')
  products.value = data || []
  loading.value = false
}

const openAdd = () => { selectedItem.value = null; showModal.value = true }
const openEdit = (item) => { selectedItem.value = item; showModal.value = true }

onMounted(fetchProducts)
</script>

<template>
  <div class="space-y-6 pb-20 lg:pb-0">
    
    <div class="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Inventory</h2>
        <p class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">{{ products.length }} Items Total</p>
      </div>
      
      <button 
        @click="openAdd"
        class="hidden md:flex bg-black text-white px-6 py-3 rounded-full text-xs font-bold uppercase tracking-widest hover:bg-slate-800 transition-all items-center gap-2"
      >
        <Plus class="w-4 h-4" /> Add New Drink
      </button>
    </div>

    <div class="flex flex-col sm:flex-row gap-4">
      <div class="relative flex-1">
        <Search class="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search items..." 
          class="w-full pl-10 pr-4 py-3 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:border-black transition-colors"
        />
      </div>
      <div class="flex gap-2 overflow-x-auto pb-2 sm:pb-0 scrollbar-hide">
        <button 
          v-for="cat in categories" 
          :key="cat"
          @click="selectedCategory = cat"
          class="px-4 py-3 rounded-2xl text-xs font-bold uppercase tracking-wider whitespace-nowrap transition-colors border"
          :class="selectedCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'"
        >
          {{ cat }}
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-20 flex justify-center">
      <div class="w-8 h-8 border-4 border-slate-200 border-t-black rounded-full animate-spin"></div>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      <div 
        v-for="item in filteredProducts" 
        :key="item.id" 
        @click="openEdit(item)"
        class="group bg-white p-3 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md hover:border-slate-200 transition-all cursor-pointer flex items-center gap-4"
      >
        <div class="w-20 h-20 rounded-2xl bg-slate-50 overflow-hidden flex-shrink-0 relative">
          <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-300">
            <ImageIcon class="w-6 h-6" />
          </div>
        </div>

        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <h3 class="font-bold text-slate-900 truncate pr-2">{{ item.name }}</h3>
            <span class="font-khmer text-sm text-slate-900 font-medium">{{ item.price.toLocaleString() }}៛</span>
          </div>
          <p class="text-[10px] text-slate-400 uppercase tracking-wider font-bold mt-1">{{ item.category }}</p>
          
          <div class="mt-3 flex items-center gap-2">
            <span class="inline-flex items-center px-2 py-1 rounded-lg bg-slate-50 text-[10px] font-bold uppercase tracking-wide text-slate-500 group-hover:bg-black group-hover:text-white transition-colors">
              Edit Item
            </span>
          </div>
        </div>
      </div>
    </div>

    <button 
      @click="openAdd"
      class="md:hidden fixed bottom-6 right-6 w-14 h-14 bg-black text-white rounded-full shadow-2xl shadow-black/40 flex items-center justify-center z-30"
    >
      <Plus class="w-6 h-6" />
    </button>

    <AdminProductModal 
      :isOpen="showModal" 
      :product="selectedItem"
      @close="showModal = false"
      @saved="fetchProducts"
    />
  </div>
</template>