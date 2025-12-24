<script setup>
import { computed, ref, onMounted, nextTick } from "vue";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";

const props = defineProps({
  order: Object,
});

const userStore = useUserStore();
const settings = ref({
  receipt_header: "Cambodge Cafe & Bakery",
  receipt_address: "Phnom Penh",
  receipt_phone: "",
  wifi_pass: "",
  receipt_footer: "Thank you!",
  logo_url: "",
  tax_rate: 0,
  service_charge: 0,
  exchange_rate: 4100,
  paper_size: "58mm",
  use_logo_header: true // Default to logo if available
});

onMounted(async () => {
  if (!userStore.organizationId) return;

  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("organization_id", userStore.organizationId)
    .single();

  if (data) {
    settings.value = { ...settings.value, ...data };
    // Fallback if paper size is missing
    if (!data.paper_size) settings.value.paper_size = "58mm";
    // Fallback if use_logo_header is missing (default to true for backward compatibility)
    if (data.use_logo_header === undefined) settings.value.use_logo_header = true;
  }
});

const formatCurrency = (val) => new Intl.NumberFormat("en-US", { style: 'currency', currency: 'USD' }).format(val || 0);
const formatRiel = (val) => new Intl.NumberFormat("km-KH").format(val || 0);

// Calculations - prices are in Riel
const subtotalRiel = computed(() => props.order?.total || props.order?.total_amount || 0);
const taxAmount = computed(() => (subtotalRiel.value * settings.value.tax_rate) / 100);
const serviceAmount = computed(() => (subtotalRiel.value * settings.value.service_charge) / 100);
const totalRiel = computed(() => {
  const total = subtotalRiel.value + taxAmount.value + serviceAmount.value;
  return Math.round(total / 100) * 100; // Round to nearest 100 Riel
});
// Convert Riel to USD
const subtotal = computed(() => subtotalRiel.value / settings.value.exchange_rate);
const grandTotal = computed(() => totalRiel.value / settings.value.exchange_rate);

const formattedDate = computed(() => {
  if (!props.order?.created_at) return new Date().toLocaleString("en-GB");
  return new Date(props.order.created_at).toLocaleString("en-GB", {
    day: "numeric", month: "numeric", year: "2-digit",
    hour: "numeric", minute: "numeric", hour12: true,
  });
});

// Computed property to determine what to show in header
const showLogo = computed(() => {
  return settings.value.use_logo_header && settings.value.logo_url;
});

const print = async () => {
  await nextTick();
  setTimeout(() => window.print(), 300);
};

defineExpose({ print });
</script>

<template>
  <Teleport to="body">
    <div id="receipt-container" v-if="order" :class="settings.paper_size === '80mm' ? 'paper-80' : 'paper-58'">
      
      <div class="header">
        <!-- Show logo only if use_logo_header is true AND logo_url exists -->
        <img v-if="showLogo" :src="settings.logo_url" class="logo-img" />
        <!-- Show brand name if logo is not being used -->
        <h2 v-else class="brand">{{ settings.receipt_header?.toUpperCase() }}</h2>
        
        <div class="address">
          <p>{{ settings.receipt_address }}</p>
          <p v-if="settings.receipt_phone" class="mt-1">Tel: {{ settings.receipt_phone }}</p>
        </div>
      </div>

      <div class="separator"></div>

      <div class="info-group">
        <div class="info-row"><span>Order #:</span><span class="font-bold">{{ order.id ? order.id.slice(0, 8).toUpperCase() : "---" }}</span></div>
        <div class="info-row"><span>Date:</span><span>{{ formattedDate }}</span></div>
        <div class="info-row"><span>Cashier:</span><span>{{ order.profiles?.full_name || userStore.profile?.full_name || 'Staff' }}</span></div>
      </div>

      <div class="separator"></div>

      <div class="items">
        <div v-for="(item, index) in order.drinks" :key="index" class="item-row">
          <div class="item-line"><span class="item-name">{{ item.name }}</span></div>
          <div v-if="item.modifiers" class="item-modifiers">
            <template v-for="(val, key) in item.modifiers" :key="key">
              <span v-if="val && val !== 'Normal'">• {{ val }}</span>
            </template>
          </div>
          <div class="item-math">
            <span>{{ item.qty }} x {{ formatCurrency(item.price) }}</span>
            <span class="font-bold">{{ formatCurrency(item.price * item.qty) }}</span>
          </div>
        </div>
      </div>

      <div class="separator"></div>

      <div class="totals-section">
        <div class="sub-row"><span>Subtotal:</span><span>{{ formatCurrency(subtotal) }}</span></div>
        
        <div v-if="settings.tax_rate > 0" class="sub-row text-xs text-slate-500">
          <span>VAT ({{ settings.tax_rate }}%):</span><span>{{ formatCurrency(taxAmount) }}</span>
        </div>
        
        <div v-if="settings.service_charge > 0" class="sub-row text-xs text-slate-500">
          <span>Service ({{ settings.service_charge }}%):</span><span>{{ formatCurrency(serviceAmount) }}</span>
        </div>

        <div class="separator-light"></div>

        <div class="total-row main-total">
          <span class="total-label">TOTAL</span>
          <span class="total-money">{{ formatCurrency(grandTotal) }}</span>
        </div>
        
        <div class="total-row riel-total">
          <span>Total (KHR)</span>
          <span class="font-khmer">{{ formatRiel(totalRiel) }}៛</span>
        </div>
      </div>

      <div class="separator"></div>

      <div class="footer">
        <p class="footer-msg">{{ settings.receipt_footer }}</p>
        
        <div v-if="settings.wifi_pass" class="wifi-box">
          <span class="wifi-label">WIFI:</span> <span class="wifi-code">{{ settings.wifi_pass }}</span>
        </div>
        
        <p class="tech-credit">Powered by Cambodge Business</p>
        <div class="cut-feed">.</div>
      </div>
    </div>
  </Teleport>
</template>

<style>
#receipt-container { display: none; }

@media print {
  @page { margin: 0; size: auto; }
  body > *:not(#receipt-container) { display: none !important; }
  
  #receipt-container {
    display: block !important;
    position: absolute; left: 0; top: 0;
    background: white; color: black;
    font-family: "Montserrat", sans-serif;
    line-height: 1.3;
  }

  /* Paper Sizes */
  .paper-58 { width: 58mm; padding: 4px 2px; font-size: 11px; }
  .paper-80 { width: 80mm; padding: 10px 15px; font-size: 13px; }

  /* Utilities */
  .font-bold { font-weight: 700; }
  .font-khmer { font-family: "Preahvihear", cursive; font-weight: 400; }
  .mt-1 { margin-top: 2px; }
  
  /* Header */
  .header { text-align: center; margin-bottom: 5px; }
  .brand { font-size: 16px; font-weight: 800; margin: 5px 0; }
  .logo-img { max-width: 60%; max-height: 60px; margin: 0 auto 5px auto; object-fit: contain; }
  .address { font-size: 0.9em; opacity: 0.8; white-space: pre-wrap; }

  .separator { border-bottom: 1px dashed #000; margin: 6px 0; width: 100%; }
  .separator-light { border-bottom: 1px solid #ddd; margin: 4px 0; width: 100%; }

  .info-group, .totals-section { display: flex; flex-direction: column; gap: 3px; }
  .info-row, .sub-row, .total-row, .item-math { display: flex; justify-content: space-between; }
  
  .main-total { font-weight: 800; font-size: 1.2em; margin-top: 2px; }
  .riel-total { font-weight: 700; font-size: 1em; color: #333; }

  .item-row { margin-bottom: 6px; }
  .item-name { font-weight: 700; display: block; width: 100%; white-space: pre-wrap; word-break: break-word; }
  .item-modifiers { font-size: 0.85em; font-style: italic; margin-left: 5px; color: #444; }

  .footer { text-align: center; margin-top: 10px; font-size: 0.85em; }
  .wifi-box { border: 1px solid #000; border-radius: 4px; padding: 3px; display: inline-block; margin: 5px 0; font-weight: 700; }
  .tech-credit { font-size: 0.7em; margin-top: 5px; text-transform: uppercase; color: #666; }
  .cut-feed { color: white; padding-bottom: 20px; }
}
</style>