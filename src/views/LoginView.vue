<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { Lock, Mail, ArrowLeft, Loader2 } from "lucide-vue-next";

const router = useRouter();
const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = "";

  try {
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;
    router.push("/admin");
  } catch (err) {
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 font-sans text-slate-900 p-6">
    
    <div class="w-full max-w-sm bg-white border border-slate-100 p-8 rounded-2xl shadow-xl shadow-slate-200/50 relative overflow-hidden">
      
      <div class="absolute top-0 left-0 w-full h-1 bg-linear-to-r from-black via-slate-700 to-black"></div>

      <div class="mb-8 text-center">
        <div class="w-12 h-12 bg-black text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-black/20">
          <span class="font-bold text-xl font-khmer">ស</span>
        </div>
        <h1 class="text-xl font-bold font-khmer text-slate-900 mb-1">សាយ័ណ្ហកាហ្វេ</h1>
        <p class="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Admin Authentication</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        
        <div v-if="errorMsg" class="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2 animate-pulse">
          <div class="text-red-600 text-[10px] font-bold uppercase tracking-wide leading-relaxed">
            {{ errorMsg }}
          </div>
        </div>

        <div class="space-y-4">
          <div class="group">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 group-focus-within:text-black transition-colors">
              Email
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-0 flex items-center pointer-events-none">
                <Mail class="w-4 h-4 text-slate-300 group-focus-within:text-black transition-colors" />
              </div>
              <input
                v-model="email"
                type="email"
                required
                class="w-full pl-7 py-2 bg-transparent border-b border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-black transition-all"
                placeholder="admin@sayon.com"
              />
            </div>
          </div>

          <div class="group">
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5 group-focus-within:text-black transition-colors">
              Password
            </label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-0 flex items-center pointer-events-none">
                <Lock class="w-4 h-4 text-slate-300 group-focus-within:text-black transition-colors" />
              </div>
              <input
                v-model="password"
                type="password"
                required
                class="w-full pl-7 py-2 bg-transparent border-b border-slate-200 text-sm font-medium text-slate-900 placeholder-slate-300 focus:outline-none focus:border-black transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-black text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-70 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-md hover:shadow-lg hover:-translate-y-0.5"
        >
          <Loader2 v-if="loading" class="w-3 h-3 animate-spin" />
          <span>{{ loading ? "Verifying..." : "Sign In" }}</span>
        </button>
      </form>

      <div class="mt-8 pt-6 border-t border-slate-50 text-center">
        <router-link
          to="/"
          class="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-wide text-slate-400 hover:text-black transition-colors"
        >
          <ArrowLeft class="w-3 h-3" /> Return to POS
        </router-link>
      </div>
    </div>
  </div>
</template>