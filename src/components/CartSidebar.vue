<script setup>
import { useCartStore } from "../stores/cartStore";
import ReceiptPrint from "./ReceiptPrint.vue";
import { ref, nextTick } from "vue";
import { Trash2, Plus, Minus, Printer, Loader2, X } from "lucide-vue-next";

const cartStore = useCartStore();
const lastOrder = ref(null);
const isProcessing = ref(false);
const emit = defineEmits(["close-cart"]);

const handleCheckout = async () => {
  if (cartStore.items.length === 0) return;
  
  isProcessing.value = true;

  // 1. Prepare data for Receipt immediately
  const tempOrder = {
    id: `ORD-${Math.floor(Math.random() * 10000)}`, // Temp ID for receipt
    created_at: new Date().toISOString(),
    drinks: [...cartStore.items], // Clone items
    total: cartStore.cartTotal
  }
  
  lastOrder.value = tempOrder;

  // 2. Clear Cart (Optimistic UI update)
  // We keep the items in 'tempOrder' for the database
  cartStore.clearCart(); 

  // 3. Wait for DOM update then Print
  await nextTick();
  setTimeout(() => {
    window.print();
    isProcessing.value = false;
    emit("close-cart");
  }, 500);

  // 4. Send to Supabase in Background (don't await this for the UI)
  await cartStore.checkout(tempOrder); 
};
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white">
    <div class="p-6 border-b border-slate-100 flex-none bg-white z-10 flex items-center justify-between">
      <div>
        <div class="font-medium text-xl tracking-tight text-slate-900">Current Order</div>
        <div class="text-xs font-mono text-slate-400 mt-1">
          ID: {{ Math.floor(Date.now() / 1000).toString().slice(-6) }}
        </div>
      </div>

      <button 
        @click="$emit('close-cart')" 
        class="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
      >
        <X class="w-6 h-6" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 scrollbar-hide">
      
      <div v-if="cartStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
        <div class="w-16 h-16 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center mb-4">
          <Plus class="w-6 h-6 text-slate-300" />
        </div>
        <p class="text-xs font-medium uppercase tracking-widest">Cart is Empty</p>
      </div>

      <TransitionGroup name="list" tag="div" class="space-y-4" v-else>
        <div v-for="item in cartStore.items" :key="item.signature" class="bg-white p-2 rounded-xl border border-slate-100 flex gap-3 shadow-sm">
          <div class="w-16 h-16 bg-slate-50 rounded-lg shrink-0 overflow-hidden relative border border-slate-100">
             <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/>
             <div v-else class="w-full h-full flex items-center justify-center text-xs text-slate-300 font-medium">IMG</div>
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div class="flex justify-between items-start gap-2">
               <span class="font-medium text-sm text-slate-900 truncate leading-tight">{{ item.name }}</span>
               <span class="font-medium text-sm font-khmer shrink-0">{{ (item.price * item.qty).toLocaleString() }}៛</span>
            </div>
            
            <div class="flex items-end justify-between mt-1">
               <div class="text-[10px] text-slate-500 font-medium leading-tight">
                 <span v-if="item.modifiers.sugar !== 'Normal'" class="block">Sugar: {{ item.modifiers.sugar }}</span>
                 <span v-if="item.modifiers.ice !== 'Normal'" class="block">Ice: {{ item.modifiers.ice }}</span>
               </div>
               
               <div class="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                  <button @click="cartStore.decreaseQty(item.id)" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 active:scale-95 transition-transform">
                    <Minus class="w-3 h-3" />
                  </button>
                  <span class="text-xs font-medium w-5 text-center tabular-nums">{{ item.qty }}</span>
                  <button @click="cartStore.increaseQty(item.id)" class="w-6 h-6 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 active:scale-95 transition-transform">
                    <Plus class="w-3 h-3" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="p-6 border-t border-slate-100 bg-slate-50">
      <div class="space-y-2 mb-6">
        <div class="flex justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
          <span>Subtotal</span>
          <span class="text-slate-900">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
        <div class="flex justify-between text-xs font-medium uppercase tracking-wider text-slate-500">
          <span>Tax (0%)</span>
          <span class="text-slate-900">0៛</span>
        </div>
        <div class="h-px bg-slate-200 my-2"></div>
        <div class="flex justify-between items-end">
          <span class="text-sm font-semibold uppercase tracking-widest text-slate-900">Total</span>
          <span class="text-2xl font-medium font-khmer text-slate-900">{{ cartStore.cartTotal.toLocaleString() }}៛</span>
        </div>
      </div>

      <button
        @click="handleCheckout"
        :disabled="cartStore.items.length === 0 || isProcessing"
        class="w-full bg-black text-white py-4 rounded-2xl font-medium text-sm uppercase tracking-widest shadow-xl shadow-black/10 hover:shadow-black/20 hover:-translate-y-0.5 active:translate-y-0 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
      >
        <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
        <span v-else>Charge & Print</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* List Transitions */
.list-enter-active,
.list-leave-active { transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1); }
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateX(30px); }

/* Scrollbar Hide */
.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; }
</style>