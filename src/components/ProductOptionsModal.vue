<script setup>
import { ref, computed } from 'vue'

const props = defineProps({
  isOpen: Boolean,
  drink: Object
})

const emit = defineEmits(['close', 'add-to-cart'])

// Default Options
const sugarLevel = ref('Normal')
const iceLevel = ref('Normal')

const sugarOptions = ['0%', '25%', '50%', 'Normal', 'Sweet']
const iceOptions = ['No Ice', 'Less Ice', 'Normal', 'Extra Ice']

// Reset defaults when opening a new drink
const resetOptions = () => {
  sugarLevel.value = 'Normal'
  iceLevel.value = 'Normal'
}

const handleAdd = () => {
  // Send the chosen options back to the parent
  emit('add-to-cart', {
    ...props.drink,
    modifiers: {
      sugar: sugarLevel.value,
      ice: iceLevel.value
    }
  })
  resetOptions()
  emit('close')
}
</script>

<template>
  <div v-if="isOpen" class="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
    
    <div class="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
      
      <div class="p-5 bg-gray-50 border-b flex justify-between items-center">
        <div>
           <h2 class="text-xl font-bold text-gray-800">{{ drink?.name }}</h2>
           <p class="text-indigo-600 font-bold text-lg">{{ drink?.price?.toLocaleString() }}៛</p>
        </div>
        <button @click="$emit('close')" class="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
      </div>

      <div class="p-6 space-y-6 overflow-y-auto">
        
        <div>
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Sugar Level</h3>
          <div class="grid grid-cols-3 gap-2">
            <button 
              v-for="opt in sugarOptions" 
              :key="opt"
              @click="sugarLevel = opt"
              class="py-2 px-1 rounded-lg border text-sm font-medium transition-all"
              :class="sugarLevel === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-600 hover:bg-gray-50'"
            >
              {{ opt }}
            </button>
          </div>
        </div>

        <div>
          <h3 class="text-sm font-bold text-gray-500 uppercase mb-3">Ice Level</h3>
          <div class="grid grid-cols-2 gap-2">
             <button 
              v-for="opt in iceOptions" 
              :key="opt"
              @click="iceLevel = opt"
              class="py-2 px-1 rounded-lg border text-sm font-medium transition-all"
              :class="iceLevel === opt ? 'bg-indigo-600 text-white border-indigo-600 shadow' : 'bg-white text-gray-600 hover:bg-gray-50'"
            >
              {{ opt }}
            </button>
          </div>
        </div>

      </div>

      <div class="p-5 border-t bg-gray-50 flex gap-3">
        <button @click="$emit('close')" class="flex-1 py-3 text-gray-600 font-bold rounded-xl hover:bg-gray-200">
          Cancel
        </button>
        <button @click="handleAdd" class="flex-1 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow hover:bg-indigo-700">
          Add to Cart
        </button>
      </div>

    </div>
  </div>
</template>