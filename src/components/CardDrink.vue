<script setup>
defineProps({
  drink: {
    type: Object,
    required: true
  }
})
</script>

<template>
<div class="group cursor-pointer ...">
  <div class="aspect-square ...">
    <img 
      v-if="drink?.image_url" 
      :src="drink.image_url" 
      class="w-full h-full object-cover"
    />
    <Coffee v-else class="text-zinc-300 w-12 h-12 stroke-1" />
  </div>

  <div class="p-4 flex flex-col flex-1">
    <div class="text-sm font-medium ...">
      {{ drink?.name || 'Unnamed Drink' }}
    </div>
    
    <div class="mt-auto ...">
      <span class="text-lg font-medium text-black tracking-tight">
        {{ drink?.price?.toLocaleString() || '0' }}៛
      </span>
      <div class="w-6 h-6 ...">
        <Plus class="w-4 h-4" />
      </div>
    </div>
  </div>
</div>
</template>
