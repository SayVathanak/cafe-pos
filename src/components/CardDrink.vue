<template>
  <div class="bg-white border hover:border-black transition flex flex-col h-full">
    <div class="aspect-square bg-zinc-100 flex items-center justify-center">
      <img v-if="drink.image_url" :src="drink.image_url" class="w-full h-full object-cover" />
      <Coffee v-else class="w-10 h-10 text-zinc-300" />
    </div>

    <div class="p-3 sm:p-4 flex flex-col flex-1">
      <h3 class="text-sm font-medium mb-2 leading-tight">
        {{ drink.name }}
      </h3>

      <div class="mt-auto flex justify-between items-center">
        <span class="text-base sm:text-lg font-medium">
          {{ drink.price.toLocaleString() }}៛
        </span>

        <div class="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-100 flex items-center justify-center hover:bg-black hover:text-white">
          <Plus class="w-4 h-4" />
        </div>
      </div>
    </div>
  </div>
</template>