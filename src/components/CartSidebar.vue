<script setup>
import { useCartStore } from "../stores/cartStore";
import ReceiptPrint from "./ReceiptPrint.vue";
import { ref, nextTick, computed, onMounted } from "vue";
import { usePlanLimits } from "../composables/usePlanLimits";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";
import {
  Trash2,
  Plus,
  Minus,
  Loader2,
  X,
  Banknote,
  QrCode,
  CreditCard,
  CheckCircle2,
  Coffee,
  Receipt,
  AlertCircle,
  ArrowLeft,
  AlertTriangle
} from "lucide-vue-next";

const cartStore = useCartStore();
const userStore = useUserStore();
const lastOrder = ref(null);
const isProcessing = ref(false);
const showConfirmation = ref(false);
const nextOrderId = ref("...");
const emit = defineEmits(["close-cart"]);

// --- DELETE CONFIRMATION STATE ---
const itemToDelete = ref(null); // Stores ID of item pending deletion

// --- LIMITS ---
const { checkLimit, fetchUsage, usage, limits } = usePlanLimits();

// Config
const EXCHANGE_RATE = 4000;
const paymentMethod = ref("Cash");

const paymentMethods = [
  { id: "Cash", label: "Cash", icon: Banknote },
  { id: "ABA", label: "ABA", icon: QrCode },
  { id: "ACLEDA", label: "ACLEDA", icon: CreditCard },
];

const usdTotal = computed(() =>
  (cartStore.cartTotal / EXCHANGE_RATE).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
  })
);

// --- LOGIC ---
const complianceError = computed(() => {
  if (
    limits.value.max_items !== Infinity &&
    limits.value.max_items !== null &&
    usage.value.items > limits.value.max_items
  )
    return `Menu limit exceeded.`;
  if (!checkLimit("create_order")) return `Monthly order limit reached.`;
  return null;
});

const fetchNextId = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("orders")
    .select("order_number")
    .eq("organization_id", userStore.organizationId)
    .eq("store_id", userStore.storeId)
    .gte("created_at", today.toISOString())
    .order("order_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  let nextNum = 1;
  if (data && data.order_number) nextNum = data.order_number + 1;

  const loopNum = ((nextNum - 1) % 100) + 1;
  nextOrderId.value = `#${loopNum.toString().padStart(3, "0")}`;
};

const initiateCharge = () => {
  if (cartStore.items.length === 0) return;
  if (complianceError.value) {
    alert(`🚨 ${complianceError.value}`);
    return;
  }
  showConfirmation.value = true;
};

const cancelCharge = () => {
  showConfirmation.value = false;
};

// --- DELETE LOGIC ---
const promptDelete = (itemId) => {
  itemToDelete.value = itemId;
};

const cancelDelete = () => {
  itemToDelete.value = null;
};

const confirmDelete = () => {
  if (itemToDelete.value) {
    if (cartStore.removeItem) {
      cartStore.removeItem(itemToDelete.value);
    } else {
      const index = cartStore.items.findIndex(i => i.id === itemToDelete.value);
      if (index > -1) cartStore.items.splice(index, 1);
    }
    itemToDelete.value = null;
  }
};

const confirmCheckout = async () => {
  isProcessing.value = true;

  const orderPayload = {
    drinks: [...cartStore.items],
    total_amount: cartStore.cartTotal,
    payment_method: paymentMethod.value,
    organization_id: userStore.organizationId,
    store_id: userStore.storeId,
    status: "completed",
  };

  const { data, error } = await supabase
    .from("orders")
    .insert(orderPayload)
    .select()
    .single();

  if (error) {
    alert("Error saving order: " + error.message);
    isProcessing.value = false;
    showConfirmation.value = false;
    return;
  }

  lastOrder.value = data;

  await nextTick();
  setTimeout(() => {
    window.print();
    cartStore.clearCart();
    isProcessing.value = false;
    showConfirmation.value = false;
    emit("close-cart");
    fetchUsage();
    fetchNextId();
  }, 500);
};

onMounted(() => {
  fetchUsage();
  fetchNextId();
});
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white relative overflow-hidden">

    <div
      class="px-4 py-3 bg-white border-b border-dashed border-slate-300 flex-none z-20 flex items-center justify-between">
      <div class="flex items-center gap-2">
        <!-- <div class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white">
          <Coffee class="w-4 h-4" />
        </div> -->
        <div>
          <div class="font-bold text-md text-slate-900 leading-none uppercase tracking-wider">Current Order</div>
          <div class="text-[10px] font-mono text-slate-400 mt-1">Order : <span class="text-slate-900 font-bold">{{
            nextOrderId }}</span></div>
        </div>
      </div>

      <div class="flex items-center gap-1">
        <button v-if="cartStore.items.length > 0" @click="cartStore.clearCart()"
          class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Clear Cart">
          <Trash2 class="w-4 h-4" />
        </button>
        <button @click="$emit('close-cart')" class="lg:hidden p-2 bg-slate-100 rounded-lg active:bg-slate-200">
          <X class="w-4 h-4 text-slate-600" />
        </button>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-4 scrollbar-hide relative z-0">

      <div v-if="cartStore.items.length === 0" class="h-full flex flex-col items-center justify-center text-slate-300">
        <div class="w-12 h-12 border-2 border-dashed border-slate-200 rounded-lg flex items-center justify-center mb-2">
          <Plus class="w-5 h-5 text-slate-300" />
        </div>
        <p class="text-[10px] font-bold uppercase tracking-widest opacity-60">No Items</p>
      </div>

      <TransitionGroup name="list" tag="div" class="space-y-0" v-else>
        <div v-for="item in cartStore.items" :key="item.signature"
          class="group py-3 border-b border-dashed border-slate-200 flex items-start gap-2">

          <div class="flex-1 min-w-0 flex flex-col justify-center pt-0.5">
            <div class="flex items-baseline justify-between gap-2 pr-2">
              <span class="font-semibold text-sm text-slate-900 truncate">{{ item.name }}</span>
            </div>

            <div class="text-[10px] font-mono text-slate-400 mt-0.5">
              {{ item.qty }} x {{ item.price.toLocaleString() }} = <span class="font-bold text-slate-900">{{ (item.price
                * item.qty).toLocaleString() }}៛</span>
            </div>

            <div class="flex flex-wrap gap-1 mt-1.5"
              v-if="item.modifiers.sugar !== 'Normal' || item.modifiers.ice !== 'Normal'">
              <span v-if="item.modifiers.sugar !== 'Normal'"
                class="text-[9px] font-bold px-1.5 py-px bg-slate-100 text-slate-600 rounded">
                Sug: {{ item.modifiers.sugar }}
              </span>
              <span v-if="item.modifiers.ice !== 'Normal'"
                class="text-[9px] font-bold px-1.5 py-px bg-slate-100 text-slate-600 rounded">
                Ice: {{ item.modifiers.ice }}
              </span>
            </div>
          </div>

          <div class="flex items-center gap-1 shrink-0 h-full">

            <div class="flex items-center rounded-lg p-0.5 border border-slate-100">
              <button @click="item.qty > 1 ? cartStore.decreaseQty(item.id) : null" :disabled="item.qty <= 1"
                class="w-9 h-7 flex items-center justify-center rounded transition-all active:scale-90"
                :class="item.qty <= 1 ? 'text-slate-300' : 'text-slate-600 shadow-sm hover:bg-white'">
                <Minus class="w-3.5 h-3.5" />
              </button>

              <span class="text-xs font-bold text-slate-900 w-6 text-center tabular-nums leading-none">{{ item.qty
              }}</span>

              <button @click="cartStore.increaseQty(item.id)"
                class="w-9 h-7 flex items-center justify-center rounded text-slate-600 hover:bg-white hover:text-green-600 shadow-sm transition-all active:scale-90">
                <Plus class="w-3.5 h-3.5" />
              </button>
            </div>

            <button @click="promptDelete(item.id)"
              class="w-7 h-7 flex items-center justify-center rounded text-slate-300 hover:text-red-500 hover:bg-red-50 transition-colors ml-1">
              <Trash2 class="w-4 h-4" />
            </button>
          </div>

        </div>
      </TransitionGroup>

      <div v-if="cartStore.items.length > 0"
        class="flex justify-between items-center py-3 text-slate-400 border-b border-dashed border-slate-200">
        <span class="text-[10px] uppercase font-bold tracking-widest">Subtotal Items</span>
        <span class="text-xs font-mono">{{ cartStore.items.length }}</span>
      </div>
    </div>

    <div class="border-t-[3px] border-double border-slate-100 bg-white z-10 p-3 space-y-3">

      <div>
        <div class="grid grid-cols-3 gap-2">
          <button v-for="method in paymentMethods" :key="method.id" @click="paymentMethod = method.id"
            class="relative flex items-center justify-center gap-1.5 py-2 rounded border transition-all duration-200 group"
            :class="paymentMethod === method.id
              ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
              : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
              ">

            <!-- <component :is="method.icon" class="w-3.5 h-3.5"
              :class="paymentMethod === method.id ? 'text-emerald-400' : 'text-slate-400'" /> -->
            <span class="text-xs font-bold uppercase tracking-wide">{{ method.label }}</span>

            <div v-if="paymentMethod === method.id"
              class="absolute -top-1 -right-1 bg-white rounded-full p-px shadow-sm border border-slate-100">
              <CheckCircle2 class="w-2.5 h-2.5 text-emerald-500 fill-emerald-50" />
            </div>
          </button>
        </div>
      </div>

      <div class="space-y-2 pt-1 border-t border-dashed border-slate-200">
        <div class="flex items-end justify-between px-1 pt-1">
          <span class="text-xs font-bold text-slate-400 font-mono">{{ usdTotal }}</span>
          <div class="text-xl font-bold text-slate-900 tracking-tight leading-none font-mono">
            {{ cartStore.cartTotal.toLocaleString() }}<span class="text-xs text-slate-400 ml-0.5">៛</span>
          </div>
        </div>

        <button @click="initiateCharge" :disabled="cartStore.items.length === 0 || !!complianceError" :class="!complianceError && checkLimit('create_order')
          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-200'
          : 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed'
          "
          class="w-full mb-5 md:mb-2 py-4 rounded-lg font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:transform-none flex items-center justify-center gap-2 group">
          <div v-if="complianceError" class="flex items-center gap-2">
            <AlertCircle class="w-4 h-4" />
            <span>{{ complianceError }}</span>
          </div>
          <div v-else class="flex items-center gap-2">
            <span>Charge Order</span>
            <ArrowLeft class="w-4 h-4 rotate-180 transition-transform group-hover:translate-x-1" />
          </div>
        </button>
      </div>
    </div>

    <transition enter-active-class="transition duration-300 cubic-bezier(0.16, 1, 0.3, 1)"
      enter-from-class="translate-y-full opacity-0" enter-to-class="translate-y-0 opacity-100"
      leave-active-class="transition duration-200 ease-in" leave-from-class="translate-y-0 opacity-100"
      leave-to-class="translate-y-full opacity-0">

      <div v-if="showConfirmation" class="absolute inset-0 bg-white/95 backdrop-blur-md z-50 p-6 flex flex-col h-full">

        <div class="flex-1 flex flex-col justify-center items-center text-center space-y-4">
          <div
            class="w-12 h-12 bg-black rounded-full flex items-center justify-center text-white mb-2 animate-bounce-short">
            <Coffee class="w-6 h-6" />
          </div>

          <h3 class="text-lg font-bold text-slate-900">Confirm Print</h3>

          <div
            class="w-full max-w-60 bg-slate-50 p-6 relative font-mono text-sm leading-relaxed text-center shadow-sm">
            <div class="absolute -top-1 left-0 w-full h-2 bg-white"
              style="clip-path: polygon(0% 100%, 5% 0%, 10% 100%, 15% 0%, 20% 100%, 25% 0%, 30% 100%, 35% 0%, 40% 100%, 45% 0%, 50% 100%, 55% 0%, 60% 100%, 65% 0%, 70% 100%, 75% 0%, 80% 100%, 85% 0%, 90% 100%, 95% 0%, 100% 100%);">
            </div>

            <div class="flex justify-between text-xs mb-2 text-slate-500">
              <span>Total KHR</span>
              <span class="font-bold text-slate-900 text-sm">{{ cartStore.cartTotal.toLocaleString() }}</span>
            </div>
            <div class="flex justify-between text-xs mb-4 text-slate-500">
              <span>Total USD</span>
              <span class="font-bold text-slate-900 text-sm">{{ usdTotal }}</span>
            </div>
            <div class="pt-3 border-t border-dashed border-slate-300 flex justify-center items-center gap-2">
              <span class="text-[10px] uppercase text-slate-400">Paid Via</span>
              <span class="font-bold text-slate-900 text-sm">{{ paymentMethod }}</span>
            </div>

            <div class="absolute -bottom-1 left-0 w-full h-2 bg-white"
              style="clip-path: polygon(0% 0%, 5% 100%, 10% 0%, 15% 100%, 20% 0%, 25% 100%, 30% 0%, 35% 100%, 40% 0%, 45% 100%, 50% 0%, 55% 100%, 60% 0%, 65% 100%, 70% 0%, 75% 100%, 80% 0%, 85% 100%, 90% 0%, 95% 100%, 100% 0%);">
            </div>
          </div>
        </div>

        <div class="grid grid-cols-2 gap-3 mt-auto">
          <button @click="cancelCharge" :disabled="isProcessing"
            class="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider border border-slate-200 text-slate-600 hover:bg-slate-50 active:scale-95 transition-all">
            Cancel
          </button>
          <button @click="confirmCheckout" :disabled="isProcessing"
            class="w-full py-3 rounded-lg font-bold text-xs uppercase tracking-wider bg-slate-900 text-white shadow-lg shadow-slate-200 hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-2">
            <Loader2 v-if="isProcessing" class="w-4 h-4 animate-spin" />
            <span v-else>Print Order</span>
          </button>
        </div>
      </div>
    </transition>

    <transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 scale-95"
      enter-to-class="opacity-100 scale-100" leave-active-class="transition duration-150 ease-in"
      leave-from-class="opacity-100 scale-100" leave-to-class="opacity-0 scale-95">

      <div v-if="itemToDelete"
        class="absolute inset-0 bg-white/90 backdrop-blur-[2px] z-50 flex items-center justify-center p-6">

        <div class="bg-white border border-slate-200 shadow-xl rounded-xl p-5 w-full max-w-65 text-center">
          <div class="w-10 h-10 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-3">
            <AlertTriangle class="w-5 h-5 text-red-500" />
          </div>

          <h4 class="font-bold text-slate-900 mb-1">Remove Item?</h4>
          <p class="text-xs text-slate-500 mb-4">Are you sure you want to remove this from the cart?</p>

          <div class="grid grid-cols-2 gap-2">
            <button @click="cancelDelete"
              class="py-2 rounded-lg text-xs font-bold text-slate-600 border border-slate-200 hover:bg-slate-50">
              Cancel
            </button>
            <button @click="confirmDelete"
              class="py-2 rounded-lg text-xs font-bold text-white bg-red-500 hover:bg-red-600 shadow-sm">
              Remove
            </button>
          </div>
        </div>
      </div>
    </transition>

  </div>
</template>

<style scoped>
@keyframes bounce-short {

  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-10%);
  }
}

.animate-bounce-short {
  animation: bounce-short 2s infinite;
}
</style>