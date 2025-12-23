<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";
import { Lock, Mail, Loader2 } from "lucide-vue-next";

const router = useRouter();
const userStore = useUserStore();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");

const handleLogin = async () => {
  loading.value = true;
  errorMsg.value = "";

  try {
    // 1. Authenticate with Supabase Auth
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    // 2. Fetch Role & Store Data (Pinia Store)
    // This checks if they are Admin or Staff, and which store they belong to
    await userStore.fetchUserProfile();
    
    // 3. Redirect based on result
    if (userStore.role) {
      router.push("/admin");
    } else {
      // User exists in Auth but not in 'user_roles' table
      throw new Error("Access denied. No role assigned to this account.");
    }

  } catch (err) {
    errorMsg.value = err.message;
    await supabase.auth.signOut(); // Force logout if role check fails
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
        <p class="text-[10px] font-mono text-slate-400 uppercase tracking-widest">Authorized Access Only</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        
        <div v-if="errorMsg" class="bg-red-50 border border-red-100 p-3 rounded-lg flex items-start gap-2">
          <div class="text-red-600 text-[10px] font-bold uppercase tracking-wide leading-relaxed">
            {{ errorMsg }}
          </div>
        </div>

        <div class="space-y-4">
          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Email</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-0 flex items-center pointer-events-none">
                <Mail class="w-4 h-4 text-slate-300" />
              </div>
              <input v-model="email" type="email" required class="w-full pl-7 py-2 bg-transparent border-b border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-black transition-all" placeholder="staff@sayon.com" />
            </div>
          </div>

          <div>
            <label class="block text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Password</label>
            <div class="relative">
              <div class="absolute inset-y-0 left-0 pl-0 flex items-center pointer-events-none">
                <Lock class="w-4 h-4 text-slate-300" />
              </div>
              <input v-model="password" type="password" required class="w-full pl-7 py-2 bg-transparent border-b border-slate-200 text-sm font-medium text-slate-900 focus:outline-none focus:border-black transition-all" placeholder="••••••••" />
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-black text-white py-3 rounded-lg text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-70 transition-all flex items-center justify-center gap-2 shadow-md hover:-translate-y-0.5"
        >
          <Loader2 v-if="loading" class="w-3 h-3 animate-spin" />
          <span>{{ loading ? "Verifying..." : "Sign In" }}</span>
        </button>
      </form>
    </div>
  </div>
</template>