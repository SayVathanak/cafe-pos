<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'
import { supabase } from '../services/supabase'
import { useToastStore } from '../stores/toastStore'
import { 
  Building2, Plus, Users, Search, Loader2, X, MoreHorizontal, LayoutGrid, 
  CheckCircle2, MonitorCheck, LogOut, Trash2 
} from 'lucide-vue-next'

const router = useRouter()
const toast = useToastStore()
const orgs = ref([])
const loading = ref(true)
const showModal = ref(false)
const saving = ref(false)
const searchQuery = ref('') 

// Form State
const newOrg = ref({ name: '', ownerEmail: '', ownerPassword: '' })

// 1. FETCH DATA (Manual Count Logic)
const fetchOrgs = async () => {
  loading.value = true
  const { data: orgsData, error: orgsError } = await supabase
    .from('organizations')
    .select('id, name, created_at')
    .order('created_at', { ascending: false })
  
  if (orgsError) {
    loading.value = false
    return
  }

  // We manually count stores and profiles for accuracy
  const orgsWithCounts = await Promise.all(
    (orgsData || []).map(async (org) => {
      const { count: storesCount } = await supabase
        .from('stores')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
      
      const { count: profilesCount } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id)
      
      return {
        ...org,
        stores: [{ count: storesCount || 0 }],
        profiles: [{ count: profilesCount || 0 }]
      }
    })
  )
  orgs.value = orgsWithCounts
  loading.value = false
}

// 2. CREATE CLIENT (Complex Logic)
const createClient = async () => {
  // 0. Validation
  if (!newOrg.value.name || !newOrg.value.ownerEmail || !newOrg.value.ownerPassword) {
    return toast.addToast("Please fill in all fields", "error")
  }
  saving.value = true

  try {
    // STEP 1: Create Organization
    const { data: org, error: orgErr } = await supabase
      .from('organizations')
      .insert({ name: newOrg.value.name })
      .select()
      .single()
    
    if (orgErr) throw new Error("Org Check: " + orgErr.message)

    // STEP 2: Create the First "Main Branch" Store
    const { data: newStore, error: storeErr } = await supabase
      .from('stores')
      .insert({
        organization_id: org.id,
        name: `${newOrg.value.name} - HQ`, 
        location: 'Main Office',
        active: true
      })
      .select()
      .single()

    if (storeErr) throw new Error("Store Creation: " + storeErr.message)

    // STEP 3: Create Auth User (Ghost Client via Admin/Anon API)
    // We use a temporary client to avoid logging out the Super Admin
    const tempSupabase = createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const { data: authData, error: authErr } = await tempSupabase.auth.signUp({
      email: newOrg.value.ownerEmail,
      password: newOrg.value.ownerPassword,
      options: {
        data: {
          full_name: `${newOrg.value.name} Manager`,
          organization_id: org.id,
          role: 'admin'
        }
      }
    })

    if (authErr) throw new Error("Auth Signup: " + authErr.message)

    if (authData.user) {
      const userId = authData.user.id

      // STEP 4: Create Profile 
      const { error: profileErr } = await supabase
        .from('profiles')
        .insert({
          id: userId,
          organization_id: org.id,
          store_id: newStore.id, // Linking to store immediately
          email: newOrg.value.ownerEmail,
          role: 'admin',
          full_name: `${newOrg.value.name} Manager`
        })

      if (profileErr) throw new Error("Profile Error: " + profileErr.message)

      // STEP 5: Create User Role
      const { error: roleErr } = await supabase
        .from('user_roles')
        .insert({
          user_id: userId,
          store_id: newStore.id,
          role: 'admin'
        })
      
      if (roleErr) console.error("User Role Warning:", roleErr)

      // SUCCESS
      toast.addToast(`Client "${newOrg.value.name}" setup complete!`, "success")
      showModal.value = false
      newOrg.value = { name: '', ownerEmail: '', ownerPassword: '' }
      fetchOrgs()
    }

  } catch (error) {
    console.error(error)
    toast.addToast(error.message, "error")
  } finally {
    saving.value = false
  }
}

// 3. DELETE ORGANIZATION
const deleteOrg = async (id, name) => {
  const confirmMsg = `Are you sure you want to delete "${name}"?\nThis will remove all their data permanently.`
  if (!confirm(confirmMsg)) return

  // Database Foreign Keys must have "ON DELETE CASCADE" for this to work cleanly
  const { error } = await supabase
    .from('organizations')
    .delete()
    .eq('id', id)

  if (error) {
    toast.addToast("Delete failed: " + error.message, "error")
  } else {
    toast.addToast(`Organization "${name}" deleted`, "success")
    fetchOrgs()
  }
}

// 4. LOGOUT
const handleLogout = async () => {
  await supabase.auth.signOut()
  router.push('/')
}

// Filter
const filteredOrgs = computed(() => {
  if (!searchQuery.value) return orgs.value
  return orgs.value.filter(org => 
    org.name.toLowerCase().includes(searchQuery.value.toLowerCase()) ||
    org.id.includes(searchQuery.value)
  )
})

onMounted(fetchOrgs)
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
    
    <nav class="shrink-0 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 z-20">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white shadow-sm">
          <LayoutGrid class="w-4 h-4" />
        </div>
        <span class="font-bold text-sm tracking-tight text-slate-900">Platform Admin</span>
        <div class="h-4 w-px bg-slate-200 mx-1"></div>
        <div class="flex items-center gap-4 text-xs font-medium text-slate-500">
           <div class="flex items-center gap-1.5">
             <Building2 class="w-3.5 h-3.5" />
             <span class="text-slate-900 font-bold">{{ orgs.length }}</span> Clients
           </div>
           <div class="items-center gap-1.5 hidden sm:flex">
             <MonitorCheck class="w-3.5 h-3.5 text-emerald-500" />
             <span class="text-emerald-700">System Operational</span>
           </div>
        </div>
      </div>
      
      <div class="flex items-center gap-3">
        <div class="hidden md:block text-[10px] font-bold text-slate-400 uppercase tracking-widest bg-slate-100 px-2 py-1 rounded">
          Super Admin
        </div>
        <button 
          @click="handleLogout"
          class="text-slate-500 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
          title="Sign Out"
        >
          <LogOut class="w-4 h-4" />
        </button>
      </div>
    </nav>

    <div class="shrink-0 px-4 py-3 bg-white/50 border-b border-slate-200 flex items-center justify-between gap-4 backdrop-blur-sm">
      <div class="relative w-full max-w-sm">
        <Search class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input 
          v-model="searchQuery"
          type="text" 
          placeholder="Search by name or ID..." 
          class="w-full pl-9 pr-4 py-1.5 bg-white border border-slate-300 rounded-md text-sm focus:ring-2 focus:ring-black/5 focus:border-black outline-none transition-all placeholder:text-slate-400" 
        />
      </div>

      <button 
        @click="showModal = true" 
        class="bg-black hover:bg-slate-800 text-white px-4 py-1.5 rounded-md font-bold text-xs flex items-center gap-2 shadow-sm transition-all active:scale-95"
      >
        <Plus class="w-3.5 h-3.5" /> Add Organization
      </button>
    </div>

    <main class="flex-1 overflow-hidden p-4">
      <div class="h-full bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col">
        
        <div class="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-2 flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div class="w-1/3">Company</div>
          <div class="w-1/6">Status</div>
          <div class="w-1/6">Branches</div>
          <div class="w-1/6">Staff</div>
          <div class="w-1/6 text-right">Actions</div> 
        </div>

        <div class="flex-1 overflow-y-auto custom-scrollbar">
          <div v-if="loading" class="h-full flex items-center justify-center">
            <Loader2 class="w-6 h-6 animate-spin text-slate-300" />
          </div>

          <div v-else-if="filteredOrgs.length === 0" class="p-10 text-center text-slate-400 text-sm">
            No clients found.
          </div>

          <div v-else class="divide-y divide-slate-50">
            <div 
              v-for="org in filteredOrgs" 
              :key="org.id" 
              class="px-4 py-2.5 flex items-center hover:bg-slate-50 transition-colors group text-sm"
            >
              <div class="w-1/3 flex items-center gap-3">
                <div class="w-8 h-8 rounded bg-slate-100 text-slate-500 flex items-center justify-center font-bold text-xs border border-slate-200 shrink-0">
                  {{ org.name.substring(0,2).toUpperCase() }}
                </div>
                <div class="min-w-0">
                  <div class="font-bold text-slate-900 truncate">{{ org.name }}</div>
                  <div class="text-[10px] text-slate-400 font-mono truncate opacity-0 group-hover:opacity-100 transition-opacity">
                    {{ org.id }}
                  </div>
                </div>
              </div>

              <div class="w-1/6">
                <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100/50">
                  <CheckCircle2 class="w-3 h-3" /> Active
                </span>
              </div>

              <div class="w-1/6 text-slate-600 font-medium pl-2">
                {{ org.stores[0]?.count || 0 }}
              </div>

              <div class="w-1/6 text-slate-600 font-medium pl-2">
                {{ org.profiles[0]?.count || 0 }}
              </div>

              <div class="w-1/6 flex justify-end items-center gap-2">
                <span class="text-slate-400 text-xs font-mono hidden xl:inline-block mr-2">
                  {{ new Date(org.created_at).toLocaleDateString() }}
                </span>
                
                <button 
                  @click.stop="deleteOrg(org.id, org.name)" 
                  class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                  title="Delete Organization"
                >
                  <Trash2 class="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showModal = false"></div>
      <div class="relative bg-white w-full max-w-sm rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div class="px-5 py-3 border-b border-slate-100 flex justify-between items-center bg-slate-50">
          <h2 class="text-sm font-bold text-slate-900">New Organization</h2>
          <button @click="showModal = false" class="text-slate-400 hover:text-slate-900"><X class="w-4 h-4" /></button>
        </div>
        <div class="p-5 space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Company Name</label>
            <input v-model="newOrg.name" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-black focus:border-black outline-none" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Owner Email</label>
            <input v-model="newOrg.ownerEmail" type="email" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-black focus:border-black outline-none" />
          </div>
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1">Password</label>
            <input v-model="newOrg.ownerPassword" type="text" class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium focus:ring-1 focus:ring-black focus:border-black outline-none font-mono" />
          </div>
          <button @click="createClient" :disabled="saving" class="w-full bg-black text-white py-2.5 rounded-lg font-bold text-xs hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2">
            <Loader2 v-if="saving" class="w-3 h-3 animate-spin" />
            <span>{{ saving ? 'Creating...' : 'Create Organization' }}</span>
          </button>
        </div>
      </div>
    </div>

  </div>
</template>