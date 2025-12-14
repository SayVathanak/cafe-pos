<script setup>
import { useCartStore } from '../stores/cartStore'
import ReceiptPrint from './ReceiptPrint.vue'
import { ref, nextTick } from 'vue'
import { Trash2, Plus, Minus, Printer } from 'lucide-vue-next'

const cartStore = useCartStore()
const lastOrder = ref(null)

const handleCheckout = async () => {
  const order = await cartStore.checkout()
  if (order) {
    lastOrder.value = order
    await nextTick()
    window.print()
    setTimeout(() => { lastOrder.value = null }, 10000)
  }
}
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white">
    
    <div class="p-6 border-b border-zinc-200 flex-none bg-zinc-50">
      <h2 class="font-bold text-xl tracking-tight text-black">CURRENT ORDER</h2>
      <div class="flex justify-between items-center mt-2 font-mono text-xs text-zinc-500">
        <span>TICKET #{{ Math.floor(Math.random() * 999) }}</span>
        <span>{{ new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-0 scrollbar-hide">
      
      <div v-if="cartStore.items.length === 0" class="h-64 flex flex-col items-center justify-center text-zinc-300">
        <div class="w-16 h-16 border border-dashed border-zinc-300 flex items-center justify-center mb-4">
           <span class="text-2xl font-light">+</span>
        </div>
        <p class="font-mono text-xs">NO ITEMS SELECTED</p>
      </div>

      <div 
        v-for="item in cartStore.items" 
        :key="item.signature" 
        class="group p-4 border-b border-zinc-100 hover:bg-zinc-50 transition-colors"
      >
        <div class="flex justify-between items-start mb-2">
          <span class="font-bold text-sm text-zinc-900 w-2/3">{{ item.name }}</span>
          <span class="font-mono text-sm text-black">{{ (item.price * item.qty).toLocaleString() }}</span>
        </div>
        
        <div v-if="item.modifiers" class="flex gap-2 mb-3">
           <span v-if="item.modifiers.sugar && item.modifiers.sugar !== 'Normal'" class="text-[10px] bg-zinc-100 px-1 font-mono text-zinc-600">
             SUGAR: {{ item.modifiers.sugar }}
           </span>
           <span v-if="item.modifiers.ice && item.modifiers.ice !== 'Normal'" class="text-[10px] bg-zinc-100 px-1 font-mono text-zinc-600">
             ICE: {{ item.modifiers.ice }}
           </span>
        </div>

        <div class="flex items-center gap-2">
          <div class="flex border border-zinc-200">
            <button @click="cartStore.decreaseQty(item.id)" class="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              <Minus class="w-3 h-3" />
            </button>
            <div class="w-8 h-8 flex items-center justify-center font-bold text-sm bg-white border-x border-zinc-200">
              {{ item.qty }}
            </div>
            <button @click="cartStore.increaseQty(item.id)" class="w-8 h-8 flex items-center justify-center hover:bg-black hover:text-white transition-colors">
              <Plus class="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 border-t border-zinc-200 bg-zinc-50 flex-none z-20">
      
      <div class="space-y-1 mb-6 font-mono text-xs text-zinc-500 uppercase">
        <div class="flex justify-between">
          <span>Subtotal</span>
          <span>{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
        <div class="flex justify-between">
          <span>Taxes</span>
          <span>Included</span>
        </div>
      </div>

      <div class="flex justify-between items-end mb-4">
        <span class="font-bold text-sm text-zinc-400 uppercase tracking-widest">Total</span>
        <span class="font-bold text-3xl text-black tracking-tighter">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
      </div>
      
      <button 
        @click="handleCheckout" 
        :disabled="cartStore.items.length === 0"
        class="w-full bg-black text-white py-4 font-bold tracking-widest hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
      >
        <Printer class="w-4 h-4" />
        <span>PRINT RECEIPT</span>
      </button>
    </div>

  </div>
</template>