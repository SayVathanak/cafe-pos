<script setup>
import { ref, watch } from 'vue'
import { supabase } from '../services/supabase'

const props = defineProps({
  isOpen: Boolean,
  product: Object // If null, we are adding a NEW drink. If set, we are EDITING.
})

const emit = defineEmits(['close', 'saved'])

const loading = ref(false)
const form = ref({
  id: null,
  name: '',
  category: 'Coffee',
  price: 5000,
  image_url: null
})

// Categories to choose from
const categories = ['Coffee', 'Hot', 'Frappe', 'Tea', 'Soda', 'Cream', 'Bakery']

// When the modal opens, fill the form with data (or reset it)
watch(() => props.product, (newVal) => {
  if (newVal) {
    // Edit Mode
    form.value = { ...newVal } 
  } else {
    // Add New Mode
    form.value = { id: null, name: '', category: 'Coffee', price: 5000, image_url: null }
  }
})

// --- 1. HANDLE IMAGE UPLOAD ---
const handleFileUpload = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  try {
    loading.value = true
    // Create a unique name: "173123456-latte.jpg"
    const fileName = `${Date.now()}-${file.name}`
    
    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('menu')
      .upload(fileName, file)

    if (uploadError) throw uploadError

    // Get the Public URL
    const { data } = supabase.storage
      .from('menu')
      .getPublicUrl(fileName)

    // Save URL to form
    form.value.image_url = data.publicUrl
    
  } catch (error) {
    alert('Upload failed: ' + error.message)
  } finally {
    loading.value = false
  }
}

// --- 2. SAVE TO DATABASE ---
const saveProduct = async () => {
  try {
    loading.value = true
    
    const productData = {
      name: form.value.name,
      category: form.value.category,
      price: form.value.price,
      image_url: form.value.image_url,
      available: true
    }

    let error
    if (form.value.id) {
      // UPDATE existing
      const res = await supabase.from('drinks').update(productData).eq('id', form.value.id)
      error = res.error
    } else {
      // INSERT new
      const res = await supabase.from('drinks').insert(productData)
      error = res.error
    }

    if (error) throw error
    
    emit('saved') // Tell parent to refresh list
    emit('close') // Close modal

  } catch (err) {
    alert('Error saving: ' + err.message)
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
    <div class="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
      
      <div class="px-6 py-4 bg-gray-50 border-b flex justify-between items-center">
        <h3 class="font-bold text-lg text-gray-800">
          {{ form.id ? 'Edit Drink' : 'Add New Drink' }}
        </h3>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600">✕</button>
      </div>

      <div class="p-6 space-y-4">
        
        <div class="flex flex-col items-center gap-3">
          <div class="w-24 h-24 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden relative">
            <img v-if="form.image_url" :src="form.image_url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-gray-400 text-xs">No Image</div>
          </div>
          <label class="cursor-pointer text-sm text-indigo-600 font-bold hover:underline">
            {{ loading ? 'Uploading...' : 'Upload Photo' }}
            <input type="file" class="hidden" accept="image/*" @change="handleFileUpload" />
          </label>
        </div>

        <div>
          <label class="block text-sm font-medium text-gray-700">Drink Name</label>
          <input v-model="form.name" type="text" class="w-full mt-1 p-2 border rounded-lg focus:ring-2 ring-indigo-500 outline-none" placeholder="e.g. Iced Latte" />
        </div>

        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm font-medium text-gray-700">Category</label>
            <select v-model="form.category" class="w-full mt-1 p-2 border rounded-lg bg-white">
              <option v-for="c in categories" :key="c" :value="c">{{ c }}</option>
            </select>
          </div>
          <div>
            <label class="block text-sm font-medium text-gray-700">Price (៛)</label>
            <input v-model="form.price" type="number" class="w-full mt-1 p-2 border rounded-lg" />
          </div>
        </div>

      </div>

      <div class="px-6 py-4 bg-gray-50 flex justify-end gap-3">
        <button @click="$emit('close')" class="px-4 py-2 text-gray-600 font-medium hover:bg-gray-200 rounded-lg">Cancel</button>
        <button 
          @click="saveProduct" 
          :disabled="loading"
          class="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg hover:bg-indigo-700 disabled:opacity-50"
        >
          {{ loading ? 'Saving...' : 'Save Drink' }}
        </button>
      </div>

    </div>
  </div>
</template>