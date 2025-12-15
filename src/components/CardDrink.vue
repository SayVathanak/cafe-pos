<script setup>
import { Plus, Coffee } from 'lucide-vue-next'; 
defineProps({ drink: { type: Object, required: true } })
</script>

<template>
<div class="group relative bg-white rounded-3xl p-3 flex flex-col cursor-pointer">
  
  <div class="aspect-square rounded-2xl overflow-hidden bg-slate-50 relative">
    <img 
      v-if="drink?.image_url" 
      :src="drink.image_url" 
      class="w-full h-full object-cover"
      alt="Drink image"
    />
    <div v-else class="w-full h-full flex items-center justify-center">
      <Coffee class="text-slate-200 w-16 h-16 stroke-1" />
    </div>
    
    <div class="absolute top-3 left-3 rounded-full backdrop-blur-md px-2 py-0.5">
      <span class="text-xs font-khmer text-zinc-800">{{ drink?.price?.toLocaleString() }}៛</span>
    </div>
  </div>

  <div class="mt-4 px-1 pb-2 flex items-center justify-between">
    <div class="min-w-0">
      <div class="font-medium text-sm text-slate-900 pr-2">{{ drink?.name || 'Unnamed' }}</div>
      <p class="text-[10px] uppercase tracking-tighter text-slate-400 font-medium">{{ drink?.category }}</p>
    </div>
    
    <button class="flex-shrink-0 w-10 h-10 rounded-full border-none bg-black text-white flex items-center justify-center">
      <Plus class="w-5 h-5" />
    </button>
  </div>
</div>
</template>
