<script setup>
import { Coffee, Plus } from 'lucide-vue-next'

defineProps({
  drink: Object
})
</script>

<template>
  <div class="group cursor-pointer bg-white border border-zinc-200 hover:border-black transition-colors duration-200 h-full flex flex-col relative">
    
    <div class="aspect-square bg-zinc-100 relative overflow-hidden flex items-center justify-center border-b border-zinc-100">
      
      <img 
        v-if="drink.image_url" 
        :src="drink.image_url" 
        class="w-full h-full object-cover"
      />
      
      <Coffee v-else class="text-zinc-300 w-12 h-12 stroke-1" />
      
    </div>

    <div class="p-4 flex flex-col flex-1">
      <h3 class="font-medium text-zinc-900 text-sm leading-tight mb-1 group-hover:underline decoration-1 underline-offset-2">
        {{ drink.name }}
      </h3>
      
      <div class="mt-auto pt-3 flex items-end justify-between">
        <span class="text-lg font-medium text-black tracking-tight">
          {{ drink.price.toLocaleString() }}៛
        </span>
        
        <div class="w-6 h-6 bg-zinc-100 flex items-center justify-center text-zinc-500 group-hover:bg-black group-hover:text-white transition-colors">
          <Plus class="w-4 h-4" />
        </div>
      </div>
    </div>

  </div>
</template>