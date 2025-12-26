<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { useUserStore } from '../../stores/userStore'
import { useToastStore } from '../../stores/toastStore'
import { usePlanLimits } from '../../composables/usePlanLimits' // <--- IMPORT
import { Store, MapPin, Phone, Wifi, Plus, Edit2, Trash2, X, Loader2, AlertTriangle, Lock } from 'lucide-vue-next'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const toast = useToastStore()
const userStore = useUserStore()
const { fetchUsage, checkLimit, limits } = usePlanLimits() // <--- USE

const stores = ref([])
const loading = ref(true)
const showModal = ref(false) 
const showDeleteModal = ref(false) 
const saving = ref(false)
const isDeleting = ref(false)
const form = ref({ id: null, name: '', location: '', phone: '', wifi_pass: '', active: true })
const storeToDelete = ref(null)

const fetchStores = async () => {
  if (!userStore.organizationId) return
  loading.value = true
  await fetchUsage() // <--- Check Usage
  const { data, error } = await supabase.from('stores').select('*').eq('organization_id', userStore.organizationId).order('id')
  if (error) toast.addToast("Failed to load stores", "error")
  else stores.value = data || []
  loading.value = false
}

const handleAddClick = () => {
  if (!checkLimit('add_branch')) {
     alert(`The ${limits.value.name} plan is limited to ${limits.value.max_branches} branch. Please upgrade to Business.`);
     return;
  }
  form.value = { id: null, name: '', location: '', phone: '', wifi_pass: '', active: true }
  showModal.value = true
}

const openEdit = (store) => { form.value = { ...store }; showModal.value = true; }
const confirmDelete = (store) => { storeToDelete.value = store; showDeleteModal.value = true; }

const handleConfirmDelete = async () => {
  if (!storeToDelete.value) return
  isDeleting.value = true
  const { error } = await supabase.from('stores').delete().eq('id', storeToDelete.value.id)
  isDeleting.value = false
  showDeleteModal.value = false 
  
  if (error) {
    if (error.code === '23503' || error.message.includes('foreign key')) {
      toast.addToast("Cannot delete: Staff are assigned to this branch.", "error")
    } else {
      toast.addToast(error.message, "error")
    }
  } else {
    toast.addToast("Branch deleted", "success")
    fetchStores()
  }
}

const handleSave = async () => {
  if (!form.value.name) return toast.addToast("Branch name is required", "error");
  saving.value = true;
  const { id, ...payloadData } = form.value;
  const payload = { ...payloadData, organization_id: userStore.organizationId };

  const query = id ? supabase.from('stores').update(payload).eq('id', id) : supabase.from('stores').insert([payload]);
  const { error } = await query;
  saving.value = false;
  
  if (error) toast.addToast(error.message, "error");
  else {
    toast.addToast(id ? "Store updated" : "Store created", "success");
    showModal.value = false;
    fetchStores();
  }
};

onMounted(() => fetchStores())
</script>

<template>
  <div class="space-y-6 pb-20 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Store Locations</h2>
        <p class="text-xs text-slate-500 mt-1">Manage your physical branches.</p>
      </div>
      
      <button 
        @click="handleAddClick" 
        :class="checkLimit('add_branch') ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20' : 'bg-slate-100 text-slate-400 cursor-not-allowed'"
        class="px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wide flex items-center gap-2 shadow-lg transition-all active:scale-95"
      >
        <component :is="checkLimit('add_branch') ? Plus : Lock" class="w-4 h-4" /> 
        <span>{{ checkLimit('add_branch') ? 'Add Branch' : 'Limit Reached' }}</span>
      </button>
    </div>

    <div v-if="loading" class="py-20 flex justify-center"><Loader2 class="w-8 h-8 animate-spin text-slate-300" /></div>
    
    <div v-else-if="stores.length === 0" class="bg-white border border-slate-200 rounded-2xl p-12 text-center">
        <div class="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-3"><Store class="w-6 h-6 text-slate-300" /></div>
        <p class="text-sm text-slate-500">No stores found.</p>
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div v-for="store in stores" :key="store.id" class="group bg-white rounded-2xl p-5 border border-slate-200 shadow-sm hover:shadow-lg transition-all">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2.5 bg-slate-50 rounded-xl group-hover:bg-slate-900 group-hover:text-white transition-colors"><Store class="w-6 h-6 text-slate-400 group-hover:text-white" /></div>
          <div class="flex gap-1 group-hover:opacity-100 transition-opacity">
            <button @click="openEdit(store)" class="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"><Edit2 class="w-4 h-4" /></button>
            <button @click="confirmDelete(store)" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 class="w-4 h-4" /></button>
          </div>
        </div>
        <h3 class="text-lg font-bold text-slate-900 mb-1 leading-tight">{{ store.name }}</h3>
        <p class="text-xs text-slate-500 mb-4 flex items-center gap-1.5 min-h-[1.5em]"><MapPin v-if="store.location" class="w-3 h-3 shrink-0" /> {{ store.location || 'No address' }}</p>
        <div class="space-y-2 pt-4 border-t border-slate-100">
          <div class="flex items-center gap-3 text-xs text-slate-600"><Phone class="w-3.5 h-3.5 text-slate-400 shrink-0" /> {{ store.phone || 'No Phone' }}</div>
          <div class="flex items-center gap-3 text-xs text-slate-600"><Wifi class="w-3.5 h-3.5 text-slate-400 shrink-0" /> {{ store.wifi_pass || 'No Wifi' }}</div>
        </div>
      </div>
    </div>

    <TransitionRoot appear :show="showModal" as="template">
      <Dialog as="div" @close="showModal = false" class="relative z-50">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                <div class="flex justify-between items-center mb-6">
                  <DialogTitle class="text-lg font-bold text-slate-900">{{ form.id ? 'Edit Branch' : 'New Branch' }}</DialogTitle>
                  <button @click="showModal = false" class="text-slate-400 hover:text-slate-900"><X class="w-5 h-5" /></button>
                </div>
                <div class="space-y-4">
                  <div><label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Name</label><input v-model="form.name" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div>
                  <div><label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Address</label><input v-model="form.location" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div>
                  <div class="grid grid-cols-2 gap-4">
                    <div><label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Phone</label><input v-model="form.phone" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div>
                    <div><label class="block text-[10px] font-bold uppercase text-slate-500 mb-1">Wifi</label><input v-model="form.wifi_pass" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm" /></div>
                  </div>
                  <button @click="handleSave" :disabled="saving" class="w-full mt-2 bg-slate-900 text-white py-3.5 rounded-xl text-sm font-bold uppercase hover:bg-slate-800 disabled:opacity-70 flex justify-center gap-2">
                    <Loader2 v-if="saving" class="w-4 h-4 animate-spin" /><span>{{ form.id ? 'Save Changes' : 'Create Branch' }}</span>
                  </button>
                </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="showDeleteModal" as="template">
      <Dialog as="div" @close="showDeleteModal = false" class="relative z-50">
        <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all text-center">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle class="w-6 h-6 text-red-600" /></div>
                <DialogTitle class="text-lg font-bold text-slate-900 mb-2">Delete Branch?</DialogTitle>
                <p class="text-sm text-slate-500 mb-6">Are you sure you want to remove <span class="font-bold text-slate-900">{{ storeToDelete?.name }}</span>?</p>
                <div class="grid grid-cols-2 gap-3">
                  <button @click="showDeleteModal = false" class="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold">Cancel</button>
                  <button @click="handleConfirmDelete" :disabled="isDeleting" class="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2">
                    <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" /><span>{{ isDeleting ? 'Deleting...' : 'Yes, Delete' }}</span>
                  </button>
                </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>