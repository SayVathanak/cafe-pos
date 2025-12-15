<script setup>
import { computed, ref, onMounted } from 'vue'
import { supabase } from '../services/supabase'

const props = defineProps({
  order: Object
})

const settings = ref({
  shop_name: 'SAYON COFFEE',
  address: 'Phnom Penh, Cambodia',
  phone: '012-345-678',
  wifi_pass: '',
  printer_footer: 'Thank you!'
})

onMounted(async () => {
  const { data } = await supabase.from('settings').select('*').single()
  if (data) settings.value = data
})

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US').format(amount)
}

const formattedDate = computed(() => {
  if (!props.order?.created_at) return new Date().toLocaleString('en-GB')
  return new Date(props.order.created_at).toLocaleString('en-GB', {
    day: 'numeric', month: 'numeric', year: 'numeric',
    hour: 'numeric', minute: 'numeric', hour12: true
  })
})

const print = () => {
  setTimeout(() => window.print(), 200)
}

defineExpose({ print })
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
          <span>{{ order.id ? order.id.slice(0, 8).toUpperCase() : '---' }}</span>
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
        <span class="total-money khmer-text">{{ formatCurrency(order.total) }}៛</span>
      </div>

      <div class="separator"></div>

      <div class="footer">
        <p class="footer-msg">{{ settings.printer_footer }}</p>
        
        <div v-if="settings.wifi_pass" class="wifi-section">
          <span class="wifi-label">WiFi Password:</span>
          <span class="wifi-code">{{ settings.wifi_pass }}</span>
        </div>
        
        <br>
        <div class="cut-feed">.</div> 
      </div>

    </div>
  </Teleport>
</template>

<style>
/* GLOBAL PRINT STYLES */
@media print {
  
  @page {
    margin: 0;
    size: 58mm auto;
  }

  body * { visibility: hidden; }
  
  #receipt-container, #receipt-container * {
    visibility: visible;
  }

  #receipt-container {
    position: absolute;
    left: 0;
    top: 0;
    width: 58mm;
    padding: 0 4px;
    box-sizing: border-box;
    
    background: white;
    color: black;
    
    /* FIX: Use Montserrat explicitly */
    font-family: 'Montserrat', sans-serif;
    font-size: 13px;
    font-weight: 500; /* Medium weight */
    line-height: 1.5; /* Good spacing */
  }

  /* KHMER FONT UTILITY */
  .khmer-text {
    font-family: 'Preahvihear', cursive; /* Specific for prices */
    font-weight: 400; /* Khmer fonts are usually thick enough */
  }

  /* HEADER */
  .header { text-align: center; margin-bottom: 5px; }
  
  .brand { 
    font-size: 20px; 
    font-weight: 600; /* Semi-Bold (not full Bold) */
    margin: 10px 0 5px 0;
  }
  
  .address { font-size: 11px; }

  /* SEPARATOR */
  .separator {
    border-bottom: 1px dashed #333;
    margin: 8px 0;
    width: 100%;
  }

  /* INFO */
  .info-row {
    display: flex;
    justify-content: space-between;
    font-size: 11px;
    font-weight: 500;
  }

  /* ITEMS */
  .item-row { margin-bottom: 8px; }
  
  .item-name {
    font-size: 14px;
    font-weight: 600; /* Semi-bold for item name */
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
    justify-content: space-between; /* Pushes total to right */
    padding-left: 10px; /* Indent slightly */
    font-size: 13px;
    margin-top: 2px;
  }

  .line-total {
    font-weight: 600;
  }

  /* TOTAL SECTION */
  .total-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 5px 0;
  }

  .total-label {
    font-size: 16px;
    font-weight: 600;
  }

  .total-money {
    font-size: 22px; 
    /* No font-weight here because 'khmer-text' class handles it */
  }

  /* FOOTER */
  .footer { text-align: center; font-size: 11px; }

  .wifi-section {
    margin-top: 10px;
    border: 1px solid #000;
    padding: 4px;
    border-radius: 4px;
  }
  
  .wifi-code { font-size: 14px; font-weight: 600; }

  .cut-feed { padding-bottom: 30px; color: white; }
}

#receipt-container { display: none; }
</style>
