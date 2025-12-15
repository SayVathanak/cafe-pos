<script setup>
import { useCartStore } from "../stores/cartStore";
import ReceiptPrint from "./ReceiptPrint.vue";
import { ref, nextTick } from "vue";
import { Trash2, Plus, Minus, Printer } from "lucide-vue-next";

const cartStore = useCartStore();
const lastOrder = ref(null);

// Add emit for mobile close functionality
const emit = defineEmits(["close-cart"]);

const handleCheckout = async () => {
  const order = await cartStore.checkout();
  if (order) {
    lastOrder.value = order;
    await nextTick();
    window.print();
    setTimeout(() => {
      lastOrder.value = null;
    }, 10000);
    emit("close-cart"); // Notify parent to close cart on mobile
  }
};
</script>

<template>
  <ReceiptPrint :order="lastOrder" />

  <div class="h-full flex flex-col bg-white">
    <div class="p-6 border-b border-slate-100 flex-none bg-custom-bg">
      <div class="font-bold text-xl tracking-tight text-black">
        CURRENT ORDER
      </div>
      <div
        class="flex justify-between items-center mt-2 font-mono text-xs text-slate-500 uppercase"
      >
        <span>TICKET #{{ Math.floor(Math.random() * 999) }}</span>
        <span>{{
          new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })
        }}</span>
      </div>
    </div>

    <div class="flex-1 overflow-y-auto p-0 scrollbar-hide">
      <div
        v-if="cartStore.items.length === 0"
        class="h-full flex flex-col items-center justify-center text-slate-300"
      >
        <div
          class="w-16 h-16 border border-dashed border-slate-300 rounded-lg flex items-center justify-center mb-4"
        >
          <span class="text-3xl font-light">+</span>
        </div>
        <p class="font-mono text-xs uppercase tracking-widest">
          ORDER IS EMPTY
        </p>
      </div>

      <div
        v-for="item in cartStore.items"
        :key="item.signature"
        class="p-4 border-b border-slate-100"
      >
        <div class="flex justify-between items-start mb-2">
          <span class="font-medium text-sm text-slate-900 w-2/3 truncate">{{
            item.name
          }}</span>
          <span class="text-sm font-khmer text-black flex-shrink-0"
            >{{ (item.price * item.qty).toLocaleString() }}៛</span
          >
        </div>

        <div v-if="item.modifiers" class="flex gap-2">
          <span
            v-if="item.modifiers.sugar && item.modifiers.sugar !== 'Normal'"
            class="text-[10px] text-slate-600 px-2 uppercase"
          >
            Sugar: {{ item.modifiers.sugar }}
          </span>
          <span
            v-if="item.modifiers.ice && item.modifiers.ice !== 'Normal'"
            class="text-[10px] text-slate-600 px-2 uppercase"
          >
            Ice: {{ item.modifiers.ice }}
          </span>
        </div>

        <div class="flex items-center justify-between mt-3">
          <div class="flex rounded-lg overflow-hidden">
            <button
              @click="cartStore.decreaseQty(item.id)"
              class="w-8 h-8 border-none bg-white flex items-center justify-center"
            >
              <Minus class="w-3 h-3 text-black" />
            </button>
            <div
              class="w-8 h-8 flex items-center justify-center font-medium text-sm bg-white text-black"
            >
              {{ item.qty }}
            </div>
            <button
              @click="cartStore.increaseQty(item.id)"
              class="w-8 h-8 border-none bg-white flex items-center justify-center"
            >
              <Plus class="w-3 h-3 text-black" />
            </button>
          </div>

          <button
            @click="cartStore.removeItem(item.id)"
            class="border-none bg-white cursor-pointer text-slate-400 transition-colors p-1"
          >
            <Trash2 class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div class="p-6 border-t border-slate-100 bg-custom-bg flex-none z-20">
      <div class="space-y-2 mb-6 font-sans text-xs text-slate-700">
        <div class="flex justify-between uppercase">
          <span class="font-medium text-slate-500">Subtotal</span>
          <span class="font-medium text-black"
            >{{ cartStore.cartTotal.toLocaleString() }}៛</span
          >
        </div>
        <div class="flex justify-between uppercase">
          <span class="font-medium text-slate-500">Taxes</span>
          <span class="font-medium text-black">Included</span>
        </div>
        <div class="h-[1px] bg-slate-200 pt-2"></div>
      </div>

      <div class="flex justify-between items-end mb-6">
        <span class="font-bold text-md text-slate-700 uppercase tracking-widest"
          >Total</span
        >
        <span class="font-bold text-2xl text-black tracking-tight"
          >{{ cartStore.cartTotal.toLocaleString() }}៛</span
        >
      </div>

      <button
        @click="handleCheckout"
        :disabled="cartStore.items.length === 0"
        class="w-full border-none bg-black text-white py-4 rounded-xl font-medium text-sm tracking-widest disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-3"
      >
        <Printer class="w-4 h-4" />
        <span>PRINT RECEIPT & CHECKOUT</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Standard UnoCSS and Tailwind-compatible scrollbar hiding */
.scrollbar-hide::-webkit-scrollbar {
  display: none;
}
.scrollbar-hide {
  scrollbar-width: none;
}
</style>
