<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { Save, Loader2 } from 'lucide-vue-next'

const saving = ref(false)
const form = ref({ shop_name: '', address: '', phone: '', wifi_pass: '', printer_footer: '' })

const fetchSettings = async () => {
  const { data } = await supabase.from('settings').select('*').single()
  if (data) form.value = data
}

const saveSettings = async () => {
  saving.value = true
  await supabase.from('settings').update(form.value).eq('id', form.value.id)
  saving.value = false
  alert('Configuration saved')
}

onMounted(fetchSettings)
</script>

<template>
  <div class="max-w-2xl mx-auto space-y-10 pb-20">
    
    <div class="border-b border-slate-200 pb-6">
      <h2 class="text-3xl font-bold text-slate-900 tracking-tight">Configuration</h2>
      <p class="text-xs text-slate-400 mt-1 uppercase tracking-widest font-medium">System & Receipt Settings</p>
    </div>

    <div class="space-y-12">
      
      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-900 mb-8 border-l-4 border-black pl-3">Store Details</h3>
        <div class="space-y-6">
          <div class="group">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Shop Name</label>
            <input v-model="form.shop_name" type="text" class="w-full py-3 bg-transparent border-b border-slate-200 text-lg font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
          
          <div class="grid grid-cols-1 md:grid-cols-2 gap-8">
             <div class="group">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Contact Phone</label>
              <input v-model="form.phone" type="text" class="w-full py-3 bg-transparent border-b border-slate-200 text-lg font-mono text-slate-900 focus:outline-none focus:border-black transition-colors" />
            </div>
            <div class="group">
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Address</label>
              <input v-model="form.address" type="text" class="w-full py-3 bg-transparent border-b border-slate-200 text-lg font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
            </div>
          </div>
        </div>
      </section>

      <section>
        <h3 class="text-xs font-black uppercase tracking-widest text-slate-900 mb-8 border-l-4 border-black pl-3">Receipt Footer</h3>
        <div class="space-y-6">
          <div class="group">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Wifi Password</label>
            <input v-model="form.wifi_pass" type="text" class="w-full py-3 bg-transparent border-b border-slate-200 text-lg font-mono text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
          <div class="group">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2">Footer Message</label>
            <input v-model="form.printer_footer" type="text" class="w-full py-3 bg-transparent border-b border-slate-200 text-lg font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
        </div>
      </section>

      <div class="flex justify-end pt-4">
        <button 
          @click="saveSettings" 
          :disabled="saving"
          class="bg-black text-white px-10 py-4 rounded-full text-xs font-bold uppercase tracking-widest hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-black/20"
        >
          <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
          <Save v-else class="w-4 h-4" />
          Save Changes
        </button>
      </div>

    </div>
  </div>
</template>