<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../services/supabase'
import { X, Upload, Loader2, Trash2 } from 'lucide-vue-next'

const props = defineProps({ isOpen: Boolean, product: Object })
const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const form = ref({ id: null, name: '', category: 'Coffee', price: 0, image_url: null })
const categories = ['Coffee', 'Tea', 'Frappe', 'Soda', 'Bakery', 'Signature']

watch(() => props.isOpen, (val) => {
  if (val) form.value = props.product ? { ...props.product } : { id: null, name: '', category: 'Coffee', price: 0, image_url: null }
})

const handleUpload = async (e) => {
  const file = e.target.files[0]; if (!file) return;
  try {
    loading.value = true; const fileName = `${Date.now()}-${file.name}`
    await supabase.storage.from('menu').upload(fileName, file)
    form.value.image_url = supabase.storage.from('menu').getPublicUrl(fileName).data.publicUrl
  } catch (err) { alert(err.message) } finally { loading.value = false }
}

const handleSave = async () => {
  if (!form.value.name || !form.value.price) return; loading.value = true
  const query = form.value.id ? supabase.from('drinks').update({...form.value}).eq('id', form.value.id) : supabase.from('drinks').insert({...form.value, available: true})
  const { error } = await query; loading.value = false; if (!error) { emit('saved'); emit('close') } else alert(error.message)
}

const handleDelete = async () => {
  if(!confirm('Delete item?')) return; loading.value = true;
  await supabase.from('drinks').delete().eq('id', form.value.id); loading.value = false; emit('saved'); emit('close');
}
</script>

<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-100 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-[2px]" @click="$emit('close')"></div>
      
      <div class="relative w-full max-w-sm bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div class="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-white">
          <h3 class="text-sm font-bold text-slate-900">{{ form.id ? 'Edit Item' : 'New Item' }}</h3>
          <button @click="$emit('close')" class="text-slate-400 hover:text-black"><X class="w-5 h-5" /></button>
        </div>

        <div class="p-5 space-y-5 overflow-y-auto">
          <div class="flex gap-4">
            <div class="relative group cursor-pointer w-20 h-20 rounded-lg bg-slate-50 border border-dashed border-slate-300 hover:border-black transition-colors shrink-0">
              <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover rounded-lg" />
              <div v-else class="absolute inset-0 flex flex-col items-center justify-center text-slate-400"><Upload class="w-4 h-4" /></div>
              <input type="file" class="absolute inset-0 opacity-0 cursor-pointer" accept="image/*" @change="handleUpload" />
              <div v-if="loading" class="absolute inset-0 bg-white/80 flex items-center justify-center"><Loader2 class="w-4 h-4 animate-spin" /></div>
            </div>
            <div class="flex-1 space-y-3">
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Name</label>
                <input v-model="form.name" type="text" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors font-bold" placeholder="Item Name" />
              </div>
              <div>
                <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Category</label>
                <select v-model="form.category" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors">
                  <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
                </select>
              </div>
            </div>
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">Price (KHR)</label>
            <input v-model="form.price" type="number" class="w-full pb-1 bg-transparent border-b border-slate-200 text-sm text-slate-900 focus:outline-none focus:border-black transition-colors font-mono" />
          </div>
        </div>

        <div class="p-4 border-t border-slate-100 bg-slate-50 flex gap-3">
          <button v-if="form.id" @click="handleDelete" class="p-2.5 bg-white border border-slate-200 text-red-500 rounded-lg hover:bg-red-50"><Trash2 class="w-4 h-4" /></button>
          <button @click="handleSave" :disabled="loading" class="flex-1 bg-black text-white py-2.5 rounded-lg text-xs font-bold uppercase tracking-wide hover:opacity-90 flex items-center justify-center gap-2">
            <Loader2 v-if="loading" class="w-3 h-3 animate-spin" /> <span>Save</span>
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