<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../../services/supabase'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { TrendingUp, ShoppingBag, Clock, ArrowUpRight, Calendar } from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const loading = ref(true)
const timeRange = ref('today')
const stats = ref({ revenue: 0, orders: 0, avg: 0 })
const topProducts = ref([])
const recentOrders = ref([])
const chartData = ref({ labels: [], datasets: [] })

/* --- CHART CONFIG --- */
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { 
    backgroundColor: '#000', 
    padding: 12,
    titleFont: { family: 'sans-serif', size: 12 }, 
    bodyFont: { family: 'monospace', size: 12 },
    displayColors: false,
    cornerRadius: 8
  }},
  scales: {
    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { family: 'monospace', size: 10 }, color: '#94a3b8' } },
    x: { grid: { display: false }, ticks: { font: { family: 'sans-serif', size: 10 }, color: '#94a3b8' } }
  }
}

/* --- FETCH LOGIC --- */
const fetchData = async () => {
  loading.value = true
  
  const now = new Date()
  let start = new Date(), end = new Date(), groupBy = 'hour'

  if (timeRange.value === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
  else if (timeRange.value === 'week') { 
    const day = now.getDay() || 7; start.setHours(-24 * (day - 1)); groupBy = 'day'; 
  }
  else if (timeRange.value === 'month') { start.setDate(1); start.setHours(0,0,0,0); groupBy = 'day'; }

  // Query
  const { data: orders } = await supabase
    .from('orders')
    .select('*')
    .gte('created_at', start.toISOString())
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true })

  // Process Stats
  if (orders && orders.length) {
    stats.value.orders = orders.length
    stats.value.revenue = orders.reduce((acc, o) => acc + o.total, 0)
    stats.value.avg = Math.round(stats.value.revenue / stats.value.orders)

    // Chart Data
    const map = {}
    const productMap = {}
    
    orders.forEach(o => {
      const d = new Date(o.created_at)
      const k = groupBy === 'hour' ? `${d.getHours()}:00` : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      map[k] = (map[k] || 0) + o.total

      o.drinks?.forEach(drink => {
        if (!productMap[drink.name]) productMap[drink.name] = { ...drink, qty: 0, revenue: 0 }
        productMap[drink.name].qty += drink.qty
        productMap[drink.name].revenue += (drink.price * drink.qty)
      })
    })

    chartData.value = {
      labels: Object.keys(map),
      datasets: [{
        data: Object.values(map),
        backgroundColor: '#18181b',
        borderRadius: 4,
        barPercentage: 0.6
      }]
    }

    topProducts.value = Object.values(productMap).sort((a,b) => b.qty - a.qty).slice(0, 5)
    recentOrders.value = [...orders].reverse().slice(0, 6)
  } else {
    stats.value = { revenue: 0, orders: 0, avg: 0 }
    chartData.value = { labels: [], datasets: [] }
    topProducts.value = []
    recentOrders.value = []
  }
  loading.value = false
}

watch(timeRange, fetchData)
onMounted(fetchData)
</script>

<template>
  <div class="space-y-8">
    
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-slate-900">Dashboard</h2>
        <p class="text-xs font-medium text-slate-400 mt-1 uppercase tracking-widest">Business Overview</p>
      </div>
      
      <div class="flex items-center bg-white rounded-full p-1 ">
        <button 
          v-for="t in ['today', 'week', 'month']" 
          :key="t"
          @click="timeRange = t"
          class="px-4 py-2 border-none bg-white rounded-full text-xs font-medium cursor-pointer uppercase tracking-wider transition-all"
          :class="timeRange === t ? 'text-black' : 'text-slate-600' "
        >
          {{ t }}
        </button>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-6">
      <div v-for="(stat, key) in { 'Revenue': stats.revenue + '៛', 'Orders': stats.orders, 'Avg. Value': stats.avg + '៛' }" :key="key" 
        class="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex flex-col justify-between h-40 group hover:border-slate-300 transition-colors"
      >
        <div class="flex justify-between items-start">
          <span class="text-[10px] font-medium uppercase tracking-widest text-slate-400">{{ key }}</span>
          <div class="p-2 rounded-full bg-slate-50 group-hover:bg-black group-hover:text-white transition-colors">
            <ArrowUpRight class="w-4 h-4" />
          </div>
        </div>
        <div class="text-3xl font-medium text-slate-900 tracking-tight">{{ stat.toLocaleString() }}</div>
      </div>
    </div>

    <div class="bg-white p-6 sm:p-8 rounded-[32px] border border-slate-100 shadow-sm h-96 relative">
      <div class="absolute top-8 left-8">
        <h3 class="font-medium text-sm text-slate-900">Sales Trend</h3>
      </div>
      <div v-if="!loading" class="h-full w-full pt-8">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="p-8 border-b border-slate-50">
          <h3 class="font-medium text-sm">Top Performing Items</h3>
        </div>
        <div class="p-4 flex-1">
          <div v-for="(item, i) in topProducts" :key="item.name" class="flex items-center gap-4 p-4 hover:bg-slate-50 rounded-2xl transition-colors">
             <span class="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-medium text-slate-500 font-mono">
               {{ i + 1 }}
             </span>
             <div class="flex-1">
               <div class="font-medium text-sm text-slate-900">{{ item.name }}</div>
               <div class="text-[10px] text-slate-400 uppercase tracking-wider font-medium">{{ item.qty }} Sold</div>
             </div>
             <div class="font-khmer text-sm font-medium">{{ item.revenue.toLocaleString() }}៛</div>
          </div>
          <div v-if="!topProducts.length" class="p-8 text-center text-xs text-slate-400 uppercase tracking-widest">No Data Available</div>
        </div>
      </div>

      <div class="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden flex flex-col">
        <div class="p-8 border-b border-slate-50">
          <h3 class="font-medium text-sm">Recent Transactions</h3>
        </div>
        <div class="p-4 flex-1">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between p-4 hover:bg-slate-50 rounded-2xl transition-colors">
            <div class="flex items-center gap-4">
              <div class="w-10 h-10 rounded-full bg-slate-900 flex items-center justify-center text-white">
                <ShoppingBag class="w-4 h-4" />
              </div>
              <div>
                <div class="font-medium text-sm text-slate-900">Order #{{ order.id.toString().slice(0,4) }}</div>
                <div class="text-[10px] text-slate-400 uppercase font-mono mt-0.5">
                  {{ new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }}
                </div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-sm">{{ order.total.toLocaleString() }}៛</div>
              <div class="text-[10px] text-slate-400 font-medium">{{ order.drinks.length }} Items</div>
            </div>
          </div>
          <div v-if="!recentOrders.length" class="p-8 text-center text-xs text-slate-400 uppercase tracking-widest">No Transactions</div>
        </div>
      </div>

    </div>
  </div>
</template>