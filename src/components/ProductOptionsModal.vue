<script setup>
import { ref, watch, computed, onUnmounted } from 'vue'
import { X, Check } from 'lucide-vue-next'; 

const props = defineProps({ isOpen: Boolean, drink: Object })
const emit = defineEmits(['close', 'add-to-cart'])

const sugarLevel = ref('Normal')
const iceLevel = ref('Normal')
const sugarOptions = ['0%', '25%', '50%', 'Normal', 'Sweet']
const iceOptions = ['No Ice', 'Less Ice', 'Normal', 'Extra Ice']

watch(() => props.isOpen, (open) => {
  if (open) {
    sugarLevel.value = 'Normal'; iceLevel.value = 'Normal'
    document.body.style.overflow = 'hidden'
  } else { document.body.style.overflow = '' }
})

const handleAdd = () => {
  emit('add-to-cart', {
    ...props.drink,
    modifiers: { sugar: sugarLevel.value, ice: iceLevel.value }
  })
  emit('close')
}
</script>

<template>
  <transition name="modal">
    <div v-if="isOpen" class="fixed inset-0 z-100 flex items-end sm:items-center justify-center p-0 sm:p-4">
      
      <div class="absolute inset-0 bg-black/60 transition-opacity" @click="$emit('close')"></div>
      
      <div class="relative bg-white w-full sm:max-w-md rounded-t-4xl sm:rounded-4xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        
        <div class="p-8 pb-4 flex justify-between items-start bg-white z-10">
          <div>
            <span class="text-[10px] font-medium uppercase tracking-[0.2em] text-slate-400">Customize</span>
            <div class="text-2xl font-semibold text-slate-900 leading-tight pt-2">{{ drink?.name }}</div>
          </div>
          <button @click="$emit('close')" class="bg-slate-100 p-2 rounded-full hover:bg-slate-200 transition-colors">
            <X class="w-5 h-5 text-slate-600" />
          </button>
        </div>

        <div class="px-8 py-2 space-y-8 overflow-y-auto pb-32">
          
          <div>
            <h3 class="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Sugar Level</h3>
            <div class="flex flex-wrap gap-2">
              <button v-for="opt in sugarOptions" :key="opt" @click="sugarLevel = opt"
                class="px-4 py-3 text-xs font-medium rounded-2xl border transition-all duration-200"
                :class="sugarLevel === opt ? 'bg-black text-white border-black shadow-lg shadow-black/20 scale-105' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'">
                {{ opt }}
              </button>
            </div>
          </div>

          <div>
            <h3 class="text-xs font-medium uppercase tracking-widest text-slate-400 mb-4">Ice Level</h3>
            <div class="grid grid-cols-2 gap-2">
              <button v-for="opt in iceOptions" :key="opt" @click="iceLevel = opt"
                class="py-3 text-xs font-medium rounded-2xl border transition-all duration-200 flex items-center justify-center gap-2"
                :class="iceLevel === opt ? 'bg-black text-white border-black shadow-lg shadow-black/20' : 'bg-white text-slate-600 border-slate-200'">
                <span v-if="iceLevel === opt"><Check class="w-3 h-3" /></span>
                {{ opt }}
              </button>
            </div>
          </div>
        </div>

        <div class="absolute bottom-0 left-0 right-0 p-6 bg-white border-t border-slate-50">
          <button @click="handleAdd" class="w-full bg-black text-white py-4 rounded-2xl text-sm uppercase tracking-widest flex items-center justify-between px-8 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-black/20">
            <span class="font-semibold">Add to Order</span>
            <span>{{ drink?.price?.toLocaleString() }}៛</span>
          </button>
        </div>
      </div>
    </div>
  </transition>
</template>

<style scoped>
.modal-enter-active, .modal-leave-active { transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1); }
.modal-enter-from, .modal-leave-to { opacity: 0; transform: translateY(20px) scale(0.96); }
</style>