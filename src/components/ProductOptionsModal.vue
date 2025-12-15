<script setup>
import { ref, watch, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  drink: Object
})

const emit = defineEmits(['close', 'add-to-cart'])

/* ---------------- OPTIONS ---------------- */
const sugarLevel = ref('Normal')
const iceLevel = ref('Normal')

const sugarOptions = ['0%', '25%', '50%', 'Normal', 'Sweet']
const iceOptions = ['No Ice', 'Less Ice', 'Normal', 'Extra Ice']

/* ---------------- RESET WHEN OPEN ---------------- */
watch(() => props.isOpen, (open) => {
  if (open) {
    sugarLevel.value = 'Normal'
    iceLevel.value = 'Normal'
  }
})

/* ---------------- SAFE DISPLAY ---------------- */
const drinkName = computed(() => props.drink?.name || 'Loading…')
const drinkPrice = computed(() =>
  props.drink?.price ? props.drink.price.toLocaleString() + '៛' : ''
)

/* ---------------- ADD TO CART ---------------- */
const handleAdd = () => {
  if (!props.drink) return

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
        class="bg-white w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl
               shadow-2xl max-h-[90vh] flex flex-col"
      >
        <!-- HEADER -->
        <div class="px-6 pt-6 pb-4 border-b">
          <div class="flex justify-between items-start">
            <div>
              <h2 class="text-xl font-bold tracking-tight">
                {{ drinkName }}
              </h2>
              <p class="text-2xl font-bold text-black mt-1">
                {{ drinkPrice }}
              </p>
            </div>

            <button
              @click="$emit('close')"
              class="w-9 h-9 rounded-full bg-zinc-100
                     flex items-center justify-center
                     hover:bg-zinc-200 text-zinc-500"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- BODY -->
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
                class="py-3 rounded-xl font-bold text-sm border transition"
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
                class="py-3 rounded-xl font-bold text-sm border transition"
                :class="iceLevel === opt
                  ? 'bg-black text-white border-black'
                  : 'bg-white text-zinc-600 border-zinc-200 hover:border-black'"
              >
                {{ opt }}
              </button>
            </div>
          </div>

        </div>

        <!-- FOOTER -->
        <div class="px-6 py-4 border-t bg-white safe-bottom">
          <button
            @click="handleAdd"
            :disabled="!drink"
            class="w-full bg-black text-white py-4 rounded-2xl
                   font-bold tracking-wide
                   hover:bg-zinc-800 disabled:opacity-50"
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
