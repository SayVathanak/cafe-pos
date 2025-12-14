<script setup>
import { computed, ref, onMounted } from 'vue'
import { supabase } from '../services/supabase'

const props = defineProps({
  order: Object
})

// Default settings (will be overwritten by Database)
const settings = ref({
  shop_name: 'SAYON COFFEE',
  address: 'Phnom Penh, Cambodia',
  phone: '012-345-678',
  wifi_pass: '',
  printer_footer: 'Thank you!'
})

// Fetch real settings from Supabase when the receipt loads
onMounted(async () => {
  const { data } = await supabase.from('settings').select('*').single()
  if (data) {
    settings.value = data
  }
})

// Format date nicely (e.g., "14/12/2025, 9:30 PM")
const formattedDate = computed(() => {
  if (!props.order?.created_at) return new Date().toLocaleString('en-GB')
  return new Date(props.order.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: true
  })
})
</script>

<template>
  <Teleport to="body">
    <div id="receipt-container" v-if="order">
      
      <div class="header">
        <h2 class="brand">{{ settings.shop_name.toUpperCase() }}</h2>
        
        <div class="address">
          <p>{{ settings.address }}</p>
          <p>Tel: {{ settings.phone }}</p>
        </div>
        
        <div class="divider">--------------------------------</div>
      </div>

      <div class="info-row">
        <span>Order #:</span>
        <span>{{ order.id ? order.id.slice(0, 8).toUpperCase() : '---' }}</span>
      </div>
      <div class="info-row">
        <span>Date:</span>
        <span>{{ formattedDate }}</span>
      </div>
      
      <div class="divider">--------------------------------</div>

      <div class="items">
        <div v-for="(item, index) in order.drinks" :key="index" class="item-row">
          
          <div class="item-name">{{ item.name }}</div>
          
          <div v-if="item.modifiers" class="item-modifiers">
            <span v-if="item.modifiers.sugar && item.modifiers.sugar !== 'Normal'">
              - Sugar: {{ item.modifiers.sugar }}
            </span>
            <span v-if="item.modifiers.ice && item.modifiers.ice !== 'Normal'">
              - Ice: {{ item.modifiers.ice }}
            </span>
          </div>

          <div class="item-details">
            <span>{{ item.qty }} x {{ item.price.toLocaleString() }}</span>
            <span class="item-total">{{ (item.price * item.qty).toLocaleString() }}</span>
          </div>
        </div>
      </div>

      <div class="divider">--------------------------------</div>

      <div class="total-row">
        <span class="total-label">TOTAL</span>
        <span class="total-money">{{ order.total.toLocaleString() }}៛</span>
      </div>

      <div class="footer">
        <div class="divider">--------------------------------</div>
        
        <p>{{ settings.printer_footer }}</p>
        
        <p v-if="settings.wifi_pass" class="wifi">
          WiFi: {{ settings.wifi_pass }}
        </p>
        
        <br><br>.
      </div>

    </div>
  </Teleport>
</template>

<style>
/* GLOBAL STYLES (Not Scoped) 
   We need this to target 'body' and '#app' 
*/

/* 1. HIDE FROM SCREEN */
#receipt-container {
  display: none !important;
}

/* 2. PRINT STYLES */
@media print {
  
  /* Hide the regular App UI (Sidebar, Menu, etc) */
  body * {
    visibility: hidden;
  }
  
  /* Reset Body */
  body {
    background-color: white;
    margin: 0;
    padding: 0;
  }

  /* Show ONLY the receipt */
  #receipt-container, 
  #receipt-container * {
    visibility: visible !important;
  }

  #receipt-container {
    display: block !important;
    position: absolute;
    left: 0;
    top: 0;
    width: 100%; /* Fills the 58mm paper */
    margin: 0;
    padding: 0 2px; /* Tiny padding safe zone */
    
    font-family: 'Courier New', monospace; /* Best for receipts */
    font-size: 11px; /* Optimal reading size */
    line-height: 1.2;
    color: black;
    background: white;
  }

  /* --- LAYOUT HELPERS --- */
  .header { text-align: center; margin-bottom: 5px; }
  .brand { font-size: 16px; font-weight: bold; margin-bottom: 2px; }
  .address p { margin: 0; font-size: 9px; }
  
  .divider { 
    white-space: nowrap; 
    overflow: hidden; 
    margin: 5px 0; 
  }

  .info-row { display: flex; justify-content: space-between; font-size: 10px; margin-bottom: 2px; }
  
  .item-row { margin-bottom: 6px; }
  .item-name { font-weight: bold; font-size: 11px; }
  
  .item-modifiers { 
    font-size: 9px; 
    padding-left: 8px; 
    display: flex; 
    flex-direction: column; 
  }
  
  .item-details { 
    display: flex; 
    justify-content: space-between; 
    padding-left: 8px; 
    font-size: 10px; 
  }

  .total-row {
    display: flex; justify-content: space-between; 
    font-weight: bold; font-size: 14px; 
    margin: 10px 0;
    border-top: 1px dashed black;
    border-bottom: 1px dashed black;
    padding: 5px 0;
  }

  .footer { 
    text-align: center; 
    font-size: 10px; 
    padding-bottom: 50px; /* Long padding for cutter */
  }
  .wifi { margin-top: 5px; font-weight: bold; }
}
</style>