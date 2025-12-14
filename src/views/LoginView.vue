<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../services/supabase'
import { Lock, Mail, ArrowLeft, Loader2 } from 'lucide-vue-next'

const router = useRouter()
const email = ref('')
const password = ref('')
const loading = ref(false)
const errorMsg = ref('')

const handleLogin = async () => {
  loading.value = true
  errorMsg.value = ''

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value
    })

    if (error) throw error

    // Success! Go to Admin Panel
    router.push('/admin')
    
  } catch (err) {
    errorMsg.value = err.message
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-zinc-50 font-sans text-zinc-900 p-6">
    
    <div class="w-full max-w-md bg-white border border-zinc-200 p-10 relative">
      
      <div class="absolute top-0 left-0 w-20 h-1 bg-black"></div>

      <div class="mb-10">
        <div class="w-10 h-10 bg-black text-white flex items-center justify-center mb-6">
          <span class="font-bold text-lg">S</span>
        </div>
        <h1 class="text-2xl font-bold tracking-tight uppercase mb-2">Admin Access</h1>
        <p class="font-mono text-xs text-zinc-500">PLEASE AUTHENTICATE TO CONTINUE</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-8">
        
        <div v-if="errorMsg" class="bg-red-50 border border-red-100 p-3 flex items-start gap-2">
          <div class="text-red-600 text-xs font-bold uppercase tracking-wide leading-relaxed">
            Error: {{ errorMsg }}
          </div>
        </div>

        <div class="group">
          <label class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 group-focus-within:text-black transition-colors">
            Email Address
          </label>
          <div class="flex items-center border-b border-zinc-200 group-focus-within:border-black transition-colors py-2">
            <Mail class="w-4 h-4 text-zinc-400 group-focus-within:text-black mr-3" />
            <input 
              v-model="email" 
              type="email" 
              required
              class="w-full bg-transparent outline-none font-medium placeholder-zinc-300"
              placeholder="admin@sayon.com"
            />
          </div>
        </div>

        <div class="group">
          <label class="block text-[10px] font-bold uppercase tracking-widest text-zinc-400 mb-2 group-focus-within:text-black transition-colors">
            Password
          </label>
          <div class="flex items-center border-b border-zinc-200 group-focus-within:border-black transition-colors py-2">
            <Lock class="w-4 h-4 text-zinc-400 group-focus-within:text-black mr-3" />
            <input 
              v-model="password" 
              type="password" 
              required
              class="w-full bg-transparent outline-none font-medium placeholder-zinc-300"
              placeholder="••••••••"
            />
          </div>
        </div>

        <button 
          type="submit" 
          :disabled="loading"
          class="w-full bg-black text-white py-4 text-xs font-bold uppercase tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
        >
          <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
          <span>{{ loading ? 'Authenticating...' : 'Enter System' }}</span>
        </button>

      </form>

      <div class="mt-8 pt-8 border-t border-zinc-100 text-center">
        <router-link 
          to="/" 
          class="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-zinc-400 hover:text-black transition-colors"
        >
          <ArrowLeft class="w-3 h-3" /> Back to POS Terminal
        </router-link>
      </div>

    </div>
  </div>
</template>