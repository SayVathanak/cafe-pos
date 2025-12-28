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
  Printer,
  Loader2,
  X,
  Banknote,
  QrCode,
  CreditCard,
  Lock,
  AlertTriangle,
  ArrowLeft,
  CheckCircle2
} from "lucide-vue-next";

const cartStore = useCartStore();
const userStore = useUserStore();
const lastOrder = ref(null);
const isProcessing = ref(false);
const showConfirmation = ref(false); // NEW: Controls the confirmation step
const nextOrderId = ref("Loading...");
const emit = defineEmits(["close-cart"]);

// --- LIMITS ---
const { checkLimit, fetchUsage, usage, limits } = usePlanLimits();

// Config
const EXCHANGE_RATE = 4000;
const paymentMethod = ref("Cash");

// const paymentMethods = [
//   { id: "Cash", label: "Cash", icon: Banknote },
//   { id: "ABA", label: "ABA", icon: QrCode },
//   { id: "ACLEDA", label: "ACLEDA", icon: CreditCard },
// ];

const paymentMethods = [
  { id: "Cash", label: "Cash" },
  { id: "ABA", label: "ABA"},
  { id: "ACLEDA", label: "ACLEDA" },
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

// ✅ PREDICT NEXT ID
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
    .single();

  let nextNum = 1;
  if (data && data.order_number) nextNum = data.order_number + 1;

  const loopNum = ((nextNum - 1) % 100) + 1;
  nextOrderId.value = `#${loopNum.toString().padStart(3, "0")}`;
};

// ✅ STEP 1: INITIATE CHARGE (Open Confirmation)
const initiateCharge = () => {
  if (cartStore.items.length === 0) return;
  if (complianceError.value) {
    alert(`🚨 ${complianceError.value}`);
    return;
  }
  showConfirmation.value = true;
};

// ✅ STEP 2: CANCEL
const cancelCharge = () => {
  showConfirmation.value = false;
};

// ✅ STEP 3: CONFIRM & PROCESS
const confirmCheckout = async () => {
  isProcessing.value = true;

  // 1. Prepare Payload
  const orderPayload = {
    drinks: [...cartStore.items],
    total_amount: cartStore.cartTotal,
    payment_method: paymentMethod.value,
    organization_id: userStore.organizationId,
    store_id: userStore.storeId,
    status: "completed",
  };

  // 2. Insert
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

  // 3. Update Receipt & Print
  lastOrder.value = data;

  await nextTick();
  setTimeout(() => {
    window.print();
    cartStore.clearCart();
    isProcessing.value = false;
    showConfirmation.value = false; // Reset UI
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
    <div class="px-5 py-4 border-b border-slate-100 flex-none bg-white z-10 flex items-center justify-between">
      <div>
        <div class="font-bold uppercase text-lg text-slate-900 tracking-tight">Current Order</div>
        <div class="text-sm font-mono text-slate-500 mt-0.5">Order ID:
          <span class="text-slate-900 font-bold">{{ nextOrderId }}</span>
        </div>
      </div>
      <button @click="$emit('close-cart')" class="lg:hidden p-3 bg-slate-100 rounded-full active:bg-slate-200">
        <X class="w-6 h-6 text-slate-600" />
      </button>
    </div>

    <div class="flex-1 overflow-y-auto p-4 scrollbar-hide">
      <div v-if="cartStore.items.length === 0"
        class="h-full flex flex-col items-center justify-center text-slate-400 opacity-60">
        <div
          class="w-16 h-16 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center mb-4">
          <Plus class="w-8 h-8 text-slate-300" />
        </div>
        <p class="text-xs font-bold uppercase tracking-widest">
          Cart is Empty
        </p>
      </div>

      <TransitionGroup name="list" tag="div" class="space-y-4" v-else>
        <div v-for="item in cartStore.items" :key="item.signature"
          class="bg-white p-3 rounded-2xl border border-slate-100 flex gap-4 shadow-sm">
          <div class="w-16 h-16 bg-slate-50 rounded-xl shrink-0 overflow-hidden relative border border-slate-100">
            <img v-if="item.image_url" :src="item.image_url" class="w-full h-full object-cover" />
            <div v-else class="w-full h-full flex items-center justify-center text-[10px] text-slate-300 font-bold">
              IMG
            </div>
          </div>

          <div class="flex-1 min-w-0 flex flex-col justify-between py-0.5">
            <div class="flex justify-between items-start gap-2">
              <span class="font-semibold text-sm text-slate-900 truncate leading-snug">{{ item.name }}</span>
              <span class="font-bold text-sm shrink-0">{{ (item.price * item.qty).toLocaleString() }}៛</span>
            </div>

            <div class="flex items-end justify-between mt-2">
              <div class="text-[10px] text-slate-500 font-medium leading-tight space-y-0.5">
                <span v-if="item.modifiers.sugar !== 'Normal'"
                  class="block bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 mr-1">Sug: {{
                    item.modifiers.sugar }}</span>
                <span v-if="item.modifiers.ice !== 'Normal'"
                  class="block bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">Ice: {{
                    item.modifiers.ice }}</span>
              </div>

              <div class="flex items-center gap-1 bg-slate-50 rounded-lg p-1 border border-slate-100">
                <button @click="cartStore.decreaseQty(item.id)"
                  class="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 active:bg-slate-50 active:scale-95 transition-all">
                  <Minus class="w-4 h-4 text-slate-600" />
                </button>
                <span class="text-sm font-bold w-6 text-center tabular-nums">{{ item.qty }}</span>
                <button @click="cartStore.increaseQty(item.id)"
                  class="w-8 h-8 flex items-center justify-center bg-white rounded-md shadow-sm border border-slate-200 active:bg-slate-50 active:scale-95 transition-all">
                  <Plus class="w-4 h-4 text-slate-600" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </TransitionGroup>
    </div>

    <div class="border-t border-slate-100 bg-slate-50/80 backdrop-blur-sm relative pb-2">

      <transition enter-active-class="transition duration-200 ease-out" enter-from-class="translate-y-full opacity-0"
        enter-to-class="translate-y-0 opacity-100" leave-active-class="transition duration-150 ease-in"
        leave-from-class="translate-y-0 opacity-100" leave-to-class="translate-y-full opacity-0">
        <div v-if="showConfirmation"
          class="absolute inset-0 bg-white z-20 p-5 flex flex-col justify-between shadow-[0_-4px_20px_rgba(0,0,0,0.1)]">
          <div class="text-center space-y-2">
            <h3 class="text-lg font-bold text-slate-900 uppercase">Confirm Payment?</h3>
            <div class="py-4 bg-slate-50 rounded-xl border border-slate-100">
              <div class="text-sm text-slate-500 mb-1">Total to Collect</div>
              <div class="text-3xl font-bold text-slate-900">{{ cartStore.cartTotal.toLocaleString() }}៛</div>
              <div class="flex items-center justify-center gap-2 mt-2 text-slate-600">
                via <span class="font-bold text-black bg-slate-200 px-2 py-0.5 rounded text-xs uppercase">{{
                  paymentMethod }}</span>
              </div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 mt-4">
            <button @click="cancelCharge" :disabled="isProcessing"
              class="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider border-2 border-slate-200 text-slate-500 hover:bg-slate-50 active:scale-95 transition-all">
              Cancel
            </button>
            <button @click="confirmCheckout" :disabled="isProcessing"
              class="w-full py-4 rounded-xl font-bold text-sm uppercase tracking-wider bg-green-600 text-white shadow-lg shadow-green-200 active:scale-95 transition-all flex items-center justify-center gap-2">
              <Loader2 v-if="isProcessing" class="w-5 h-5 animate-spin" />
              <span v-else>Confirm</span>
            </button>
          </div>
        </div>
      </transition>

      <div class="p-5 space-y-4">
        <div>
          <label class="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
            Payment Method
          </label>
          <div class="grid grid-cols-3 gap-3">
            <button v-for="method in paymentMethods" :key="method.id" @click="paymentMethod = method.id"
              class="relative uppercase flex flex-row items-center justify-center gap-1 h-10 rounded-xl border transition-all duration-200"
              :class="paymentMethod === method.id
                ? 'bg-black text-white border-slate-200 shadow-md'
                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                ">
              <!-- <component :is="method.icon" class="w-5 h-5" /> -->
              <span class="text-xs font-semibold">{{ method.label }}</span>

              <div v-if="paymentMethod === method.id" class="absolute top-1 right-1">
                <CheckCircle2 class="w-3 h-3 text-green-400" />
              </div>
            </button>
          </div>
        </div>

        <div class="flex items-end justify-between py-2 border-t border-dashed border-slate-200">
          <div class="text-sm text-slate-500 font-medium">Total Amount</div>
          <div class="text-right">
            <div class="text-2xl font-bold text-slate-900 leading-none">
              {{ cartStore.cartTotal.toLocaleString() }}៛
            </div>
            <div class="text-xs font-medium text-slate-400 mt-1">
              {{ usdTotal }}
            </div>
          </div>
        </div>

        <button @click="initiateCharge" :disabled="cartStore.items.length === 0 || !!complianceError" :class="!complianceError && checkLimit('create_order')
          ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-xl shadow-slate-200'
          : 'bg-red-50 text-red-500 border border-red-100 cursor-not-allowed'
          "
          class="w-full py-5 rounded-xl font-bold text-sm uppercase tracking-widest transition-all active:scale-[0.98] disabled:transform-none flex items-center justify-center gap-3">
          <span v-if="complianceError">{{ complianceError }}</span>
          <span v-else>Charge Order</span>
        </button>
      </div>
    </div>
  </div>
</template>