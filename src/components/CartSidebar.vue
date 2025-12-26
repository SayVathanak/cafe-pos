<script setup>
import { useCartStore } from "../stores/cartStore";
import ReceiptPrint from "./ReceiptPrint.vue";
import { ref, nextTick, computed, onMounted } from "vue";
import { usePlanLimits } from "../composables/usePlanLimits"; 
import { Trash2, Plus, Minus, Printer, Loader2, X, Banknote, QrCode, CreditCard, Lock, AlertTriangle } from "lucide-vue-next"; 

const cartStore = useCartStore();
const lastOrder = ref(null);
const isProcessing = ref(false);
const emit = defineEmits(["close-cart"]);

// --- LIMITS LOGIC ---
const { checkLimit, fetchUsage, usage, limits } = usePlanLimits(); 

// Configuration
const EXCHANGE_RATE = 4100; 

// Payment Method State
const paymentMethod = ref('Cash');
const paymentMethods = [
  { id: 'Cash', label: 'Cash', icon: Banknote },
  { id: 'ABA', label: 'ABA', icon: QrCode },
  { id: 'ACLEDA', label: 'ACLEDA', icon: CreditCard },
];

const usdTotal = computed(() => {
  return (cartStore.cartTotal / EXCHANGE_RATE).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });
});

// --- STRICT COMPLIANCE CHECK ---
// This calculates if the user is violating ANY hard limit
const complianceError = computed(() => {
  // 1. Check Menu Items
  // If limit is not infinite AND current usage > limit
  if (limits.value.max_items !== Infinity && limits.value.max_items !== null && usage.value.items > limits.value.max_items) {
    return `Menu limit exceeded (${usage.value.items}/${limits.value.max_items}). Archive items to proceed.`;
  }
  
  // 2. Check Branches
  if (limits.value.max_branches !== Infinity && limits.value.max_branches !== null && usage.value.branches > limits.value.max_branches) {
    return `Store limit exceeded (${usage.value.branches}/${limits.value.max_branches}). Remove stores to proceed.`;
  }

  // 3. Check Monthly Orders (Soft Limit or Hard Limit depending on your preference)
  // Usually this is a hard limit too
  if (!checkLimit('create_order')) {
    return `Monthly order limit reached (${usage.value.orders_month}/${limits.value.max_orders}). Upgrade plan.`;
  }

  return null; // No errors = Good to sell
});

const handleCheckout = async () => {
  if (cartStore.items.length === 0) return;

  // BLOCK TRANSACTION IF COMPLIANCE ERROR EXISTS
  if (complianceError.value) {
     alert(`🚨 CANNOT PROCESS ORDER\n\n${complianceError.value}`);
     return; 
  }
  
  isProcessing.value = true;

  // 2. Prepare data for Receipt
  const tempOrder = {
    id: `ORD-${Math.floor(Math.random() * 10000)}`,
    created_at: new Date().toISOString(),
    drinks: [...cartStore.items],
    total: cartStore.cartTotal,
    payment_method: paymentMethod.value 
  }
  
  lastOrder.value = tempOrder;

  // 3. Clear Cart
  cartStore.clearCart(); 

  // 4. Print
  await nextTick();
  setTimeout(() => {
    window.print();
    isProcessing.value = false;
    emit("close-cart");
  }, 500);

  // 5. Send to Supabase
  await cartStore.checkout(tempOrder); 
  
  // 6. Refresh limits so the counter updates immediately
  fetchUsage();
};

// Refresh limits when sidebar is mounted/opened
onMounted(() => {
  fetchUsage();
});
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white">
    <div class="px-5 py-4 border-b border-slate-100 flex-none bg-white z-10 flex items-center justify-between">
      <div>
        <div class="font-bold text-lg text-slate-900">Current Order</div>
        <div class="text-[10px] font-mono text-slate-400">
          #{{ Math.floor(Date.now() / 1000).toString().slice(-6) }}
        </div>
      </div>

      <button 
        @click="$emit('close-cart')" 
        class="lg:hidden p-2 -mr-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors"
      >
        <X class="w-5 h-5" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-3 scrollbar-hide">
      
      <div v-if="cartStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
        <div class="w-12 h-12 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center mb-3">
          <Plus class="w-5 h-5 text-slate-300" />
        </div>
        <p class="text-[10px] font-bold uppercase tracking-widest">Cart is Empty</p>
      </div>

      <TransitionGroup name="list" tag="div" class="space-y-3" v-else>
        <div v-for="item in cartStore.items" :key="item.signature" class="bg-white p-2 rounded-xl border border-slate-100 flex gap-3 shadow-sm">
          <div class="w-12 h-12 bg-slate-50 rounded-lg shrink-0 overflow-hidden relative border border-slate-100">
             <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover"/>
             <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-bold">IMG</div>
          </div>
          
          <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div class="flex justify-between items-start gap-2">
               <span class="font-medium text-xs text-slate-900 truncate leading-tight">{{ item.name }}</span>
               <span class="font-semibold text-xs  shrink-0">{{ (item.price * item.qty).toLocaleString() }}៛</span>
            </div>
            
            <div class="flex items-end justify-between mt-1">
               <div class="text-[9px] text-slate-500 font-medium leading-tight space-y-0.5">
                 <span v-if="item.modifiers.sugar !== 'Normal'" class="block">Sug: {{ item.modifiers.sugar }}</span>
                 <span v-if="item.modifiers.ice !== 'Normal'" class="block">Ice: {{ item.modifiers.ice }}</span>
               </div>
               
               <div class="flex items-center gap-1 bg-slate-50 rounded-md p-0.5 border border-slate-100">
                  <button @click="cartStore.decreaseQty(item.id)" class="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200 active:scale-90 transition-transform">
                    <Minus class="w-2.5 h-2.5" />
                  </button>
                  <span class="text-[10px] font-bold w-4 text-center tabular-nums">{{ item.qty }}</span>
                  <button @click="cartStore.increaseQty(item.id)" class="w-5 h-5 flex items-center justify-center bg-white rounded shadow-sm border border-slate-200 active:scale-90 transition-transform">
                    <Plus class="w-2.5 h-2.5" />
                  </button>
               </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="p-4 border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm">
      
      <div class="mb-4">
        <label class="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2 block">Payment</label>
        <div class="grid grid-cols-3 gap-2">
          <button 
            v-for="method in paymentMethods" 
            :key="method.id"
            @click="paymentMethod = method.id"
            class="flex items-center justify-center gap-2 py-2 px-1 rounded-lg border transition-all duration-200"
            :class="paymentMethod === method.id 
              ? 'bg-slate-900 text-white border-slate-900 shadow-md transform scale-[1.02]' 
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'"
          >
            <component :is="method.icon" class="w-3.5 h-3.5" />
            <span class="text-[10px] font-bold">{{ method.label }}</span>
          </button>
        </div>
      </div>

      <div class="flex items-end justify-between mb-4">
        <div class="text-xs text-slate-500 font-medium">Total Amount</div>
        <div class="text-right">
            <div class="text-xl font-semibold  text-slate-900 leading-none">
              {{ cartStore.cartTotal.toLocaleString() }}៛
            </div>
            <div class="text-[10px] font-medium text-slate-400 mt-1">
              {{ usdTotal }}
            </div>
        </div>
      </div>

      <button
        @click="handleCheckout"
        :disabled="cartStore.items.length === 0 || isProcessing || !!complianceError"
        :class="(!complianceError && checkLimit('create_order')) ? 'bg-black hover:shadow-black/20' : 'bg-red-500 cursor-not-allowed'"
        class="w-full text-white py-3.5 rounded-xl font-bold text-xs uppercase tracking-widest shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:transform-none"
      >
        <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
        
        <AlertTriangle v-else-if="complianceError" class="w-4 h-4" />
        
        <Lock v-else-if="!checkLimit('create_order')" class="w-4 h-4" />
        <span v-else>Charge ({{ paymentMethod }})</span>
      </button>

      <div v-if="complianceError" class="mt-3 bg-red-50 border border-red-100 rounded-lg p-2 flex items-start gap-2">
         <AlertTriangle class="w-3.5 h-3.5 text-red-600 shrink-0 mt-0.5" />
         <p class="text-[10px] font-medium text-red-600 leading-tight text-left">
           {{ complianceError }}
         </p>
      </div>
      
      <div v-else-if="limits.max_orders < 999999" class="text-center mt-2">
         <p class="text-[9px] font-medium" :class="usage.orders_month >= limits.max_orders ? 'text-red-500' : 'text-slate-400'">
            {{ usage.orders_month }} / {{ limits.max_orders }} orders used this month
         </p>
      </div>

    </div>
  </div>
</template>

<style scoped>
.list-enter-active,
.list-leave-active { transition: all 0.3s cubic-bezier(0.25, 1, 0.5, 1); }
.list-enter-from,
.list-leave-to { opacity: 0; transform: translateX(30px); }

.scrollbar-hide::-webkit-scrollbar { display: none; }
.scrollbar-hide { scrollbar-width: none; }
</style>