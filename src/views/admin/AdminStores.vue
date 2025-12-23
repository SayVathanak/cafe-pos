<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { useToastStore } from '../../stores/toastStore'
import { 
  Store, MapPin, Phone, Wifi, Plus, Edit2, 
  Trash2, X, Loader2, Link, Copy, Lock 
} from 'lucide-vue-next'

const toast = useToastStore()
const stores = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)

// Link Sharing State
const showLinkModal = ref(false)
const activationLink = ref('')
const selectedStoreName = ref('')

// Form Data
const form = ref({
  id: null,
  name: '',
  location: '',
  phone: '',
  wifi_pass: '',
  active: true
})

// --- FETCH DATA ---
const fetchStores = async () => {
  loading.value = true
  const { data, error } = await supabase
    .from('stores')
    .select('*')
    .order('id')
  
  if (error) toast.addToast("Failed to load stores", "error")
  else stores.value = data || []
  loading.value = false
}

// --- ACTIONS ---
const openAdd = () => {
  form.value = { id: null, name: '', location: '', phone: '', wifi_pass: '', active: true }
  showModal.value = true
}

const openEdit = (store) => {
  form.value = { ...store }
  showModal.value = true
}

const handleDelete = async (id) => {
  if (!confirm("Are you sure? This will delete the store data.")) return
  
  const { error } = await supabase.from('stores').delete().eq('id', id)
  if (error) {
    toast.addToast("Cannot delete: " + error.message, "error")
  } else {
    toast.addToast("Store deleted", "success")
    fetchStores()
  }
}

const handleSave = async () => {
  if (!form.value.name) return toast.addToast("Store name is required", "error")

  saving.value = true
  const payload = { ...form.value }
  let response

  if (form.value.id) {
    // UPDATE
    response = await supabase
      .from('stores')
      .update(payload)
      .eq('id', form.value.id)
  } else {
    // CREATE
    delete payload.id // Safe delete to let DB auto-increment
    response = await supabase
      .from('stores')
      .insert(payload)
      .select() // Select back data to get the new ID
  }

  const { data, error } = response
  saving.value = false
  
  if (error) {
    toast.addToast(error.message, "error")
  } else {
    toast.addToast(form.value.id ? "Store updated" : "New store created", "success")
    showModal.value = false
    fetchStores()
    
    // If it was a new store, immediately open the Link Modal
    if (!form.value.id && data && data[0]) {
      openActivationModal(data[0])
    }
  }
}

// --- ACTIVATION LINK LOGIC ---
const openActivationModal = (store) => {
  selectedStoreName.value = store.name
  const baseUrl = window.location.origin // Gets your current website URL
  activationLink.value = `${baseUrl}/setup-branch?store_id=${store.id}`
  showLinkModal.value = true
}

const copyLink = () => {
  navigator.clipboard.writeText(activationLink.value)
  toast.addToast("Link copied! Open Incognito mode now.", "success")
}

onMounted(fetchStores)
</script>

<template>
  <div class="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Store Locations</h2>
        <p class="text-xs text-slate-500 mt-1">Manage your physical branches and logins.</p>
      </div>
      
      <button @click="openAdd" class="bg-slate-900 text-white hover:bg-slate-800 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-all shadow-lg shadow-slate-900/20">
        <Plus class="w-4 h-4" />
        <span>Add Branch</span>
      </button>
    </div>

    <div v-if="loading" class="py-12 flex justify-center"><Loader2 class="w-8 h-8 animate-spin text-slate-300" /></div>
    
    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="store in stores" :key="store.id" class="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all relative">
        
        <div class="flex justify-between items-start mb-4">
          <div class="p-2.5 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <Store class="w-6 h-6 text-slate-400 group-hover:text-white" />
          </div>
          <div class="flex gap-1">
            <button @click="openActivationModal(store)" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors" title="Create Login">
              <Link class="w-4 h-4" />
            </button>
            <button @click="openEdit(store)" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"><Edit2 class="w-4 h-4" /></button>
            <button @click="handleDelete(store.id)" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>

        <h3 class="text-lg font-bold text-slate-900 mb-1">{{ store.name }}</h3>
        <p class="text-xs text-slate-500 mb-4 flex items-center gap-1.5">
          <MapPin class="w-3 h-3" /> {{ store.location || 'No address set' }}
        </p>

        <div class="space-y-2 pt-4 border-t border-slate-100">
          <div class="flex items-center gap-3 text-xs text-slate-600">
            <Phone class="w-3.5 h-3.5 text-slate-400" />
            <span>{{ store.phone || '---' }}</span>
          </div>
          <div class="flex items-center gap-3 text-xs text-slate-600">
            <Wifi class="w-3.5 h-3.5 text-slate-400" />
            <span class="font-mono bg-slate-100 px-1.5 py-0.5 rounded">{{ store.wifi_pass || '---' }}</span>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showModal = false"></div>
      <div class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200">
        
        <div class="flex justify-between items-center mb-6">
          <h3 class="text-lg font-bold text-slate-900">{{ form.id ? 'Edit Branch' : 'New Branch' }}</h3>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-900"><X class="w-5 h-5" /></button>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Branch Name</label>
            <input v-model="form.name" type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors" placeholder="e.g. Aeon Mall Branch" />
          </div>
          
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Location / Address</label>
            <input v-model="form.location" type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors" placeholder="Street 123, Phnom Penh" />
          </div>

          <div class="grid grid-cols-2 gap-4">
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Phone</label>
              <input v-model="form.phone" type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors" placeholder="012 345 678" />
            </div>
            <div>
              <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Wifi Password</label>
              <input v-model="form.wifi_pass" type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-slate-900 transition-colors" placeholder="Secret123" />
            </div>
          </div>

          <div class="pt-4">
            <button @click="handleSave" :disabled="saving" class="w-full bg-slate-900 text-white py-3 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2">
              <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
              <span>{{ form.id ? 'Save Changes' : 'Create Branch' }}</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="showLinkModal" class="fixed inset-0 z-60 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" @click="showLinkModal = false"></div>
      <div class="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="bg-slate-900 p-6 text-white">
          <div class="flex items-start gap-4">
            <div class="p-3 bg-white/10 rounded-xl"><Lock class="w-6 h-6 text-white" /></div>
            <div>
              <h3 class="text-lg font-bold">Create Login for {{ selectedStoreName }}</h3>
              <p class="text-slate-300 text-xs mt-1 leading-relaxed">
                To create the login securely yourself:
                <br>
                1. Click <strong>COPY</strong> below.
                <br>
                2. Open a <strong>New Incognito Window</strong> (Private Window).
                <br>
                3. Paste the link and create the email/password there.
              </p>
            </div>
          </div>
        </div>
        
        <div class="p-6">
          <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5">Setup Link</label>
          <div class="flex gap-2">
            <input readonly :value="activationLink" class="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs text-slate-600 font-mono focus:outline-none" />
            <button @click="copyLink" class="bg-indigo-600 text-white px-5 rounded-xl text-xs font-bold uppercase hover:bg-indigo-700 flex items-center gap-2 shadow-lg shadow-indigo-200">
              <Copy class="w-4 h-4" /> Copy
            </button>
          </div>
          
          <button @click="showLinkModal = false" class="w-full mt-4 py-2.5 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50">Close</button>
        </div>
      </div>
    </div>

  </div>
</template>