<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { supabase } from "../services/supabase";

const props = defineProps({
  order: Object,
});

// Default settings (fallback)
const storeSettings = ref({
  name: "SAYON COFFEE",
  location: "Phnom Penh",
  phone: "",
  wifi_pass: "",
  printer_footer: "Thank you!",
});

// Watch for order changes to fetch the CORRECT store details
watch(() => props.order, async (newOrder) => {
  if (newOrder?.store_id) {
    const { data } = await supabase
      .from("stores")
      .select("*")
      .eq("id", newOrder.store_id)
      .single();
    
    if (data) {
      storeSettings.value = {
        name: data.name,
        location: data.location,
        phone: data.phone,         // <--- New Column we will add
        wifi_pass: data.wifi_pass, // <--- New Column we will add
        printer_footer: "Thank you!", // Can be dynamic later if you want
      };
    }
  }
}, { immediate: true });

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US").format(amount);
};

const formattedDate = computed(() => {
  if (!props.order?.created_at) return new Date().toLocaleString("en-GB");
  return new Date(props.order.created_at).toLocaleString("en-GB", {
    day: "numeric",
    month: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "numeric",
    hour12: true,
  });
});

const print = async () => {
  await nextTick();
  setTimeout(() => {
    window.print();
  }, 300);
};

defineExpose({ print });
</script>

<template>
  <Teleport to="body">
    <div id="receipt-container" v-if="order">
      <div class="header">
        <h2 class="brand">{{ storeSettings.name?.toUpperCase() }}</h2>
        <div class="address">
          <p>{{ storeSettings.location }}</p>
          <p v-if="storeSettings.phone">Tel: {{ storeSettings.phone }}</p>
        </div>
      </div>

      <div class="separator"></div>

      <div class="info-group">
        <div class="info-row">
          <span>Order #:</span>
          <span>{{ order.id ? order.id.slice(0, 8).toUpperCase() : "---" }}</span>
        </div>
        <div class="info-row">
          <span>Date:</span>
          <span>{{ formattedDate }}</span>
        </div>
      </div>

      <div class="separator"></div>

      <div class="items">
        <div v-for="(item, index) in order.drinks" :key="index" class="item-row">
          <div class="item-line">
            <span class="item-name">{{ item.name }}</span>
          </div>

          <div v-if="item.modifiers" class="item-modifiers">
            <template v-for="(val, key) in item.modifiers" :key="key">
              <span v-if="val && val !== 'Normal'">
                + {{ val }} ({{ key }})
              </span>
            </template>
          </div>

          <div class="item-math">
            <span>{{ item.qty }} x </span>
            <span class="khmer-text">{{ formatCurrency(item.price) }}</span>
            <span class="line-total khmer-text">{{ formatCurrency(item.price * item.qty) }}</span>
          </div>
        </div>
      </div>

      <div class="separator"></div>

      <div class="total-row">
        <span class="total-label">TOTAL</span>
        <span class="total-money khmer-text">
          {{ formatCurrency(order.total || order.total_amount) }}៛
        </span>
      </div>

      <div class="separator"></div>

      <div class="footer">
        <p class="footer-msg">{{ storeSettings.printer_footer }}</p>

        <div v-if="storeSettings.wifi_pass" class="wifi-section">
          <span class="wifi-label">WiFi Password:</span>
          <span class="wifi-code">{{ storeSettings.wifi_pass }}</span>
        </div>

        <br />
        <div class="cut-feed">.</div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* ... Keep your exact existing CSS here ... */
/* 1. Hide on Screen */
#receipt-container { display: none; }

/* 2. Print Specifics */
@media print {
  @page { margin: 0; size: 58mm auto; }
  body > *:not(#receipt-container) { display: none !important; }
  #receipt-container {
    display: block !important;
    visibility: visible !important;
    position: absolute; left: 0; top: 0; width: 58mm;
    margin: 0; padding: 2px 4px; background: white;
    font-family: "Montserrat", sans-serif; color: black;
    font-size: 13px; font-weight: 500; line-height: 1.4;
  }
  .khmer-text { font-family: "Preahvihear", cursive; font-weight: 400; }
  .header { text-align: center; margin-bottom: 5px; }
  .brand { font-size: 20px; font-weight: 700; margin: 10px 0 5px 0; }
  .address { font-size: 11px; }
  .separator { border-bottom: 1px dashed #000; margin: 8px 0; width: 100%; }
  .info-row { display: flex; justify-content: space-between; font-size: 11px; }
  .item-row { margin-bottom: 8px; }
  .item-name { font-size: 14px; font-weight: 600; }
  .item-modifiers { font-size: 11px; padding-left: 10px; display: flex; flex-direction: column; color: #444; }
  .item-math { display: flex; justify-content: space-between; padding-left: 10px; font-size: 13px; margin-top: 2px; }
  .line-total { font-weight: 600; }
  .total-row { display: flex; justify-content: space-between; align-items: center; margin: 5px 0; }
  .total-label { font-size: 16px; font-weight: 700; }
  .total-money { font-size: 22px; }
  .footer { text-align: center; font-size: 11px; }
  .wifi-section { margin-top: 10px; border: 1px solid #000; padding: 4px; border-radius: 4px; }
  .wifi-code { font-size: 14px; font-weight: 600; }
  .cut-feed { padding-bottom: 30px; color: white; }
}
</style>