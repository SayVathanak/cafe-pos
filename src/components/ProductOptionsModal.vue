<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { X } from 'lucide-vue-next'; 

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
    document.body.style.overflow = 'hidden'
  } else {
    document.body.style.overflow = ''
  }
})

/* ---------------- KEYBOARD HANDLING ---------------- */
const handleEscape = (e) => {
  if (e.key === 'Escape' && props.isOpen) {
    emit('close')
  }
}

watch(() => props.isOpen, (open) => {
  if (open) {
    window.addEventListener('keydown', handleEscape)
  } else {
    window.removeEventListener('keydown', handleEscape)
  }
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleEscape)
  document.body.style.overflow = ''
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
  <transition name="modal">
    <div 
      v-if="isOpen" 
      class="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
    >
      <div 
        class="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" 
        @click="$emit('close')"
      ></div>
      
      <div 
        class="relative bg-white w-full sm:max-w-md rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all"
        @click.stop
      >
        <div class="p-8 pb-4 flex justify-between items-start">
          <div>
            <span class="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Customize</span>
            <div class="text-xl font-semibold text-slate-900 leading-tight pt-4">{{ drinkName }}</div>
          </div>
          <button @click="$emit('close')" class="border-none bg-white p-2 cursor-pointer">
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="px-8 py-4 space-y-8 max-h-[50vh] overflow-y-auto">

          <div class="p-4 rounded-xl">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Sugar Level
            </h3>
            <div class="grid grid-cols-5 gap-2">
              <button
                v-for="opt in sugarOptions"
                :key="opt"
                @click="sugarLevel = opt"
                class="py-2.5 text-xs font-bold rounded-xl border-none"
                :class="sugarLevel === opt
                  ? 'bg-black  text-white '
                  : 'bg-white  text-slate-600 '"
              >
                {{ opt }}
              </button>
            </div>
          </div>

          <div class="p-4 rounded-xl">
            <h3 class="text-xs font-bold uppercase tracking-widest text-slate-500 mb-4">
              Ice Level
            </h3>
            <div class="grid grid-cols-4 gap-2">
              <button
                v-for="opt in iceOptions"
                :key="opt"
                @click="iceLevel = opt"
                class="py-2.5 text-xs font-bold rounded-xl border-none"
                :class="iceLevel === opt
                  ? 'bg-black text-white '
                  : 'bg-white text-slate-600 '"
              >
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <div class="p-8 pt-4">
          <button
            @click="handleAdd"
            :disabled="!drink"
            class="w-full bg-black border-none text-white py-4 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-center gap-3 disabled:opacity-40"
          >
            <span>Confirm Order</span>
            <span class="opacity-40 text-xs">—</span>
            <span class="font-khmer">{{ drinkPrice }}</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
/* Mobile slide-up/Desktop fade-in transition */
.modal-enter-active, .modal-leave-active { 
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1); 
}

/* Mobile slide-up from bottom */
.modal-enter-from, .modal-leave-to { 
  opacity: 0; 
  transform: translateY(100%); 
}

/* Override for desktop/tablet to just fade in */
@media (min-width: 640px) {
  .modal-enter-from, .modal-leave-to { 
    opacity: 0; 
    transform: translateY(0); 
  }
}
</style>