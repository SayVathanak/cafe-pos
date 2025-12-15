<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { Save, Loader2 } from 'lucide-vue-next'

const saving = ref(false)
const form = ref({ shop_name: '', address: '', phone: '', wifi_pass: '', printer_footer: '' })

const fetchSettings = async () => { const { data } = await supabase.from('settings').select('*').single(); if (data) form.value = data }
const saveSettings = async () => {
  saving.value = true; await supabase.from('settings').update(form.value).eq('id', form.value.id);
  saving.value = false; alert('Saved')
}
onMounted(fetchSettings)
</script>

<template>
  <div class="max-w-3xl mx-auto space-y-6">
    <div class="flex items-center justify-between border-b border-slate-200 pb-4">
      <div>
        <h2 class="text-lg font-medium text-slate-900">Configuration</h2>
        <p class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">System Settings</p>
      </div>
      <button @click="saveSettings" :disabled="saving" class="bg-black text-white px-5 py-2 rounded-lg text-[10px] font-medium uppercase tracking-wider hover:opacity-90 flex items-center gap-2 shadow-sm">
        <Loader2 v-if="saving" class="w-3 h-3 animate-spin" /> <Save v-else class="w-3 h-3" /> Save
      </button>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
      <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-l-2 border-black pl-2">Store Details</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Shop Name</label>
            <input v-model="form.shop_name" type="text" class="w-full py-1.5 bg-transparent border-b border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Contact Phone</label>
            <input v-model="form.phone" type="text" class="w-full py-1.5 bg-transparent border-b border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-black transition-colors " />
          </div>
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Address</label>
            <input v-model="form.address" type="text" class="w-full py-1.5 bg-transparent border-b border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
        </div>
      </section>

      <section class="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <h3 class="text-[10px] font-bold uppercase tracking-widest text-slate-900 border-l-2 border-black pl-2">Receipt / System</h3>
        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Wifi Password</label>
            <input v-model="form.wifi_pass" type="text" class="w-full py-1.5 bg-transparent border-b border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-black transition-colors " />
          </div>
          <div>
            <label class="block text-[10px] font-medium uppercase tracking-wider text-slate-400 mb-1">Footer Message</label>
            <input v-model="form.printer_footer" type="text" class="w-full py-1.5 bg-transparent border-b border-slate-200 text-xs font-medium text-slate-900 focus:outline-none focus:border-black transition-colors" />
          </div>
        </div>
      </section>
    </div>
  </div>
</template>