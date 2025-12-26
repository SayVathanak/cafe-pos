<script setup>
import { ref, onMounted, computed } from 'vue'
import { supabase } from '../../services/supabase'
import { useUserStore } from '../../stores/userStore'
import { useStaff } from '../../composables/useStaff'
import { toast } from 'vue-sonner' 
import { Users, Search, Shield, Store, Save, Loader2, UserCog, Plus, X, Trash2, AlertTriangle, MoreVertical } from 'lucide-vue-next'
import { Dialog, DialogPanel, DialogTitle, TransitionChild, TransitionRoot } from '@headlessui/vue'

const userStore = useUserStore()
const { staff, loading, fetchStaff } = useStaff()

const stores = ref([])
const searchQuery = ref('')
const showAddModal = ref(false)
const creating = ref(false)

// Delete Modal State
const showDeleteModal = ref(false)
const staffToDelete = ref(null)
const isDeleting = ref(false)

const newStaff = ref({ email: '', password: '', fullName: '', role: 'staff', store_id: '' })

const filteredStaff = computed(() => {
  if (!searchQuery.value) return staff.value
  const q = searchQuery.value.toLowerCase()
  return staff.value.filter(s => 
    (s.email?.toLowerCase() || '').includes(q) || 
    (s.full_name?.toLowerCase() || '').includes(q)
  )
})

const loadStores = async () => {
  const { data } = await supabase.from('stores').select('id, name').eq('organization_id', userStore.organizationId)
  stores.value = data || []
  if (stores.value.length > 0) newStaff.value.store_id = stores.value[0].id
}

const updateStaff = async (user) => {
  user.isSaving = true
  const { error } = await supabase.from('user_roles').upsert({
    user_id: user.id, role: user.role, store_id: user.store_id, organization_id: userStore.organizationId
  }, { onConflict: 'user_id' })

  if (!error) await supabase.from('profiles').update({ role: user.role }).eq('id', user.id)
  
  user.isSaving = false
  if (error) toast.error(error.message)
  else toast.success("Staff updated successfully")
}

const createStaffAccount = async () => {
  if (!newStaff.value.email || !newStaff.value.password || !newStaff.value.fullName) return toast.error("Please fill in all fields")
  creating.value = true
  const { error } = await supabase.rpc('create_staff_user', {
    new_email: newStaff.value.email, new_password: newStaff.value.password, new_name: newStaff.value.fullName,
    new_role: newStaff.value.role, new_store_id: newStaff.value.store_id, org_id: userStore.organizationId
  })
  creating.value = false
  if (error) toast.error(error.message)
  else {
    toast.success("Staff account created")
    showAddModal.value = false
    newStaff.value = { ...newStaff.value, email: '', password: '', fullName: '' }
    fetchStaff(userStore.organizationId)
  }
}

const confirmDelete = (user) => {
  if (user.id === userStore.user.id) return toast.error("You cannot delete your own account")
  staffToDelete.value = user
  showDeleteModal.value = true 
}

const handleConfirmDelete = async () => {
  if (!staffToDelete.value) return
  isDeleting.value = true
  const { error } = await supabase.rpc('delete_staff_user', { target_user_id: staffToDelete.value.id })
  isDeleting.value = false
  showDeleteModal.value = false
  if (error) {
    toast.error(error.message)
  } else {
    toast.success("Staff member deleted")
    fetchStaff(userStore.organizationId)
  }
}

onMounted(() => {
  if (userStore.organizationId) { loadStores(); fetchStaff(userStore.organizationId) }
})
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="flex flex-col gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Staff Management</h2>
        <p class="text-xs text-slate-500 mt-1">Assign roles and store locations.</p>
      </div>
      
      <div class="flex gap-2">
        <div class="relative flex-1">
          <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input v-model="searchQuery" type="text" placeholder="Search staff..." class="w-full pl-9 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10" />
        </div>
        <button @click="showAddModal = true" class="bg-slate-900 text-white px-4 py-2.5 rounded-xl text-xs font-bold uppercase flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/20 transition-all active:scale-95 whitespace-nowrap">
          <Plus class="w-4 h-4" /> <span class="hidden sm:inline">Add Staff</span><span class="sm:hidden">Add</span>
        </button>
      </div>
    </div>

    <div v-if="loading" class="py-20 flex justify-center"><Loader2 class="w-8 h-8 animate-spin text-slate-300" /></div>

    <div v-else>
      <div class="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div class="overflow-x-auto">
          <table class="w-full text-left whitespace-nowrap">
            <thead class="bg-slate-50 border-b border-slate-200">
              <tr>
                <th class="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">User</th>
                <th class="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Role</th>
                <th class="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider">Assigned Store</th>
                <th class="px-6 py-4 text-[10px] font-bold uppercase text-slate-500 tracking-wider text-right">Action</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="user in filteredStaff" :key="user.id" class="group hover:bg-slate-50/50 transition-colors">
                <td class="px-6 py-4">
                  <div class="flex items-center gap-3">
                    <div class="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 border border-slate-200">
                      <UserCog class="w-4.5 h-4.5" />
                    </div>
                    <div>
                      <p class="text-sm font-semibold text-slate-900">{{ user.full_name || 'No Name' }}</p>
                      <p class="text-[11px] text-slate-400">{{ user.email }}</p>
                    </div>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="relative">
                    <Shield class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                    <select v-model="user.role" class="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium w-36 focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer hover:border-slate-300 transition-colors">
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                </td>
                <td class="px-6 py-4">
                  <div class="relative">
                    <Store class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                    <select v-model="user.store_id" class="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium w-48 focus:ring-2 focus:ring-indigo-100 appearance-none cursor-pointer hover:border-slate-300 transition-colors">
                      <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
                    </select>
                  </div>
                </td>
                <td class="px-6 py-4 text-right">
                  <div class="flex items-center justify-end gap-2">
                    <button @click="updateStaff(user)" :disabled="user.isSaving" class="inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50 hover:border-slate-300 disabled:opacity-50 transition-all shadow-sm">
                      <Loader2 v-if="user.isSaving" class="w-3 h-3 animate-spin" />
                      <Save v-else class="w-3 h-3" /> 
                      {{ user.isSaving ? 'Saving' : 'Save' }}
                    </button>
                    <button @click="confirmDelete(user)" class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Delete User">
                      <Trash2 class="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="md:hidden space-y-3">
        <div v-for="user in filteredStaff" :key="user.id" class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <div class="flex justify-between items-start mb-4">
             <div class="flex items-center gap-3">
                <div class="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 border border-slate-200">
                  <UserCog class="w-5 h-5" />
                </div>
                <div>
                  <p class="text-sm font-bold text-slate-900">{{ user.full_name || 'No Name' }}</p>
                  <p class="text-[11px] text-slate-500">{{ user.email }}</p>
                </div>
             </div>
             <button @click="confirmDelete(user)" class="text-slate-300 hover:text-red-500 p-1">
               <Trash2 class="w-4 h-4" />
             </button>
          </div>
          
          <div class="space-y-3">
             <div class="grid grid-cols-2 gap-3">
               <div>
                  <label class="text-[9px] font-bold uppercase text-slate-400 block mb-1">Role</label>
                  <div class="relative">
                    <Shield class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                    <select v-model="user.role" class="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white transition-colors appearance-none">
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
               </div>
               <div>
                  <label class="text-[9px] font-bold uppercase text-slate-400 block mb-1">Store</label>
                  <div class="relative">
                    <Store class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 z-10" />
                    <select v-model="user.store_id" class="w-full pl-8 pr-2 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:bg-white transition-colors appearance-none">
                      <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
                    </select>
                  </div>
               </div>
             </div>
             
             <button @click="updateStaff(user)" :disabled="user.isSaving" class="w-full py-2.5 bg-slate-900 text-white rounded-lg text-xs font-bold uppercase flex justify-center items-center gap-2 active:scale-95 transition-transform">
               <Loader2 v-if="user.isSaving" class="w-3.5 h-3.5 animate-spin" />
               <span v-else>Update Access</span>
             </button>
          </div>
        </div>
      </div>
    </div>

    <TransitionRoot appear :show="showAddModal" as="template">
      <Dialog as="div" @close="showAddModal = false" class="relative z-50">
        <TransitionChild enter="ease-out duration-300" enter-from="opacity-0" enter-to="opacity-100" leave="ease-in duration-200" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild enter="ease-out duration-300" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="ease-in duration-200" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
              <DialogPanel class="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all">
                <div class="flex justify-between items-center mb-6">
                  <DialogTitle class="text-lg font-bold text-slate-900">Add Team Member</DialogTitle>
                  <button @click="showAddModal = false" class="text-slate-400 hover:text-slate-900 transition-colors"><X class="w-5 h-5" /></button>
                </div>
                <div class="space-y-4">
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Full Name</label>
                    <input v-model="newStaff.fullName" type="text" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 outline-none transition-all" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Email</label>
                    <input v-model="newStaff.email" type="email" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 outline-none transition-all" />
                  </div>
                  <div>
                    <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Password</label>
                    <input v-model="newStaff.password" type="password" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-slate-900/10 focus:border-slate-300 outline-none transition-all" />
                  </div>
                  <div class="grid grid-cols-2 gap-4">
                    <div>
                       <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Role</label>
                       <div class="relative">
                         <select v-model="newStaff.role" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 outline-none">
                           <option value="staff">Staff</option>
                           <option value="admin">Admin</option>
                         </select>
                         <Shield class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                    <div>
                       <label class="block text-[10px] font-bold uppercase text-slate-500 mb-1.5">Store</label>
                       <div class="relative">
                         <select v-model="newStaff.store_id" class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm appearance-none focus:bg-white focus:ring-2 focus:ring-slate-900/10 outline-none">
                           <option v-for="s in stores" :key="s.id" :value="s.id">{{ s.name }}</option>
                         </select>
                         <Store class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                       </div>
                    </div>
                  </div>
                  <button @click="createStaffAccount" :disabled="creating" class="w-full bg-slate-900 text-white py-3.5 rounded-xl text-sm font-bold uppercase hover:bg-slate-800 disabled:opacity-70 flex justify-center items-center gap-2 transition-all mt-2">
                    <Loader2 v-if="creating" class="w-4 h-4 animate-spin" /> <span>Create Account</span>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot appear :show="showDeleteModal" as="template">
      <Dialog as="div" @close="showDeleteModal = false" class="relative z-50">
        <TransitionChild enter="duration-300 ease-out" enter-from="opacity-0" enter-to="opacity-100" leave="duration-200 ease-in" leave-from="opacity-100" leave-to="opacity-0">
          <div class="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild enter="duration-300 ease-out" enter-from="opacity-0 scale-95" enter-to="opacity-100 scale-100" leave="duration-200 ease-in" leave-from="opacity-100 scale-100" leave-to="opacity-0 scale-95">
              <DialogPanel class="w-full max-w-sm transform overflow-hidden rounded-2xl bg-white p-6 shadow-2xl transition-all text-center">
                <div class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <AlertTriangle class="w-6 h-6 text-red-600" />
                </div>
                <DialogTitle class="text-lg font-bold text-slate-900 mb-2">Delete Team Member?</DialogTitle>
                <p class="text-sm text-slate-500 mb-6">
                  Are you sure you want to remove <span class="font-bold text-slate-900">{{ staffToDelete?.full_name }}</span>? 
                  <br>This action cannot be undone.
                </p>
                <div class="grid grid-cols-2 gap-3">
                  <button @click="showDeleteModal = false" class="px-4 py-2.5 bg-slate-100 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                  <button @click="handleConfirmDelete" :disabled="isDeleting" class="px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 flex items-center justify-center gap-2 transition-colors">
                    <Loader2 v-if="isDeleting" class="w-4 h-4 animate-spin" />
                    <span>{{ isDeleting ? 'Deleting...' : 'Yes, Delete' }}</span>
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>