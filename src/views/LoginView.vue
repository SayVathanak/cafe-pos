<script setup>
import { ref } from "vue";
import { useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";
import { 
  Loader2, Mail, Lock, CheckCircle2, ShieldCheck, Apple, Facebook, Chrome, 
  TrendingUp, ArrowUpRight, DollarSign 
} from "lucide-vue-next";

const router = useRouter();
const userStore = useUserStore();

const email = ref("");
const password = ref("");
const loading = ref(false);
const errorMsg = ref("");
const activeTab = ref("signin");

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
    
    if (userStore.role === 'super_admin') router.push("/super-admin"); 
    else if (userStore.role === 'admin') router.push("/admin");
    else if (userStore.role === 'staff') router.push("/pos");
    else throw new Error("Access denied.");

  } catch (err) {
    errorMsg.value = err.message;
    await supabase.auth.signOut();
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen w-full flex font-sans bg-white overflow-hidden">
    
    <div class="w-full lg:w-1/2 flex flex-col justify-center items-center px-6 py-8 md:px-10 lg:px-12 xl:px-16 relative z-20 bg-white safe-area-inset">
      
      <div class="w-full max-w-100">
        
        <div class="flex items-center justify-center lg:justify-start gap-2 mb-6">
          <span class="font-bold text-base text-slate-900 tracking-tight">Cambodge Business</span>
        </div>

        <div class="text-center lg:text-left mb-6">
          <h1 class="text-2xl font-bold text-slate-900 tracking-tight">Welcome Back</h1>
          <p class="text-slate-500 mt-1 text-sm">Enter your details to access your dashboard.</p>
        </div>

        <div class="bg-slate-50 p-1 rounded-xl flex mb-6 border border-slate-100">
          <button 
            @click="activeTab = 'signin'"
            class="flex-1 py-2 text-xs font-bold rounded-lg transition-all"
            :class="activeTab === 'signin' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'"
          >
            Sign In
          </button>
          <button 
            class="flex-1 py-2 text-xs font-bold rounded-lg text-slate-400 cursor-not-allowed opacity-50"
          >
            Signup
          </button>
        </div>

        <form @submit.prevent="handleLogin" class="space-y-3.5">
          
          <div v-if="errorMsg" class="bg-red-50 text-red-600 text-xs font-bold p-3 rounded-lg flex items-center gap-2 border border-red-100">
            <ShieldCheck class="w-4 h-4 shrink-0" /> {{ errorMsg }}
          </div>

          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Mail class="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
            </div>
            <input 
              v-model="email" 
              type="email" 
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-10 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" 
              placeholder="Email Address"
            />
            <div v-if="email.includes('@')" class="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none animate-in fade-in zoom-in">
              <CheckCircle2 class="w-4 h-4 text-emerald-500" />
            </div>
          </div>

          <div class="relative group">
            <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Lock class="w-4 h-4 text-slate-400 group-focus-within:text-[#2563EB] transition-colors" />
            </div>
            <input 
              v-model="password" 
              type="password" 
              required
              class="w-full bg-slate-50 border border-slate-200 rounded-lg py-2.5 pl-10 pr-4 text-sm font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-[#2563EB] outline-none transition-all placeholder:text-slate-400" 
              placeholder="Password"
            />
          </div>

          <button
            type="submit"
            :disabled="loading"
            class="w-full bg-[#2563EB] hover:bg-[#1d4ed8] text-white py-2.5 rounded-lg font-bold text-sm transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 active:scale-[0.98]"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span v-else>Access Dashboard</span>
          </button>
        </form>

        <div class="relative my-5">
          <div class="absolute inset-0 flex items-center">
            <div class="w-full border-t border-slate-200"></div>
          </div>
          <div class="relative flex justify-center text-[9px] font-bold uppercase tracking-widest">
            <span class="bg-white px-3 text-slate-400">Or Continue With</span>
          </div>
        </div>

        <div class="flex justify-center gap-3">
          <button class="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-slate-50 hover:border-slate-300 transition-all">
            <Chrome class="w-5 h-5 text-slate-700" />
          </button>
          <button class="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center bg-black hover:bg-slate-800 transition-all text-white">
            <Apple class="w-5 h-5 fill-current" />
          </button>
          <button class="w-11 h-11 rounded-xl border border-slate-200 flex items-center justify-center hover:bg-blue-50 hover:border-blue-200 transition-all text-[#1877F2]">
            <Facebook class="w-5 h-5 fill-current" />
          </button>
        </div>

        <p class="text-center text-xs text-slate-400 mt-6 leading-relaxed max-w-xs mx-auto">
          Trusted by 50+ Cambodian businesses
        </p>

      </div>
    </div>

    <div class="hidden lg:flex w-1/2 bg-linear-to-br from-[#EEF2FF] to-[#E0E7FF] relative overflow-hidden items-center justify-center p-6 xl:p-8">
      
      <div class="absolute inset-0 opacity-40">
        <div class="absolute top-0 left-[20%] w-px h-full bg-linear-to-b from-transparent via-blue-300 to-transparent animate-rain"></div>
        <div class="absolute top-0 left-[60%] w-px h-full bg-linear-to-b from-transparent via-blue-300 to-transparent animate-rain delay-700"></div>
      </div>

      <div class="relative z-10 w-full max-w-md space-y-4">
        
        <!-- Main Revenue Card -->
        <div class="bg-white/40 backdrop-blur-xl border border-white/60 p-5 rounded-2xl shadow-2xl shadow-blue-900/10">
          
          <div class="flex justify-between items-start mb-4">
            <div>
              <p class="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">Today's Sales</p>
              <h2 class="text-2xl xl:text-3xl font-bold text-slate-900">$4,285.50</h2>
              <div class="flex items-center gap-1.5 mt-1.5">
                <div class="bg-emerald-100 px-1.5 py-0.5 rounded text-emerald-700 text-[10px] font-bold flex items-center gap-0.5">
                  <ArrowUpRight class="w-2.5 h-2.5" /> 12.5%
                </div>
                <span class="text-[10px] text-slate-500">vs yesterday</span>
              </div>
            </div>
            <div class="bg-white p-2 rounded-lg shadow-sm text-blue-600">
              <TrendingUp class="w-5 h-5" />
            </div>
          </div>

          <div class="relative h-28 w-full">
            <div class="absolute inset-0 flex flex-col justify-between opacity-10">
              <div class="w-full h-px bg-slate-900"></div>
              <div class="w-full h-px bg-slate-900"></div>
              <div class="w-full h-px bg-slate-900"></div>
            </div>
            
            <svg class="w-full h-full overflow-visible" viewBox="0 0 100 50" preserveAspectRatio="none">
              <path d="M0,50 L0,35 C20,35 30,10 50,20 S80,5 100,0 L100,50 Z" fill="url(#blueGradient)" opacity="0.2" />
              <path d="M0,35 C20,35 30,10 50,20 S80,5 100,0" fill="none" stroke="#2563EB" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke" class="animate-draw" />
              <defs>
                <linearGradient id="blueGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stop-color="#2563EB" stop-opacity="1" />
                  <stop offset="100%" stop-color="#2563EB" stop-opacity="0" />
                </linearGradient>
              </defs>
            </svg>

            <div class="absolute top-[0%] right-[0%] translate-x-1/2 -translate-y-1/2">
               <div class="w-3 h-3 bg-[#2563EB] rounded-full border-[3px] border-white shadow-lg"></div>
            </div>
          </div>

        </div>

        <!-- Stats Grid -->
        <div class="grid grid-cols-2 gap-3">
          
          <!-- Orders Today -->
          <div class="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-xl shadow-xl shadow-blue-900/10 animate-float">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center text-blue-600">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                </svg>
              </div>
            </div>
            <div class="text-xl font-bold text-slate-900">148</div>
            <div class="text-[10px] font-medium text-slate-500 mt-0.5">Orders Today</div>
          </div>

          <!-- Average Order -->
          <div class="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-xl shadow-xl shadow-blue-900/10 animate-float delay-200">
            <div class="flex items-center gap-2 mb-2">
              <div class="w-8 h-8 bg-emerald-100 rounded-lg flex items-center justify-center text-emerald-600">
                <DollarSign class="w-4 h-4" />
              </div>
            </div>
            <div class="text-xl font-bold text-slate-900">$28.95</div>
            <div class="text-[10px] font-medium text-slate-500 mt-0.5">Avg Order Value</div>
          </div>

          <!-- Top Item -->
          <div class="bg-white/40 backdrop-blur-xl border border-white/60 p-4 rounded-xl shadow-xl shadow-blue-900/10 animate-float delay-400 col-span-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2.5">
                <div class="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center text-amber-600">
                  <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
                  </svg>
                </div>
                <div>
                  <div class="text-[10px] font-medium text-slate-500">Top Selling Item</div>
                  <div class="text-xs font-bold text-slate-900 mt-0.5">Iced Latte</div>
                </div>
              </div>
              <div class="text-right">
                <div class="text-base font-bold text-slate-900">42</div>
                <div class="text-[9px] text-slate-500">sold today</div>
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>

  </div>
</template>

<style scoped>
/* Rain Animation */
@keyframes rain {
  0% { transform: translateY(-100%); }
  100% { transform: translateY(100%); }
}
.animate-rain { animation: rain 8s linear infinite; }

/* Float Animation */
@keyframes float {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}
.animate-float { animation: float 6s ease-in-out infinite; }
.delay-100 { animation-delay: 1s; }
.delay-200 { animation-delay: 2s; }
.delay-400 { animation-delay: 4s; }
.delay-700 { animation-delay: 3s; }

/* Draw Line Animation */
@keyframes draw {
  from { stroke-dashoffset: 1000; }
  to { stroke-dashoffset: 0; }
}
.animate-draw {
  stroke-dasharray: 1000;
  stroke-dashoffset: 0;
  animation: draw 2s ease-out forwards;
}

/* Safe Area Support */
.safe-area-inset {
  padding-left: max(1.5rem, env(safe-area-inset-left));
  padding-right: max(1.5rem, env(safe-area-inset-right));
  padding-top: max(2rem, env(safe-area-inset-top));
  padding-bottom: max(2rem, env(safe-area-inset-bottom));
}

@media (min-width: 768px) {
  .safe-area-inset {
    padding-left: max(2.5rem, env(safe-area-inset-left));
    padding-right: max(2.5rem, env(safe-area-inset-right));
  }
}

@media (min-width: 1024px) {
  .safe-area-inset {
    padding-left: max(3rem, env(safe-area-inset-left));
    padding-right: max(3rem, env(safe-area-inset-right));
  }
}

@media (min-width: 1280px) {
  .safe-area-inset {
    padding-left: max(4rem, env(safe-area-inset-left));
    padding-right: max(4rem, env(safe-area-inset-right));
  }
}
</style>