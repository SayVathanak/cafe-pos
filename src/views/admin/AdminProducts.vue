<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import AdminProductModal from '../../components/AdminProductModal.vue'
import { Plus, Edit2, ImageOff } from 'lucide-vue-next'

const products = ref([])
const loading = ref(true)
const showModal = ref(false)
const selectedItem = ref(null)

const fetchProducts = async () => {
  loading.value = true
  const { data } = await supabase.from('drinks').select('*').order('name')
  products.value = data
  loading.value = false
}

const openAdd = () => { selectedItem.value = null; showModal.value = true }
const openEdit = (item) => { selectedItem.value = item; showModal.value = true }

onMounted(() => fetchProducts())
</script>

<template>
  <div class="max-w-6xl mx-auto">
    
    <div class="flex justify-between items-end mb-8 border-b border-zinc-200 pb-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-black">INVENTORY</h2>
        <p class="text-xs font-mono text-zinc-500 mt-1">{{ products.length }} ITEMS TOTAL</p>
      </div>
      <button 
        @click="openAdd" 
        class="bg-black text-white px-5 py-2.5 text-xs font-bold uppercase tracking-wider hover:bg-zinc-800 transition-colors flex items-center gap-2"
      >
        <Plus class="w-4 h-4" /> Add Item
      </button>
    </div>

    <div class="bg-white border border-zinc-200 overflow-hidden">
      <table class="w-full text-left border-collapse">
        <thead>
          <tr class="bg-zinc-50 border-b border-zinc-200 text-xs font-bold uppercase tracking-widest text-zinc-500">
            <th class="p-4 w-20">Img</th>
            <th class="p-4">Product Name</th>
            <th class="p-4">Category</th>
            <th class="p-4 text-right">Price</th>
            <th class="p-4 text-center w-24">Edit</th>
          </tr>
        </thead>
        <tbody class="text-sm">
          <tr v-if="loading" class="border-b border-zinc-100">
            <td colspan="5" class="p-8 text-center font-mono text-zinc-400">LOADING DATA...</td>
          </tr>
          
          <tr v-for="item in products" :key="item.id" class="border-b border-zinc-100 hover:bg-zinc-50 group transition-colors">
            <td class="p-4">
              <div class="w-10 h-10 border border-zinc-200 flex items-center justify-center bg-white overflow-hidden">
                <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/>
                <ImageOff v-else class="w-4 h-4 text-zinc-300" />
              </div>
            </td>
            <td class="p-4 font-bold text-zinc-900">{{ item.name }}</td>
            <td class="p-4">
               <span class="px-2 py-1 border border-zinc-200 text-[10px] font-mono uppercase tracking-wide bg-zinc-50 text-zinc-600">
                 {{ item.category }}
               </span>
            </td>
            <td class="p-4 text-right font-mono text-zinc-900">{{ item.price.toLocaleString() }}៛</td>
            <td class="p-4 text-center">
              <button @click="openEdit(item)" class="p-2 hover:bg-black hover:text-white rounded-full transition-colors">
                <Edit2 class="w-4 h-4" />
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <AdminProductModal 
      :isOpen="showModal" 
      :product="selectedItem"
      @close="showModal = false"
      @saved="fetchProducts"
    />
  </div>
</template>