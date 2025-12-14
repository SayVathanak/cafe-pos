<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { Save } from 'lucide-vue-next'

const saving = ref(false)
const form = ref({ shop_name: '', address: '', phone: '', wifi_pass: '', printer_footer: '' })

const fetchSettings = async () => {
  const { data } = await supabase.from('settings').select('*').single()
  if (data) form.value = data
}

const saveSettings = async () => {
  saving.value = true
  try {
    const { error } = await supabase.from('settings').update(form.value).eq('id', form.value.id)
    if (error) throw error
    alert('UPDATED SUCCESSFULLY')
  } catch (err) { alert(err.message) } 
  finally { saving.value = false }
}

onMounted(() => fetchSettings())
</script>

<template>
  <div class="max-w-3xl mx-auto">
    
    <div class="flex justify-between items-end mb-8 border-b border-zinc-200 pb-4">
      <h2 class="text-3xl font-bold tracking-tight text-black">CONFIGURATION</h2>
    </div>

    <div class="bg-white border border-zinc-200 p-8 space-y-8">
      
      <div>
        <h3 class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6">Store Information</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="group">
            <label class="block text-xs font-bold uppercase mb-2">Shop Name</label>
            <input v-model="form.shop_name" type="text" class="w-full border-b border-zinc-300 py-2 focus:outline-none focus:border-black transition-colors bg-transparent font-medium" />
          </div>
          <div class="group">
            <label class="block text-xs font-bold uppercase mb-2">Phone</label>
            <input v-model="form.phone" type="text" class="w-full border-b border-zinc-300 py-2 focus:outline-none focus:border-black transition-colors bg-transparent font-mono" />
          </div>
          <div class="col-span-full group">
            <label class="block text-xs font-bold uppercase mb-2">Address</label>
            <input v-model="form.address" type="text" class="w-full border-b border-zinc-300 py-2 focus:outline-none focus:border-black transition-colors bg-transparent" />
          </div>
        </div>
      </div>

      <div>
        <h3 class="text-xs font-bold uppercase tracking-widest text-zinc-400 mb-6 mt-4">Receipt Customization</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div class="group">
            <label class="block text-xs font-bold uppercase mb-2">WiFi Password</label>
            <input v-model="form.wifi_pass" type="text" class="w-full border-b border-zinc-300 py-2 focus:outline-none focus:border-black transition-colors bg-transparent font-mono" />
          </div>
          <div class="group">
            <label class="block text-xs font-bold uppercase mb-2">Footer Message</label>
            <input v-model="form.printer_footer" type="text" class="w-full border-b border-zinc-300 py-2 focus:outline-none focus:border-black transition-colors bg-transparent" />
          </div>
        </div>
      </div>

      <div class="pt-6 flex justify-end">
        <button 
          @click="saveSettings" 
          :disabled="saving"
          class="bg-black text-white px-8 py-3 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 transition-all flex items-center gap-2 disabled:opacity-50"
        >
          <Save class="w-4 h-4" />
          {{ saving ? 'SAVING...' : 'SAVE CHANGES' }}
        </button>
      </div>

    </div>
  </div>
</template>