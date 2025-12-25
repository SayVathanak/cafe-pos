<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase' 
import { useToastStore } from '../stores/toastStore'
import { 
  Search, Coffee, Trash2, ChevronRight, ChevronDown, 
  Loader2, FolderOpen, Folder, Home 
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToastStore()
const loading = ref(true)
const rawDrinks = ref([])
const expandedFolders = ref({}) 
const searchQuery = ref('')
const deletingId = ref(null)

// 1. FETCH ALL DRINKS WITH OWNER NAME
const fetchDrinks = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('drinks')
    .select('*, organizations(name)') 
    .order('name')

  if (error) {
    toast.addToast("Failed to load menu", "error")
  } else {
    rawDrinks.value = data
  }
  loading.value = false
}

// 2. THE "FOLDER" LOGIC
const groupedDrinks = computed(() => {
  const groups = {}
  const filtered = rawDrinks.value.filter(d => 
    d.name.toLowerCase().includes(searchQuery.value.toLowerCase()) || 
    d.organizations?.name?.toLowerCase().includes(searchQuery.value.toLowerCase())
  )

  filtered.forEach(drink => {
    const clientName = drink.organizations?.name || 'Unknown Owner'
    if (!groups[clientName]) groups[clientName] = []
    groups[clientName].push(drink)
  })

  return groups
})

const toggleFolder = (clientName) => {
  expandedFolders.value[clientName] = !expandedFolders.value[clientName]
}

// 3. DELETE FUNCTION
const handleDelete = async (drinkId) => {
  if (!confirm("Are you sure you want to delete this item?")) return
  
  deletingId.value = drinkId
  const { error } = await supabase.from('drinks').delete().eq('id', drinkId)
  
  if (error) {
    toast.addToast("Delete failed: " + error.message, "error")
  } else {
    toast.addToast("Item removed", "success")
    rawDrinks.value = rawDrinks.value.filter(d => d.id !== drinkId)
  }
  deletingId.value = null
}

onMounted(fetchDrinks)
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-50 font-sans text-slate-900">
    
    <div class="px-6 py-5 bg-white border-b border-slate-200 flex justify-between items-end sticky top-0 z-10">
      
      <div class="flex flex-col gap-1">
        
        <!-- <nav class="flex items-center gap-2 text-sm text-slate-500 mb-1">
          <a 
            href="#" 
            @click.prevent="router.back()" 
            class="hover:text-slate-900 transition-colors flex items-center gap-1 group cursor-pointer"
          >
            <Home class="w-3.5 h-3.5 group-hover:-translate-x-0.5 transition-transform" />
            <span class="hover:underline">Dashboard</span>
          </a>
          <span class="text-slate-300">/</span>
          <span class="font-medium text-slate-900">Master Menu List</span>
        </nav> -->

        <h1 class="text-2xl font-bold text-slate-900 tracking-tight">
          Master Menu List
        </h1>

        <p class="text-sm text-slate-500">
          View and manage drinks across all clients.
        </p>
      </div>
      
      <div class="relative w-64 mb-1">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search drink or client..." 
          class="w-full pl-9 pr-4 py-2 bg-slate-100 border-none rounded-lg text-sm focus:ring-2 focus:ring-black/5 outline-none placeholder:text-slate-400 transition-all"
        />
      </div>
    </div>

    <div class="px-6 pt-4">
        <nav class="flex items-center gap-2 text-xs text-slate-500 mb-1">
          <a 
            href="#" 
            @click.prevent="router.back()" 
            class="hover:text-slate-900 transition-colors flex items-center gap-1 group cursor-pointer"
          >
            <!-- <Home class="w-3 h-3 group-hover:-translate-x-0.5 transition-transform" /> -->
            <span class="hover:underline">Dashboard</span>
          </a>
          <span class="text-slate-300">/</span>
          <span class="font-medium text-slate-900">Master Menu List</span>
        </nav>
    </div>

    <div class="flex-1 overflow-y-auto p-6 custom-scrollbar">
      <div v-if="loading" class="flex justify-center py-20">
        <Loader2 class="w-8 h-8 animate-spin text-slate-300" />
      </div>

      <div v-else-if="Object.keys(groupedDrinks).length === 0" class="text-center py-20 text-slate-400">
        No items found.
      </div>

      <div v-else class="space-y-4 max-w-4xl mx-auto pb-20">
        
        <div 
          v-for="(items, clientName) in groupedDrinks" 
          :key="clientName" 
          class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm"
        >
          <div 
            @click="toggleFolder(clientName)"
            class="px-4 py-3 bg-slate-50/80 border-b border-slate-100 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors select-none"
          >
            <div class="flex items-center gap-3">
              <button class="text-slate-400">
                <ChevronDown v-if="expandedFolders[clientName]" class="w-4 h-4" />
                <ChevronRight v-else class="w-4 h-4" />
              </button>
              <div class="flex items-center gap-2">
                <FolderOpen v-if="expandedFolders[clientName]" class="w-4 h-4 text-amber-500" />
                <Folder v-else class="w-4 h-4 text-slate-400" />
                <span class="font-bold text-sm text-slate-800">{{ clientName }}</span>
                <span class="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-full text-slate-600 font-bold">
                  {{ items.length }} items
                </span>
              </div>
            </div>
          </div>

          <div v-if="expandedFolders[clientName]" class="divide-y divide-slate-50 animate-in slide-in-from-top-2 duration-200">
            <div 
              v-for="drink in items" 
              :key="drink.id" 
              class="px-4 py-3 flex items-center justify-between hover:bg-slate-50 group transition-colors"
            >
              <div class="flex items-center gap-4">
                <div class="w-10 h-10 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden shrink-0">
                  <img v-if="drink.image_url" :src="drink.image_url" class="w-full h-full object-cover" />
                  <Coffee v-else class="w-5 h-5 text-slate-300" />
                </div>
                
                <div>
                  <div class="font-bold text-sm text-slate-900">{{ drink.name }}</div>
                  <div class="flex items-center gap-2 text-xs text-slate-500">
                    <span class="capitalize">{{ drink.category }}</span>
                    <span class="w-1 h-1 bg-slate-300 rounded-full"></span>
                    <span class="font-mono text-slate-700 font-medium">${{ drink.price }}</span>
                  </div>
                </div>
              </div>

              <button 
                @click.stop="handleDelete(drink.id)"
                :disabled="deletingId === drink.id"
                class="p-2 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                title="Delete Item"
              >
                <Loader2 v-if="deletingId === drink.id" class="w-4 h-4 animate-spin text-red-600" />
                <Trash2 v-else class="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>