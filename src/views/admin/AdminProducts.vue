<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../services/supabase'
import AdminProductModal from '../../components/AdminProductModal.vue'
import { Plus, Search, Image as ImageIcon } from 'lucide-vue-next'

const products = ref([]), loading = ref(true), showModal = ref(false), selectedItem = ref(null)
const searchQuery = ref(''), selectedCategory = ref('All')

const categories = computed(() => ['All', ...new Set(products.value.map(p => p.category))])
const filteredProducts = computed(() => products.value.filter(p => {
  return p.name.toLowerCase().includes(searchQuery.value.toLowerCase()) && (selectedCategory.value === 'All' || p.category === selectedCategory.value)
}))

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
  <div class="space-y-4 pb-16 lg:pb-0 h-full flex flex-col">
    <div class="flex flex-col md:flex-row gap-3 justify-between items-start md:items-center">
      <div class="flex items-center gap-4 w-full md:w-auto">
        <h2 class="text-lg font-medium text-slate-900">Inventory</h2>
        <div class="relative flex-1 md:w-64">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="Search..." class="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium outline-none focus:border-black transition-colors" />
        </div>
      </div>
      <div class="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 scrollbar-hide">
        <button v-for="cat in categories" :key="cat" @click="selectedCategory = cat" class="px-3 py-1.5 rounded-lg text-[10px] font-medium uppercase border transition-colors whitespace-nowrap" :class="selectedCategory === cat ? 'bg-black text-white border-black' : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'">{{ cat }}</button>
      </div>
      <button @click="openAdd" class="hidden md:flex bg-black text-white px-4 py-2 rounded-lg text-[10px] font-medium uppercase hover:bg-slate-800 items-center gap-2"><Plus class="w-3 h-3" /> New Item</button>
    </div>

    <div v-if="loading" class="flex-1 flex justify-center items-center"><div class="w-6 h-6 border-2 border-slate-200 border-t-black rounded-full animate-spin"></div></div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-3 overflow-y-auto pr-1">
      <div v-for="item in filteredProducts" :key="item.id" @click="openEdit(item)" class="bg-white p-2.5 rounded-xl border border-slate-200 shadow-sm hover:border-slate-300 cursor-pointer flex items-center gap-3 transition-all">
        <div class="w-12 h-12 rounded-lg bg-slate-50 overflow-hidden shrink-0 relative border border-slate-100">
          <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
          <div v-else class="w-full h-full flex items-center justify-center text-slate-300"><ImageIcon class="w-4 h-4" /></div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex justify-between items-start">
            <h3 class="font-medium text-xs text-slate-900 truncate pr-1">{{ item.name }}</h3>
            <span class="font-khmer text-xs text-slate-900 font-medium whitespace-nowrap">{{ item.price.toLocaleString() }}៛</span>
          </div>
          <p class="text-[10px] text-slate-400 uppercase font-medium mt-0.5">{{ item.category }}</p>
        </div>
      </div>
    </div>

    <button @click="openAdd" class="md:hidden fixed bottom-6 right-6 w-12 h-12 bg-black text-white rounded-full shadow-xl flex items-center justify-center z-30"><Plus class="w-5 h-5" /></button>

    <AdminProductModal :isOpen="showModal" :product="selectedItem" @close="showModal = false" @saved="fetchProducts" />
  </div>
</template>