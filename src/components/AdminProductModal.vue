<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../services/supabase'
import { useUserStore } from '../stores/userStore'
import { X, Upload, Loader2, Trash2 } from 'lucide-vue-next'

const userStore = useUserStore()

const props = defineProps({ 
  isOpen: Boolean, 
  product: Object,
  allCategories: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
// ✅ Updated form with is_popular
const form = ref({ 
  id: null, 
  name: '', 
  category: '', 
  price: 0, 
  image_url: null, 
  available: true, 
  is_popular: false 
})

// Reset form when modal opens
watch(() => props.isOpen, (val) => {
  if (val) {
    form.value = props.product 
      ? { ...props.product } 
      : { id: null, name: '', category: '', price: 0, image_url: null, available: true, is_popular: false }
  }
})

const handleUpload = async (e) => {
  const file = e.target.files[0]; 
  if (!file) return;
  
  try {
    loading.value = true; 
    const fileName = `${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage.from('menu').upload(fileName, file)
    if (uploadError) throw uploadError
    const { data } = supabase.storage.from('menu').getPublicUrl(fileName)
    form.value.image_url = data.publicUrl
  } catch (err) { 
    alert("Upload failed: " + err.message) 
  } finally { 
    loading.value = false 
  }
}

const handleSave = async () => {
  if (!form.value.name || !form.value.price || !form.value.category) {
    return alert("Please fill in Name, Category, and Price.")
  }
  
  loading.value = true
  const payload = {
    ...form.value,
    store_id: userStore.storeId
  }
  let query;

  if (payload.id) {
    query = supabase.from('drinks').update(payload).eq('id', payload.id)
  } else {
    delete payload.id 
    query = supabase.from('drinks').insert({ ...payload })
  }

  const { error } = await query; 
  loading.value = false; 
  
  if (!error) { 
    emit('saved'); 
    emit('close') 
  } else {
    alert(error.message)
  }
}

const handleDelete = async () => {
  if(!confirm('Are you sure you want to delete this item?')) return; 
  loading.value = true;
  const { error } = await supabase.from('drinks').delete().eq('id', form.value.id); 
  loading.value = false; 
  if (!error) {
    emit('saved'); 
    emit('close');
  } else {
    alert(error.message)
  }
}
</script>

<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="$emit('close')"></div>
      
      <div class="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        
        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 class="text-sm font-medium text-slate-900">{{ form.id ? 'Edit Item' : 'New Item' }}</h3>
          <button @click="$emit('close')" class="text-slate-400 hover:text-black transition-colors"><X class="w-5 h-5" /></button>
        </div>

        <div class="p-5 space-y-5 overflow-y-auto">
          
          <div class="flex gap-4">
            <div class="relative group cursor-pointer w-20 h-20 rounded-lg bg-slate-50 border border-dashed border-slate-300 hover:border-black transition-colors shrink-0 overflow-hidden">
              <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" />
              <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Upload class="w-4 h-4" /></div>
              <input type="file" class="absolute inset-0 opacity-0 cursor-pointer z-10" accept="image/*" @change="handleUpload" />
              <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center z-20"><Loader2 class="w-4 h-4 animate-spin" /></div>
            </div>

            <div class="flex-1 space-y-3">
              <div>
                <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Name</label>
                <input v-model="form.name" type="text" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors font-medium" placeholder="Item Name" />
              </div>
              <div class="relative">
                <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <input v-model="form.category" list="category-suggestions" type="text" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors" placeholder="Select or Type..." />
                <datalist id="category-suggestions">
                  <option v-for="c in allCategories" :key="c" :value="c"></option>
                </datalist>
              </div>
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Price (KHR)</label>
            <input v-model="form.price" type="number" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors " placeholder="0" />
          </div>

          <div class="flex items-center gap-4 border-t border-slate-100 pt-4">
             
             <div class="flex-1">
               <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">Status</label>
               <button 
                 @click="form.available = !form.available"
                 class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
                 :class="form.available ? 'bg-green-50 text-green-700 border-green-200' : 'bg-slate-50 text-slate-400 border-slate-200'"
               >
                 <span class="w-2 h-2 rounded-full" :class="form.available ? 'bg-green-500' : 'bg-slate-400'"></span>
                 {{ form.available ? 'Active' : 'Hidden' }}
               </button>
             </div>

             <div class="flex-1">
               <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1.5">Feature</label>
               <button 
                 @click="form.is_popular = !form.is_popular"
                 class="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all border"
                 :class="form.is_popular ? 'bg-amber-50 text-amber-700 border-amber-200 shadow-sm' : 'bg-slate-50 text-slate-400 border-slate-200'"
               >
                 <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" :class="form.is_popular ? 'fill-amber-500 text-amber-500' : 'text-slate-400'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                 {{ form.is_popular ? 'Top Pick' : 'Standard' }}
               </button>
             </div>
          </div>

        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button v-if="form.id" @click="handleDelete" class="p-2.5 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50 hover:border-red-200 transition-colors"><Trash2 class="w-4 h-4" /></button>
          <button @click="handleSave" :disabled="loading" class="flex-1 bg-black text-white py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wide hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2 transition-colors">
            <Loader2 v-if="loading" class="w-3 h-3 animate-spin" /> 
            <span>{{ form.id ? 'Save Changes' : 'Create Item' }}</span>
          </button>
        </div>

      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.2s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: scale(0.95); }
</style>