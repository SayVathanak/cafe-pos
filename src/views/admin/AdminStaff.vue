<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { useToastStore } from '../../stores/toastStore'
import { 
  Users, Search, Shield, Store, Save, Loader2, UserCog 
} from 'lucide-vue-next'

const toast = useToastStore()
const loading = ref(true)
const staffList = ref([])
const stores = ref([])
const searchQuery = ref('')

// Fetch Data
const fetchData = async () => {
  loading.value = true
  
  // 1. Get all profiles (emails)
  const { data: profiles, error: profileError } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    
  // 2. Get all roles assignments
  const { data: roles, error: roleError } = await supabase
    .from('user_roles')
    .select('*')

  // 3. Get all available stores
  const { data: storeList } = await supabase.from('stores').select('*')
  stores.value = storeList || []

  if (profileError || roleError) {
    toast.addToast("Failed to load staff data", "error")
    loading.value = false
    return
  }

  // 4. Merge Data (Profile + Role + Store)
  staffList.value = profiles.map(profile => {
    const roleData = roles.find(r => r.user_id === profile.id)
    return {
      ...profile,
      role: roleData?.role || 'staff', // Default to staff if missing
      store_id: roleData?.store_id || stores.value[0]?.id, // Default to first store
      role_entry_id: roleData?.id // Need this to update the specific row
    }
  })

  loading.value = false
}

// Update Staff Member
const updateStaff = async (user) => {
  user.isSaving = true
  
  // Upsert into user_roles (Insert if not exists, Update if exists)
  const { error } = await supabase
    .from('user_roles')
    .upsert({ 
      user_id: user.id,
      role: user.role, 
      store_id: user.store_id
    }, { onConflict: 'user_id' })

  user.isSaving = false

  if (error) {
    toast.addToast(error.message, "error")
  } else {
    toast.addToast("Staff permissions updated", "success")
    fetchData() // Refresh to be safe
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Staff Management</h2>
        <p class="text-xs text-slate-500 mt-1">Assign roles and store locations to your team.</p>
      </div>
      
      <div class="relative w-full sm:w-64">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search by email..." 
          class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 transition-colors"
        />
      </div>
    </div>

    <div v-if="loading" class="py-12 flex justify-center">
      <Loader2 class="w-8 h-8 animate-spin text-slate-300" />
    </div>

    <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
      <table class="w-full text-left">
        <thead class="bg-slate-50 border-b border-slate-200">
          <tr>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">User</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Role</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned Store</th>
            <th class="px-6 py-4 text-[10px] font-bold uppercase tracking-widest text-slate-500 text-right">Action</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-slate-100">
          <tr v-for="user in staffList" :key="user.id" class="group hover:bg-slate-50/50 transition-colors">
            
            <td class="px-6 py-4">
              <div class="flex items-center gap-3">
                <div class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-400">
                  <UserCog class="w-4 h-4" />
                </div>
                <div>
                  <p class="text-sm font-medium text-slate-900">{{ user.email }}</p>
                  <p class="text-[10px] text-slate-400">ID: {{ user.id.slice(0,8) }}...</p>
                </div>
              </div>
            </td>

            <td class="px-6 py-4">
              <div class="relative">
                <Shield class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select 
                  v-model="user.role"
                  class="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-all w-32"
                >
                  <option value="staff">Staff</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </td>

            <td class="px-6 py-4">
              <div class="relative">
                <Store class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                <select 
                  v-model="user.store_id"
                  class="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200 outline-none appearance-none cursor-pointer hover:border-slate-300 transition-all w-48"
                >
                  <option v-for="store in stores" :key="store.id" :value="store.id">
                    {{ store.name }}
                  </option>
                </select>
              </div>
            </td>

            <td class="px-6 py-4 text-right">
              <button 
                @click="updateStaff(user)"
                :disabled="user.isSaving"
                class="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-medium hover:bg-slate-800 disabled:opacity-50 transition-all shadow-sm"
              >
                <Loader2 v-if="user.isSaving" class="w-3 h-3 animate-spin" />
                <Save v-else class="w-3 h-3" />
                {{ user.isSaving ? 'Saving' : 'Update' }}
              </button>
            </td>

          </tr>
        </tbody>
      </table>
      
      <div v-if="staffList.length === 0" class="p-8 text-center text-slate-400 text-sm">
        No staff members found.
      </div>
    </div>
  </div>
</template>