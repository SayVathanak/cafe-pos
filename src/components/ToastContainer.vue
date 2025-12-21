<script setup>
import { useToastStore } from '../stores/toastStore';
import { X, CheckCircle, AlertCircle } from 'lucide-vue-next';

const toastStore = useToastStore();
</script>

<template>
  <div class="fixed bottom-6 right-6 z-150 flex flex-col gap-2 pointer-events-none">
    <transition-group name="toast">
      <div 
        v-for="toast in toastStore.toasts" 
        :key="toast.id"
        class="pointer-events-auto flex items-center gap-3 px-4 py-3 rounded-xl shadow-xl border min-w-75 animate-in slide-in-from-bottom-5 fade-in duration-300"
        :class="toast.type === 'error' ? 'bg-red-50 border-red-100 text-red-800' : 'bg-slate-900 text-white border-slate-800'"
      >
        <AlertCircle v-if="toast.type === 'error'" class="w-5 h-5 text-red-500" />
        <CheckCircle v-else class="w-5 h-5 text-green-400" />
        
        <p class="text-xs font-bold flex-1">{{ toast.message }}</p>
        
        <button @click="toastStore.removeToast(toast.id)" class="opacity-50 hover:opacity-100">
          <X class="w-4 h-4" />
        </button>
      </div>
    </transition-group>
  </div>
</template>

<style scoped>
.toast-enter-active, .toast-leave-active { transition: all 0.3s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(20px); }
</style>