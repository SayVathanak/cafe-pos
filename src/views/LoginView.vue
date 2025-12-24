<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";
import { Lock, Mail, Loader2, ArrowRight, Command } from "lucide-vue-next";

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
    const { error } = await supabase.auth.signInWithPassword({
      email: email.value,
      password: password.value,
    });

    if (error) throw error;

    await userStore.fetchUserProfile();
    
    // Intelligent Routing based on Role
    if (userStore.role === 'super_admin') {
        router.push("/super-admin"); 
    } else if (userStore.role === 'admin') {
        router.push("/admin");
    } else if (userStore.role === 'staff') {
        router.push("/pos");
    } else {
      throw new Error("Access denied. No role assigned.");
    }

  } catch (err) {
    errorMsg.value = err.message;
    await supabase.auth.signOut();
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="relative min-h-screen w-full flex items-center justify-center font-sans overflow-hidden bg-[#F8FAFC]">
    
    <div class="absolute inset-0 z-0 overflow-hidden">
        <div class="absolute top-[-10%] left-[-10%] w-125 h-125 bg-purple-200 rounded-full blur-[100px] opacity-60 animate-blob"></div>
        <div class="absolute bottom-[-10%] right-[-10%] w-125 h-125 bg-indigo-200 rounded-full blur-[100px] opacity-60 animate-blob animation-delay-2000"></div>
        <div class="absolute top-[40%] left-[40%] w-150 h-150 bg-blue-100 rounded-full blur-[120px] opacity-50 animate-blob animation-delay-4000"></div>
    </div>

    <div class="relative z-10 w-full max-w-105 p-8 md:p-10">
      
      <div class="mb-10 text-center">
        <div class="w-14 h-14 bg-black text-white rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-2xl shadow-indigo-500/20 transform hover:scale-105 transition-transform duration-300">
          <Command class="w-7 h-7" />
        </div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Sign in to Platform</h1>
        <p class="text-slate-500 text-sm mt-2 font-medium">Welcome back, please enter your details.</p>
      </div>

      <form @submit.prevent="handleLogin" class="space-y-6">
        
        <div v-if="errorMsg" class="bg-red-50 border border-red-100 rounded-xl p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <div class="bg-red-100 p-1 rounded-full shrink-0">
             <span class="block w-1.5 h-1.5 bg-red-600 rounded-full"></span>
          </div>
          <p class="text-xs font-bold text-red-600 leading-relaxed">{{ errorMsg }}</p>
        </div>

        <div class="space-y-4">
          <div class="group">
            <label class="block text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5 ml-1">Email</label>
            <div class="relative transition-all duration-300 focus-within:scale-[1.01]">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Mail class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input 
                v-model="email" 
                type="email" 
                required
                placeholder="name@company.com" 
                class="w-full bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-normal" 
              />
            </div>
          </div>

          <div class="group">
            <label class="block text-[10px] uppercase font-bold text-slate-400 tracking-widest mb-1.5 ml-1">Password</label>
            <div class="relative transition-all duration-300 focus-within:scale-[1.01]">
              <div class="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock class="w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
              </div>
              <input 
                v-model="password" 
                type="password" 
                required
                placeholder="••••••••" 
                class="w-full bg-white/70 backdrop-blur-sm border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-sm font-medium text-slate-900 shadow-sm outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all placeholder:text-slate-400 placeholder:font-normal" 
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold text-sm shadow-xl shadow-slate-900/10 hover:bg-black hover:shadow-2xl hover:shadow-slate-900/20 active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed transition-all duration-200 flex items-center justify-center gap-2 group"
        >
          <Loader2 v-if="loading" class="w-5 h-5 animate-spin text-white/80" />
          <span v-else>Continue</span>
          <ArrowRight v-if="!loading" class="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
        </button>

      </form>

      <div class="mt-8 text-center space-y-4">
        <p class="text-xs text-slate-400">
          Powered by <span class="font-bold text-slate-500">POS Platform Systems</span>
        </p>
        <div class="flex justify-center gap-1">
            <div class="w-1 h-1 rounded-full bg-slate-200"></div>
            <div class="w-1 h-1 rounded-full bg-slate-200"></div>
            <div class="w-1 h-1 rounded-full bg-slate-200"></div>
        </div>
      </div>
    </div>

  </div>
</template>

<style scoped>
/* Keyframes for the background blob animation */
@keyframes blob {
  0% { transform: translate(0px, 0px) scale(1); }
  33% { transform: translate(30px, -50px) scale(1.1); }
  66% { transform: translate(-20px, 20px) scale(0.9); }
  100% { transform: translate(0px, 0px) scale(1); }
}
.animate-blob {
  animation: blob 7s infinite;
}
.animation-delay-2000 {
  animation-delay: 2s;
}
.animation-delay-4000 {
  animation-delay: 4s;
}
</style>