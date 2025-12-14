<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { supabase } from '../../services/supabase'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { TrendingUp, ShoppingBag, Clock, Calendar, ChevronDown } from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const loading = ref(true)
const totalRevenue = ref(0)
const totalOrders = ref(0)
const averageTicket = ref(0)
const topProducts = ref([])
const recentOrders = ref([])

// 1. TIME RANGE STATE
const timeRange = ref('today') // options: today, yesterday, week, month, all
const chartLabels = ref([])
const chartValues = ref([])

// 2. CHART CONFIG (Dynamic)
const chartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [{
    label: 'Sales',
    backgroundColor: '#000000',
    barPercentage: 0.5,
    categoryPercentage: 0.8,
    data: chartValues.value
  }]
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { backgroundColor: '#000', titleFont: { family: 'monospace' }, bodyFont: { family: 'monospace' } } },
  scales: {
    y: { border: { display: false }, grid: { color: '#f4f4f5' }, ticks: { font: { family: 'monospace', size: 10 }, color: '#a1a1aa' } },
    x: { grid: { display: false }, ticks: { font: { family: 'monospace', size: 10 }, color: '#a1a1aa' } }
  }
}

const fetchDashboardData = async () => {
  loading.value = true
  
  const now = new Date()
  let start = new Date()
  let end = new Date()
  let groupBy = 'hour' // 'hour' or 'day'

  // 3. DETERMINE DATE RANGE
  switch (timeRange.value) {
    case 'today':
      start.setHours(0,0,0,0); end.setHours(23,59,59,999);
      break;
    case 'yesterday':
      start.setDate(now.getDate() - 1); start.setHours(0,0,0,0);
      end.setDate(now.getDate() - 1); end.setHours(23,59,59,999);
      break;
    case 'week':
      // Start of week (Monday)
      const day = now.getDay() || 7; 
      if(day !== 1) start.setHours(-24 * (day - 1)); 
      else start.setHours(0,0,0,0);
      groupBy = 'day';
      break;
    case 'month':
      start.setDate(1); start.setHours(0,0,0,0);
      groupBy = 'day';
      break;
    case 'all':
      start = new Date(0); // Beginning of time
      groupBy = 'day';
      break;
  }

  // 4. QUERY SUPABASE
  let query = supabase
    .from('orders')
    .select('*')
    .lte('created_at', end.toISOString())
    .order('created_at', { ascending: true }) // Oldest first for chart logic
  
  if (timeRange.value !== 'all') {
    query = query.gte('created_at', start.toISOString())
  }

  const { data: orders } = await query

  // 5. PROCESS DATA
  totalRevenue.value = 0
  totalOrders.value = 0
  chartLabels.value = []
  chartValues.value = []
  const chartMap = {} // Key: Hour or Date, Value: Total

  if (orders && orders.length > 0) {
    totalOrders.value = orders.length
    totalRevenue.value = orders.reduce((sum, o) => sum + o.total, 0)
    averageTicket.value = Math.round(totalRevenue.value / totalOrders.value)

    // Build Chart & Top Products
    const productMap = {}

    orders.forEach(order => {
      // A. Chart Grouping
      const dateObj = new Date(order.created_at)
      let key = ''
      
      if (groupBy === 'hour') {
        key = dateObj.getHours() + ':00'
      } else {
        key = dateObj.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) // "15 Dec"
      }

      if (!chartMap[key]) chartMap[key] = 0
      chartMap[key] += order.total

      // B. Top Products
      if (order.drinks) {
        order.drinks.forEach(d => {
          if (!productMap[d.name]) productMap[d.name] = { name: d.name, qty: 0, revenue: 0 }
          productMap[d.name].qty += d.qty
          productMap[d.name].revenue += (d.price * d.qty)
        })
      }
    })

    // Fill Chart Arrays
    chartLabels.value = Object.keys(chartMap)
    chartValues.value = Object.values(chartMap)

    // Sort Top Products
    topProducts.value = Object.values(productMap).sort((a,b) => b.qty - a.qty).slice(0, 5)
    
    // Recent Orders (Last 5)
    recentOrders.value = [...orders].reverse().slice(0, 5)
  } else {
    topProducts.value = []
    recentOrders.value = []
  }
  
  loading.value = false
}

watch(timeRange, () => fetchDashboardData())
onMounted(() => fetchDashboardData())
</script>

<template>
  <div class="space-y-8 max-w-7xl mx-auto">
    
    <div class="flex flex-col md:flex-row md:items-end justify-between border-b border-zinc-200 pb-6 gap-4">
      <div>
        <h2 class="text-3xl font-bold tracking-tight text-black mb-1">DASHBOARD</h2>
        <p class="font-mono text-xs text-zinc-500 uppercase tracking-widest">
          Analytic Overview
        </p>
      </div>

      <div class="flex items-center gap-3">
        <label class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Time Range:</label>
        <div class="relative group">
          <select 
            v-model="timeRange"
            class="appearance-none bg-transparent border-b border-zinc-300 py-1 pl-1 pr-8 font-bold text-sm text-black focus:outline-none focus:border-black cursor-pointer uppercase tracking-wide"
          >
            <option value="today">Today</option>
            <option value="yesterday">Yesterday</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
            <option value="all">Overall (All Time)</option>
          </select>
          <ChevronDown class="w-4 h-4 absolute right-0 top-1 pointer-events-none text-black" />
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
      <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-zinc-50 group-hover:bg-black group-hover:text-white transition-colors">
            <TrendingUp class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Total Revenue</span>
        </div>
        <div class="text-4xl font-bold text-black tracking-tighter">
          {{ totalRevenue.toLocaleString() }}៛
        </div>
      </div>

      <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-zinc-50 group-hover:bg-black group-hover:text-white transition-colors">
            <ShoppingBag class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Transactions</span>
        </div>
        <div class="text-4xl font-bold text-black tracking-tighter">
          {{ totalOrders }}
        </div>
      </div>

      <div class="bg-white p-6 border border-zinc-200 hover:border-black transition-colors group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-zinc-50 group-hover:bg-black group-hover:text-white transition-colors">
            <Clock class="w-5 h-5" />
          </div>
          <span class="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Avg. Ticket</span>
        </div>
        <div class="text-4xl font-bold text-black tracking-tighter">
          {{ averageTicket.toLocaleString() }}៛
        </div>
      </div>
    </div>

    <div class="bg-white p-8 border border-zinc-200 h-80 relative">
      <div class="absolute top-6 left-8 z-10">
         <h3 class="font-bold text-xs uppercase tracking-widest mb-1">Sales Trend</h3>
         <p class="text-[10px] text-zinc-400 font-mono uppercase">
           {{ timeRange === 'today' || timeRange === 'yesterday' ? 'Hourly Volume' : 'Daily Volume' }}
         </p>
      </div>
      <div v-if="loading" class="h-full flex items-center justify-center font-mono text-xs text-zinc-400">LOADING DATA...</div>
      <div v-else-if="totalOrders === 0" class="h-full flex items-center justify-center font-mono text-xs text-zinc-300">NO DATA IN THIS PERIOD</div>
      <div v-else class="h-full w-full pt-8">
        <Bar :data="chartData" :options="chartOptions" />
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-8">
      
      <div class="bg-white border border-zinc-200 p-0 overflow-hidden flex flex-col">
        <div class="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 class="font-bold text-xs uppercase tracking-widest">Top Performers</h3>
          <span class="text-[10px] font-mono text-zinc-400 uppercase">{{ timeRange }}</span>
        </div>
        <div class="flex-1">
          <table class="w-full text-left">
            <tbody class="text-sm">
              <tr v-if="topProducts.length === 0" class="border-b border-zinc-50">
                <td class="p-6 text-center text-zinc-400 font-mono text-xs">NO DATA</td>
              </tr>
              <tr v-for="(item, i) in topProducts" :key="item.name" class="border-b border-zinc-50 hover:bg-zinc-50 transition-colors">
                <td class="p-4 pl-6 font-mono text-zinc-400 w-10">0{{ i + 1 }}</td>
                <td class="p-4 font-bold text-zinc-800">{{ item.name }}</td>
                <td class="p-4 text-right font-mono text-zinc-500">{{ item.qty }}</td>
                <td class="p-4 pr-6 text-right font-bold text-black">{{ item.revenue.toLocaleString() }}៛</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div class="bg-white border border-zinc-200 p-0 overflow-hidden flex flex-col">
        <div class="p-6 border-b border-zinc-100 flex justify-between items-center bg-zinc-50/50">
          <h3 class="font-bold text-xs uppercase tracking-widest">Recent Orders</h3>
          <span class="text-[10px] font-mono text-zinc-400">NEWEST FIRST</span>
        </div>
        <div class="flex-1 max-h-[400px] overflow-y-auto scrollbar-hide">
           <div v-if="recentOrders.length === 0" class="p-6 text-center text-zinc-400 font-mono text-xs">
              NO ORDERS
           </div>
           <div v-else class="divide-y divide-zinc-50">
             <div v-for="order in recentOrders" :key="order.id" class="p-4 px-6 flex justify-between items-center hover:bg-zinc-50 transition-colors">
               <div class="flex flex-col">
                 <span class="font-bold text-sm text-black">#{{ order.id.toString().slice(0,6).toUpperCase() }}</span>
                 <span class="text-[10px] font-mono text-zinc-400">
                   {{ new Date(order.created_at).toLocaleDateString() }} • 
                   {{ new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) }}
                 </span>
               </div>
               <div class="text-right">
                  <span class="block font-bold text-sm">{{ order.total.toLocaleString() }}៛</span>
                  <span class="block text-[10px] text-zinc-400">{{ order.drinks.length }} items</span>
               </div>
             </div>
           </div>
        </div>
      </div>

    </div>
  </div>
</template>