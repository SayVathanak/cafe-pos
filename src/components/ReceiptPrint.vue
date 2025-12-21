<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { supabase } from "../services/supabase";

const props = defineProps({
  order: Object,
});

const settings = ref({
  shop_name: "SAYON COFFEE",
  address: "Phnom Penh, Cambodia",
  phone: "012-345-678",
  wifi_pass: "",
  printer_footer: "Thank you!",
});

onMounted(async () => {
  const { data } = await supabase.from("settings").select("*").single();
  if (data) settings.value = data;
});

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
  // 1. Wait for Vue to update the DOM with the new order data
  await nextTick();

  // 2. Small delay to ensure styles/fonts are applied
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
        <h2 class="brand">{{ settings.shop_name?.toUpperCase() }}</h2>
        <div class="address">
          <p>{{ settings.address }}</p>
          <p v-if="settings.phone">Tel: {{ settings.phone }}</p>
        </div>
      </div>

      <div class="separator"></div>

      <div class="info-group">
        <div class="info-row">
          <span>Order #:</span>
          <span>{{
            order.id ? order.id.slice(0, 8).toUpperCase() : "---"
          }}</span>
        </div>
        <div class="info-row">
          <span>Date:</span>
          <span>{{ formattedDate }}</span>
        </div>
      </div>

      <div class="separator"></div>

      <div class="items">
        <div
          v-for="(item, index) in order.drinks"
          :key="index"
          class="item-row"
        >
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

            <span class="khmer-text">
              {{ formatCurrency(item.price) }}
            </span>

            <span class="line-total khmer-text">
              {{ formatCurrency(item.price * item.qty) }}
            </span>
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
        <p class="footer-msg">{{ settings.printer_footer }}</p>

        <div v-if="settings.wifi_pass" class="wifi-section">
          <span class="wifi-label">WiFi Password:</span>
          <span class="wifi-code">{{ settings.wifi_pass }}</span>
        </div>

        <br />
        <div class="cut-feed">.</div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* GLOBAL STYLES (Not Scoped)
  We use basic CSS to hide the receipt on screen,
  and force it to show during print.
*/

/* 1. Hide on Screen */
#receipt-container {
  display: none;
}

/* 2. Print Specifics */
@media print {
  /* RESET PAGE */
  @page {
    margin: 0;
    size: 58mm auto; /* Critical for your printer */
  }

  /* HIDE EVERYTHING ELSE */
  body > *:not(#receipt-container) {
    display: none !important;
  }

  /* SHOW RECEIPT - FIX WAS HERE */
  #receipt-container {
    display: block !important; /* Force display back on */
    visibility: visible !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 58mm;
    margin: 0;
    padding: 2px 4px;
    background: white;

    /* FONTS */
    font-family: "Montserrat", sans-serif;
    color: black;
    font-size: 13px;
    font-weight: 500; /* Medium */
    line-height: 1.4;
  }

  /* KHMER FONT OVERRIDE */
  .khmer-text {
    font-family: "Preahvihear", cursive;
    font-weight: 400;
  }

  /* --- LAYOUT CLASSES --- */

  .header {
    text-align: center;
    margin-bottom: 5px;
  }

  .brand {
    font-size: 20px;
    font-weight: 700; /* Bold only for title */
    margin: 10px 0 5px 0;
  }

  .address {
    font-size: 11px;
  }

  .separator {
    border-bottom: 1px dashed #000;
    margin: 8px 0;
    width: 100%;
  }

  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
  }

  .item-row {
    margin-bottom: 8px;
  }

  .item-name {
    font-size: 14px;
    font-weight: 600; /* Semi-bold */
  }

  .item-modifiers {
    font-size: 11px;
    padding-left: 10px;
    display: flex;
    flex-direction: column;
    color: #444;
  }

  .item-math {
    display: flex;
    justify-content: space-between;
    padding-left: 10px;
    font-size: 13px;
    margin-top: 2px;
  }

  .line-total {
    font-weight: 600;
  }

  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 5px 0;
  }

  .total-label {
    font-size: 16px;
    font-weight: 700;
  }

  .total-money {
    font-size: 22px;
    /* Font family handled by khmer-text class */
  }

  .footer {
    text-align: center;
    font-size: 11px;
  }

  .wifi-section {
    margin-top: 10px;
    border: 1px solid #000;
    padding: 4px;
    border-radius: 4px;
  }

  .wifi-code {
    font-size: 14px;
    font-weight: 600;
  }

  .cut-feed {
    padding-bottom: 30px;
    color: white;
  }
}
</style>
