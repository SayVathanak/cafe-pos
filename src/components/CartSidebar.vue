<script setup>
import { useCartStore } from "../stores/cartStore";
import ReceiptPrint from "./ReceiptPrint.vue";
import { ref, nextTick } from "vue";
import { Trash2, Plus, Minus, Printer, X, ShoppingBag } from "lucide-vue-next";

const cartStore = useCartStore();
const lastOrder = ref(null);
const emit = defineEmits(["close-cart"]);

const handleCheckout = async () => {
  const order = await cartStore.checkout();
  if (order) {
    lastOrder.value = order;
    await nextTick();
    window.print(); // Triggers the browser print dialog
    // Close sidebar on mobile after printing
    emit("close-cart"); 
    setTimeout(() => { lastOrder.value = null; }, 5000);
  }
};
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white">
    
    <div class="px-6 py-5 border-b border-slate-100 flex items-center justify-between bg-white flex-shrink-0">
      <div class="flex items-center gap-3">
        <ShoppingBag class="w-5 h-5 text-black" />
        <h2 class="font-bold text-sm uppercase tracking-widest text-slate-900">Current Order</h2>
      </div>
      <button @click="$emit('close-cart')" class="lg:hidden p-2 -mr-2 text-slate-400 hover:text-black transition-colors">
        <X class="w-6 h-6" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto scrollbar-hide p-0">
      
      <div v-if="cartStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-slate-300 gap-3">
        <ShoppingBag class="w-12 h-12 opacity-20" />
        <p class="font-bold text-[10px] uppercase tracking-widest">Cart is empty</p>
      </div>

      <div v-else class="divide-y divide-slate-50">
        <div v-for="item in cartStore.items" :key="item.signature" class="p-5 hover:bg-slate-50 transition-colors group">
          <div class="flex justify-between items-start mb-2">
            <div>
              <div class="font-bold text-sm text-slate-900">{{ item.name }}</div>
              <div v-if="item.modifiers" class="flex flex-wrap gap-1 mt-1">
                <span v-if="item.modifiers.sugar !== 'Normal'" class="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {{ item.modifiers.sugar }} Sugar
                </span>
                <span v-if="item.modifiers.ice !== 'Normal'" class="text-[9px] font-bold uppercase text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                  {{ item.modifiers.ice }} Ice
                </span>
              </div>
            </div>
            <span class="text-sm font-bold font-mono text-slate-900">
              {{ (item.price * item.qty).toLocaleString() }}៛
            </span>
          </div>

          <div class="flex items-center justify-between mt-3">
            <div class="flex items-center gap-3 bg-slate-100 rounded-lg p-1">
              <button @click="cartStore.decreaseQty(item.id)" class="w-6 h-6 bg-white rounded flex items-center justify-center shadow-sm hover:scale-105 transition-transform active:scale-95">
                <Minus class="w-3 h-3 text-black" />
              </button>
              <span class="text-xs font-bold w-4 text-center">{{ item.qty }}</span>
              <button @click="cartStore.increaseQty(item.id)" class="w-6 h-6 bg-white rounded flex items-center justify-center shadow-sm hover:scale-105 transition-transform active:scale-95">
                <Plus class="w-3 h-3 text-black" />
              </button>
            </div>

            <button @click="cartStore.removeItem(item.id)" class="text-slate-300 hover:text-red-500 transition-colors p-1">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="p-6 border-t border-slate-100 bg-slate-50 z-20 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
      <div class="space-y-1 mb-6">
        <div class="flex justify-between text-xs font-medium text-slate-500 uppercase tracking-wide">
          <span>Subtotal</span>
          <span>{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
        <div class="flex justify-between items-end mt-2">
          <span class="font-bold text-sm text-slate-900 uppercase tracking-widest">Total Amount</span>
          <span class="font-black text-2xl text-slate-900 font-mono tracking-tight">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
      </div>

      <button 
        @click="handleCheckout"
        :disabled="cartStore.items.length === 0"
        class="w-full bg-black text-white py-4 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-95 flex items-center justify-center gap-2 shadow-lg shadow-black/10"
      >
        <Printer class="w-4 h-4" />
        <span>Checkout & Print</span>
      </button>
    </div>

  </div>
</template>
