<script setup>
import { Plus } from "lucide-vue-next";

defineProps({
  drink: Object,
});
</script>

<template>
  <div 
    class="group relative flex flex-col justify-between bg-white rounded-2xl border border-slate-200 shadow-sm transition-all duration-150 cursor-pointer overflow-hidden
    active:scale-[0.96] active:border-slate-400 select-none touch-manipulation h-full"
  >
    <div class="relative w-full aspect-4/3 bg-slate-100 overflow-hidden border-b border-slate-50">
      <img 
        v-if="drink.image_url" 
        :src="drink.image_url" 
        loading="lazy"
        class="w-full h-full object-cover"
      />
      <div v-else class="w-full h-full flex items-center justify-center bg-slate-100 text-slate-300">
        <svg xmlns="http://www.w3.org/2000/svg" class="w-10 h-10 opacity-40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
      </div>
      
      <div class="absolute top-2 left-2 px-2 py-0.5 bg-white/90 backdrop-blur text-[10px] font-medium uppercase tracking-wider text-slate-500 rounded-md border border-slate-200/50 shadow-sm">
        {{ drink.category }}
      </div>
    </div>

    <div class="p-3 flex flex-col flex-1 justify-between">
      <h3 class="font-medium text-slate-800 text-sm leading-snug line-clamp-2 mb-2">
        {{ drink.name }}
      </h3>

      <div class="flex items-center justify-between mt-auto">
        <span class="font-medium font-khmer text-slate-900 text-base">
          {{ drink.price.toLocaleString() }}៛
        </span>
        
        <div class="w-8 h-8 rounded-full bg-slate-900 flex items-center justify-center text-white shadow-md shadow-slate-900/10">
          <Plus class="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
</template>