<script setup>
import { computed, ref, watch, nextTick } from "vue";
import { supabase } from "../services/supabase";

const props = defineProps({
  order: Object,
});

// Default settings (fallback)
const storeSettings = ref({
  name: "CAMBODGE BUSINESS",
  location: "Phnom Penh",
  phone: "",
  wifi_pass: "",
  printer_footer: "Thank you! See you again.",
});

// Watch for order changes to fetch Organization Settings
watch(() => props.order, async (newOrder) => {
  if (!newOrder) return;

  let orgId = newOrder.organization_id;

  // 1. If order doesn't have org_id directly, find it via the store
  if (!orgId && newOrder.store_id) {
    const { data: store } = await supabase
      .from('stores')
      .select('organization_id')
      .eq('id', newOrder.store_id)
      .single();
    if (store) orgId = store.organization_id;
  }

  // 2. Fetch Settings from the 'settings' table using Organization ID
  if (orgId) {
    const { data } = await supabase
      .from("settings")
      .select("*")
      .eq("organization_id", orgId)
      .single();
    
    if (data) {
      storeSettings.value = {
        name: data.receipt_header || "CBS POS",
        location: data.receipt_address || "Phnom Penh",
        phone: data.receipt_phone,
        wifi_pass: data.wifi_pass,
        printer_footer: data.receipt_footer || "Thank you!",
      };
    }
  }
}, { immediate: true });

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US").format(amount);
};

// Date Formatter
const formattedDate = computed(() => {
  if (!props.order?.created_at) return new Date().toLocaleString("en-GB");
  return new Date(props.order.created_at).toLocaleString("en-GB", {
    day: "numeric", month: "numeric", year: "2-digit",
    hour: "numeric", minute: "numeric", hour12: true,
  });
});

// Calculate Change
const changeDue = computed(() => {
  if (props.order?.payment_method === 'cash' && props.order?.amount_paid) {
    return props.order.amount_paid - (props.order.total || props.order.total_amount);
  }
  return 0;
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
          <p v-if="storeSettings.phone" class="mt-1">Tel: {{ storeSettings.phone }}</p>
        </div>
      </div>

      <div class="separator"></div>

      <div class="info-group">
        <div class="info-row">
          <span>Order #:</span>
          <span class="font-bold">{{ order.id ? order.id.slice(0, 8).toUpperCase() : "---" }}</span>
        </div>
        <div class="info-row">
          <span>Date:</span>
          <span>{{ formattedDate }}</span>
        </div>
        <div class="info-row" v-if="order.profiles?.full_name">
          <span>Cashier:</span>
          <span>{{ order.profiles.full_name }}</span>
        </div>
        <div class="info-row">
          <span>Payment:</span>
          <span class="uppercase font-bold">{{ order.payment_method || 'CASH' }}</span>
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
                • {{ val }} <span class="text-[9px] opacity-70">({{ key }})</span>
              </span>
            </template>
          </div>

          <div class="item-math">
            <span>{{ item.qty }} x {{ formatCurrency(item.price) }}</span>
            <span class="line-total khmer-text">{{ formatCurrency(item.price * item.qty) }}</span>
          </div>
        </div>
      </div>

      <div class="separator"></div>

      <div class="totals-section">
        <div class="total-row main-total">
          <span class="total-label">TOTAL</span>
          <span class="total-money khmer-text">
            {{ formatCurrency(order.total || order.total_amount) }}៛
          </span>
        </div>

        <template v-if="order.payment_method === 'cash' && order.amount_paid">
          <div class="sub-row">
            <span>Cash Received:</span>
            <span>{{ formatCurrency(order.amount_paid) }}៛</span>
          </div>
          <div class="sub-row">
            <span>Change:</span>
            <span>{{ formatCurrency(changeDue) }}៛</span>
          </div>
        </template>
      </div>

      <div class="separator"></div>

      <div class="footer">
        <p class="footer-msg">{{ storeSettings.printer_footer }}</p>

        <div v-if="storeSettings.wifi_pass" class="wifi-section">
          <div class="wifi-icon">📶</div>
          <div>
            <div class="wifi-label">WiFi Password</div>
            <div class="wifi-code">{{ storeSettings.wifi_pass }}</div>
          </div>
        </div>

        <p class="tech-credit">Powered by Cambodge Business Solutions</p>
        
        <br />
        <div class="cut-feed">.</div>
      </div>
    </div>
  </Teleport>
</template>

<style>
/* Hide onscreen */
#receipt-container { display: none; }

@media print {
  @page { margin: 0; size: 58mm auto; }
  
  body > *:not(#receipt-container) { display: none !important; }
  
  #receipt-container {
    display: block !important;
    visibility: visible !important;
    position: absolute; left: 0; top: 0; width: 58mm;
    margin: 0; padding: 4px 6px; 
    background: white; color: black;
    font-family: "Montserrat", sans-serif;
    font-size: 12px; font-weight: 500; line-height: 1.3;
  }

  /* Typography */
  .khmer-text { font-family: "Preahvihear", cursive; font-weight: 400; }
  .font-bold { font-weight: 700; }
  .uppercase { text-transform: uppercase; }
  .mt-1 { margin-top: 2px; }

  /* Header */
  .header { text-align: center; margin-bottom: 5px; }
  .brand { font-size: 18px; font-weight: 800; margin: 5px 0 2px 0; line-height: 1.1; }
  .address { font-size: 10px; opacity: 0.8; white-space: pre-wrap; }

  /* Separator */
  .separator { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }

  /* Info Group */
  .info-group { display: flex; flex-direction: column; gap: 2px; }
  .info-row { display: flex; justify-content: space-between; font-size: 10px; }

  /* Items */
  .item-row { margin-bottom: 6px; }
  .item-line { width: 100%; }
  .item-name { 
    font-size: 13px; font-weight: 700; 
    display: block; width: 100%;
    /* Ensure long names wrap properly on paper */
    white-space: pre-wrap; word-break: break-word; 
  }
  
  .item-modifiers { 
    font-size: 9px; padding-left: 8px; 
    display: flex; flex-direction: column; color: #333; 
    font-style: italic; margin-bottom: 2px;
  }
  
  .item-math { 
    display: flex; justify-content: space-between; 
    font-size: 11px; padding-left: 8px;
  }
  .line-total { font-weight: 600; }

  /* Totals */
  .totals-section { display: flex; flex-direction: column; gap: 2px; }
  .total-row { display: flex; justify-content: space-between; align-items: center; margin: 4px 0; }
  .main-total { font-size: 16px; font-weight: 800; border-top: 1px solid #000; border-bottom: 1px solid #000; padding: 4px 0; }
  .total-money { font-size: 18px; }
  
  .sub-row { display: flex; justify-content: space-between; font-size: 10px; }

  /* Footer */
  .footer { text-align: center; font-size: 10px; }
  .footer-msg { margin-bottom: 8px; font-weight: 600; }
  
  .wifi-section { 
    margin: 8px auto; border: 1px solid #000; 
    padding: 4px 8px; border-radius: 6px; 
    display: flex; align-items: center; justify-content: center; gap: 6px;
    width: 90%;
  }
  .wifi-icon { font-size: 14px; }
  .wifi-label { font-size: 8px; text-transform: uppercase; font-weight: 700; }
  .wifi-code { font-size: 12px; font-weight: 700; font-family: monospace; }

  .tech-credit { font-size: 8px; color: #555; margin-top: 5px; text-transform: uppercase; tracking: 1px; }

  .cut-feed { padding-bottom: 25px; color: white; }
}
</style>