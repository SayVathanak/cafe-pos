<script setup>
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { Store, Loader2, CheckCircle } from 'lucide-vue-next'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const success = ref(false)
const errorMsg = ref('')

const form = ref({
  email: '',
  password: '',
  fullName: ''
})

const storeName = ref('Loading...')
const storeId = route.query.store_id

onMounted(async () => {
  // 1. Force Logout immediately
  // This prevents conflicts if you open the link while still logged in as Admin
  await supabase.auth.signOut()

  // 2. Validate Link
  if (!storeId) {
    errorMsg.value = "Invalid Link: No Store ID found."
    return
  }
  
  // 3. Fetch Store Name (to show the user what they are claiming)
  const { data, error } = await supabase
    .from('stores')
    .select('name')
    .eq('id', storeId)
    .single()

  if (error || !data) {
    errorMsg.value = "Invalid Link: Store not found."
  } else {
    storeName.value = data.name
    form.value.fullName = data.name // Default the name to the store name
  }
})

const handleRegister = async () => {
  if (!form.value.email || !form.value.password) return
  
  loading.value = true
  errorMsg.value = ''

  // 4. Create Account with Metadata
  // The Database Trigger we created earlier will see 'store_id' 
  // and automatically assign the role and store permissions.
  const { data, error } = await supabase.auth.signUp({
    email: form.value.email,
    password: form.value.password,
    options: {
      data: {
        full_name: form.value.fullName,
        store_id: storeId // <--- This is the magic key
      }
    }
  })

  loading.value = false

  if (error) {
    errorMsg.value = error.message
  } else {
    success.value = true
    // Redirect to login after 2 seconds
    setTimeout(() => router.push('/login'), 2000)
  }
}
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex items-center justify-center p-4">
    <div class="max-w-md w-full bg-white rounded-2xl shadow-xl overflow-hidden border border-slate-100 p-8">
      
      <div class="text-center mb-8">
        <div class="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mx-auto mb-4 text-indigo-600">
          <Store class="w-6 h-6" />
        </div>
        <h1 class="text-xl font-bold text-slate-900">Activate Branch Login</h1>
        <p v-if="!errorMsg" class="text-sm text-slate-500 mt-2">Setting up for: <strong class="text-slate-800">{{ storeName }}</strong></p>
      </div>

      <div v-if="success" class="text-center py-8">
        <CheckCircle class="w-16 h-16 text-green-500 mx-auto mb-4" />
        <h3 class="text-lg font-bold text-slate-900">Setup Complete!</h3>
        <p class="text-slate-500 text-sm mt-1">Redirecting to login...</p>
      </div>

      <div v-else-if="errorMsg" class="p-4 bg-red-50 text-red-600 text-sm rounded-xl text-center mb-4">
        {{ errorMsg }}
      </div>

      <div v-else class="space-y-4">
        <div>
          <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Branch Email</label>
          <input v-model="form.email" type="email" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition-colors" placeholder="branch@sayon.com" />
        </div>
        
        <div>
          <label class="text-xs font-bold uppercase tracking-widest text-slate-500">Create Password</label>
          <input v-model="form.password" type="password" class="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:border-indigo-600 transition-colors" placeholder="••••••••" />
        </div>

        <button 
          @click="handleRegister" 
          :disabled="loading"
          class="w-full bg-indigo-600 text-white py-3.5 rounded-xl text-sm font-bold uppercase tracking-wide hover:bg-indigo-700 disabled:opacity-70 flex items-center justify-center gap-2 transition-all mt-4 shadow-lg shadow-indigo-200"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span>{{ loading ? 'Activating...' : 'Activate Account' }}</span>
        </button>
      </div>

    </div>
  </div>
</template>