<script setup>
import { ref, watch } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  drink: Object
})

const emit = defineEmits(['close', 'add-to-cart'])

const sugarLevel = ref('Normal')
const iceLevel = ref('Normal')

const sugarOptions = ['0%', '25%', '50%', 'Normal', 'Sweet']
const iceOptions = ['No Ice', 'Less Ice', 'Normal', 'Extra Ice']

watch(() => props.isOpen, (open) => {
  if (open) {
    sugarLevel.value = 'Normal'
    iceLevel.value = 'Normal'
  }
})

const handleAdd = () => {
  emit('add-to-cart', {
    ...props.drink,
    modifiers: {
      sugar: sugarLevel.value,
      ice: iceLevel.value
    }
  })
  emit('close')
}
</script>

<template>
  <transition name="fade">
    <div
      v-if="isOpen"
      class="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60"
    >
      <!-- MODAL -->
      <div
        class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl shadow-2xl
               flex flex-col max-h-[90vh]"
      >
        <!-- HEADER -->
        <div class="px-6 pt-6 pb-4 border-b">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-bold tracking-tight">
                {{ drink?.name }}
              </h2>
              <p class="text-2xl font-bold text-black mt-1">
                {{ drink?.price?.toLocaleString() }}៛
              </p>
            </div>

            <button
              @click="$emit('close')"
              class="w-9 h-9 rounded-full bg-zinc-100 flex items-center justify-center
                     hover:bg-zinc-200 text-zinc-500"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- OPTIONS -->
        <div class="flex-1 overflow-y-auto px-6 py-6 space-y-8">
          
          <!-- SUGAR -->
          <div>
            <h3 class="text-xs font-bold uppercase text-zinc-500 mb-3">
              Sugar Level
            </h3>

            <div class="grid grid-cols-3 gap-3">
              <button
                v-for="opt in sugarOptions"
                :key="opt"
                @click="sugarLevel = opt"
                class="py-3 rounded-xl text-sm font-bold border transition"
                :class="sugarLevel === opt
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-black'"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <!-- ICE -->
          <div>
            <h3 class="text-xs font-bold uppercase text-zinc-500 mb-3">
              Ice Level
            </h3>

            <div class="grid grid-cols-2 gap-3">
              <button
                v-for="opt in iceOptions"
                :key="opt"
                @click="iceLevel = opt"
                class="py-3 rounded-xl text-sm font-bold border transition"
                :class="iceLevel === opt
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-black'"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <!-- FOOTER ACTION -->
        <div
          class="px-6 py-4 border-t bg-white
                 sticky bottom-0 safe-bottom"
        >
          <button
            @click="handleAdd"
            class="w-full bg-black text-white py-4 rounded-2xl
                   font-bold tracking-wide text-sm
                   hover:bg-zinc-800 transition"
          >
            ADD TO CART
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.safe-bottom {
  padding-bottom: env(safe-area-inset-bottom);
}
</style>