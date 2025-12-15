<script setup>
import { ref, watch, onUnmounted } from 'vue'
import { supabase } from '../services/supabase'
import { X, Upload, Loader2, Trash2 } from 'lucide-vue-next'

const props = defineProps({ isOpen: Boolean, product: Object })
const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const form = ref({ id: null, name: '', category: 'Coffee', price: 0, image_url: null })
const categories = ['Coffee', 'Tea', 'Frappe', 'Soda', 'Bakery', 'Signature']

/* --- SYNC DATA --- */
watch(() => props.isOpen, (val) => {
  if (val) {
    document.body.style.overflow = 'hidden'
    if (props.product) form.value = { ...props.product }
    else form.value = { id: null, name: '', category: 'Coffee', price: 0, image_url: null }
  } else {
    document.body.style.overflow = ''
  }
})

/* --- ACTIONS --- */
const handleUpload = async (e) => {
  const file = e.target.files[0]
  if (!file) return
  try {
    loading.value = true
    const fileName = `${Date.now()}-${file.name}`
    const { error } = await supabase.storage.from('menu').upload(fileName, file)
    if (error) throw error
    const { data } = supabase.storage.from('menu').getPublicUrl(fileName)
    form.value.image_url = data.publicUrl
  } catch (err) { alert(err.message) } 
  finally { loading.value = false }
}

const handleSave = async () => {
  if (!form.value.name || !form.value.price) return
  loading.value = true
  const payload = { ...form.value, available: true }
  
  const query = form.value.id 
    ? supabase.from('drinks').update(payload).eq('id', form.value.id)
    : supabase.from('drinks').insert(payload)

  const { error } = await query
  loading.value = false
  
  if (!error) {
    emit('saved')
    emit('close')
  } else {
    alert(error.message)
  }
}

const handleDelete = async () => {
  if(!confirm('Are you sure you want to delete this item?')) return;
  loading.value = true;
  await supabase.from('drinks').delete().eq('id', form.value.id);
  loading.value = false;
  emit('saved');
  emit('close');
}
</script>

<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center sm:p-4">
      
      <div class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" @click="$emit('close')"></div>

      <div class="relative w-full sm:max-w-lg bg-white rounded-t-[32px] sm:rounded-[32px] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        <div class="px-8 py-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
          <div>
            <span class="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {{ form.id ? 'Edit Item' : 'New Item' }}
            </span>
            <h3 class="text-xl font-bold text-slate-900 mt-1">
              {{ form.name || 'Untitled Drink' }}
            </h3>
          </div>
          <button @click="$emit('close')" class="p-2 -mr-2 text-slate-400 hover:text-black transition-colors">
            <X class="w-6 h-6" />
          </button>
        </div>

        <div class="p-8 overflow-y-auto space-y-8">
          
          <div class="flex justify-center">
            <div class="relative group cursor-pointer w-32 h-32 rounded-3xl overflow-hidden bg-slate-50 border-2 border-dashed border-slate-200 hover:border-black transition-colors">
              <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" />
              <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-400">
                <Upload class="w-6 h-6 mb-2" />
                <span class="text-[10px] font-bold uppercase">Upload</span>
              </div>
              <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" @change="handleUpload" />
              <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center">
                <Loader2 class="w-6 h-6 animate-spin" />
              </div>
            </div>
          </div>

          <div class="space-y-6">
            <div class="group">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Product Name</label>
              <input v-model="form.name" type="text" class="w-full pb-2 bg-transparent border-b border-slate-200 text-lg font-bold text-slate-900 focus:outline-none focus:border-black transition-colors placeholder:text-slate-200" placeholder="e.g. Iced Latte" />
            </div>

            <div class="grid grid-cols-2 gap-8">
               <div class="group">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Price (KHR)</label>
                <input v-model="form.price" type="number" class="w-full pb-2 bg-transparent border-b border-slate-200 text-lg font-bold font-mono text-slate-900 focus:outline-none focus:border-black transition-colors" />
              </div>
              <div class="group">
                <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Category</label>
                <select v-model="form.category" class="w-full pb-2 bg-transparent border-b border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:border-black transition-colors appearance-none">
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>
          </div>

        </div>

        <div class="p-6 border-t border-slate-100 bg-slate-50 flex gap-4">
           <button 
            v-if="form.id"
            @click="handleDelete" 
            class="px-4 bg-white border border-slate-200 text-red-500 rounded-2xl flex items-center justify-center hover:bg-red-50 transition-colors"
          >
            <Trash2 class="w-5 h-5" />
          </button>
          
          <button 
            @click="handleSave"
            :disabled="loading"
            class="flex-1 bg-black text-white py-4 rounded-2xl text-sm font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span>{{ form.id ? 'Save Changes' : 'Create Product' }}</span>
          </button>
        </div>
      </div>

    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: translateY(100%); }
@media (min-width: 640px) {
  .modal-enter-from, .modal-leave-to { opacity: 0; transform: translateY(0) scale(0.95); }
}
</style>