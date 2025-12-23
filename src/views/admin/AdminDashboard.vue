<script setup>
import { ref, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useUserStore } from '../../stores/userStore' // Import User Store
import { Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, 
  Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale 
} from 'chart.js'
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, 
  ShoppingBag, CreditCard, Clock, Package, ChevronRight, Store 
} from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const router = useRouter()
const userStore = useUserStore()

// State
const loading = ref(true)
const timeRange = ref('30') // 'today', '7', '30'
const selectedStore = ref('all') // Default to showing all
const stores = ref([]) // List of available stores
const stats = ref({ 
  revenue: 0, revenueGrowth: 0,
  orders: 0, ordersGrowth: 0,
  avg: 0, avgGrowth: 0
})
const recentOrders = ref([])
const topProducts = ref([])
const chartData = ref({ labels: [], datasets: [] })

// Chart Config
const barOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'monospace' }, color: '#94a3b8' } },
    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { callback: (val) => val >= 1000 ? `${val/1000}k` : val, font: { size: 10, family: 'monospace' }, color: '#94a3b8' } }
  }
}

// Helpers
const formatCurrency = (amount) => new Intl.NumberFormat('en-US').format(amount) + ' ៛'
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
const getGradient = (ctx, chartArea) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, '#0f172a') 
  gradient.addColorStop(1, '#64748b') 
  return gradient
}
const viewAllOrders = () => router.push('/admin/orders')

// --- DATA FETCHING ---

// 1. Fetch Stores for the Dropdown
const fetchStores = async () => {
  const { data } = await supabase.from('stores').select('id, name')
  stores.value = data || []
}

// 2. Fetch Dashboard Data
const fetchDashboardData = async () => {
  loading.value = true
  
  const now = new Date()
  const startDate = new Date()
  
  if (timeRange.value === 'today') startDate.setHours(0,0,0,0)
  else startDate.setDate(now.getDate() - parseInt(timeRange.value))

  const prevStartDate = new Date(startDate)
  if (timeRange.value === 'today') prevStartDate.setDate(startDate.getDate() - 1)
  else prevStartDate.setDate(startDate.getDate() - parseInt(timeRange.value))

  // Base Queries
  let currentQuery = supabase
    .from('orders')
    .select('total_amount, created_at, drinks')
    .gte('created_at', startDate.toISOString())
    .lte('created_at', now.toISOString())

  let prevQuery = supabase
    .from('orders')
    .select('total_amount')
    .gte('created_at', prevStartDate.toISOString())
    .lt('created_at', startDate.toISOString())

  // --- FILTER BY STORE IF SELECTED ---
  if (selectedStore.value !== 'all') {
    currentQuery = currentQuery.eq('store_id', selectedStore.value)
    prevQuery = prevQuery.eq('store_id', selectedStore.value)
  }

  // Execute Queries
  const { data: currentOrders } = await currentQuery
  const { data: prevOrders } = await prevQuery

  // Calculations
  const currRev = currentOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
  const prevRev = prevOrders?.reduce((sum, o) => sum + o.total_amount, 0) || 0
  const currCount = currentOrders?.length || 0
  const prevCount = prevOrders?.length || 0

  stats.value = {
    revenue: currRev,
    revenueGrowth: prevRev === 0 ? 100 : ((currRev - prevRev) / prevRev) * 100,
    orders: currCount,
    ordersGrowth: prevCount === 0 ? 100 : ((currCount - prevCount) / prevCount) * 100,
    avg: currCount ? Math.round(currRev / currCount) : 0,
    avgGrowth: 0 
  }

  // Recent Orders (Need full select for display)
  let recentQuery = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(5)
  
  if (selectedStore.value !== 'all') {
    recentQuery = recentQuery.eq('store_id', selectedStore.value)
  }
  const { data: recentData } = await recentQuery
  recentOrders.value = recentData || []

  // Top Products Logic
  const productMap = {}
  currentOrders?.forEach(order => {
    const items = order.drinks || [] // Assuming JSONB structure
    items.forEach(item => {
      // Handle legacy string JSON or object
      const name = typeof item === 'string' ? JSON.parse(item).name : item.name
      const price = typeof item === 'string' ? JSON.parse(item).price : item.price
      const qty = item.qty || 1
      
      if (!productMap[name]) productMap[name] = { name, qty: 0, revenue: 0 }
      productMap[name].qty += qty
      productMap[name].revenue += (price * qty)
    })
  })
  topProducts.value = Object.values(productMap).sort((a, b) => b.qty - a.qty).slice(0, 5)

  // Chart Data
  const chartMap = {}
  currentOrders?.forEach(order => {
    const key = new Date(order.created_at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })
    chartMap[key] = (chartMap[key] || 0) + order.total_amount
  })
  
  chartData.value = {
    labels: Object.keys(chartMap),
    datasets: [{
      label: 'Revenue',
      data: Object.values(chartMap),
      backgroundColor: (ctx) => {
        const chart = ctx.chart
        const { ctx: canvasCtx, chartArea } = chart
        if (!chartArea) return null
        return getGradient(canvasCtx, chartArea)
      },
      borderRadius: 4,
      barThickness: 'flex',
      maxBarThickness: 40
    }]
  }

  loading.value = false
}

// Watchers
watch([timeRange, selectedStore], () => fetchDashboardData())

onMounted(() => {
  if (userStore.role === 'admin') fetchStores() // Only fetch store list if admin
  fetchDashboardData()
  
  supabase.channel('dashboard-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, () => fetchDashboardData())
    .subscribe()
})
</script>

<template>
  <div class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10">
    
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">Dashboard Overview</h2>
        <p class="text-xs text-slate-500 mt-1">Real-time store performance and analytics.</p>
      </div>
      
      <div class="flex flex-col sm:flex-row gap-3">
        <div v-if="userStore.role === 'admin'" class="relative">
          <Store class="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
          <select 
            v-model="selectedStore" 
            class="pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:border-slate-900 shadow-sm appearance-none cursor-pointer hover:border-slate-300 transition-all min-w-35"
          >
            <option value="all">All Stores</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
          <div class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
             <div class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-4 border-t-slate-400"></div>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-1 p-1 bg-white border border-slate-200 rounded-lg shadow-sm">
          <button 
            v-for="range in [{l:'Today', v:'today'}, {l:'7 Days', v:'7'}, {l:'30 Days', v:'30'}]" 
            :key="range.v"
            @click="timeRange = range.v"
            class="px-3 py-1.5 text-xs font-medium rounded-md transition-all text-center"
            :class="timeRange === range.v ? 'bg-slate-900 text-white shadow-md' : 'text-slate-500 hover:text-slate-900'"
          >
            {{ range.l }}
          </button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <DollarSign class="w-5 h-5 text-slate-400 group-hover:text-white" />
          </div>
          <div class="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" 
            :class="stats.revenueGrowth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
            <component :is="stats.revenueGrowth >= 0 ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />
            {{ Math.abs(stats.revenueGrowth).toFixed(1) }}%
          </div>
        </div>
        <p class="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Total Revenue</p>
        <h3 class="text-2xl font-semibold text-slate-900 mt-1">{{ formatCurrency(stats.revenue) }}</h3>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <ShoppingBag class="w-5 h-5 text-slate-400 group-hover:text-white" />
          </div>
          <div class="flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-full" 
            :class="stats.ordersGrowth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'">
            <component :is="stats.ordersGrowth >= 0 ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />
            {{ Math.abs(stats.ordersGrowth).toFixed(1) }}%
          </div>
        </div>
        <p class="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Total Orders</p>
        <h3 class="text-2xl font-semibold text-slate-900 mt-1">{{ stats.orders }}</h3>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group sm:col-span-2 lg:col-span-1">
        <div class="flex justify-between items-start mb-4">
          <div class="p-2 bg-slate-50 rounded-lg group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <CreditCard class="w-5 h-5 text-slate-400 group-hover:text-white" />
          </div>
        </div>
        <p class="text-[10px] uppercase font-semibold text-slate-400 tracking-widest">Avg. Order Value</p>
        <h3 class="text-2xl font-semibold text-slate-900 mt-1">{{ formatCurrency(stats.avg) }}</h3>
      </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div class="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="p-1.5 bg-slate-50 rounded-md border border-slate-100"><TrendingUp class="w-4 h-4 text-slate-600" /></div>
          <h3 class="font-semibold text-sm text-slate-900">Revenue Trends</h3>
        </div>
        <div class="h-64 w-full">
          <Bar v-if="!loading && chartData.labels.length" :data="chartData" :options="barOptions" />
          <div v-else class="h-full flex flex-col items-center justify-center text-slate-300 gap-2">
            <div v-if="loading" class="w-8 h-8 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
            <span v-else class="text-xs">No data for this period</span>
          </div>
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
        <div class="flex items-center gap-2 mb-6">
          <div class="p-1.5 bg-slate-50 rounded-md border border-slate-100"><Package class="w-4 h-4 text-slate-600" /></div>
          <h3 class="font-semibold text-sm text-slate-900">Top Items</h3>
        </div>
        <div class="space-y-4">
          <div v-for="(item, idx) in topProducts" :key="idx" class="flex items-center justify-between group cursor-default">
            <div class="flex items-center gap-3">
              <span class="text-xs font-mono text-slate-400 w-4 group-hover:text-slate-900 transition-colors">0{{idx+1}}</span>
              <div>
                <p class="text-xs font-medium text-slate-900">{{ item.name }}</p>
                <p class="text-[10px] text-slate-500">{{ item.qty }} sold</p>
              </div>
            </div>
            <span class="text-xs font-semibold text-slate-700">{{ formatCurrency(item.revenue) }}</span>
          </div>
          <div v-if="topProducts.length === 0" class="text-center py-8 text-xs text-slate-400">
            No sales data yet
          </div>
        </div>
      </div>
    </div>

    <div class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="p-4 sm:p-6 border-b border-slate-50 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-slate-50 rounded-md border border-slate-100"><Clock class="w-4 h-4 text-slate-600" /></div>
          <h3 class="font-semibold text-sm text-slate-900">Recent Orders</h3>
        </div>
        
        <button 
          @click="viewAllOrders" 
          class="flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition-colors"
        >
          View All <ChevronRight class="w-3 h-3" />
        </button>
      </div>

      <div class="overflow-x-auto scrollbar-hide">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-semibold tracking-wider">
            <tr>
              <th class="px-4 sm:px-6 py-3 whitespace-nowrap">Order ID</th>
              <th class="px-4 sm:px-6 py-3 whitespace-nowrap">Date</th>
              <th class="px-4 sm:px-6 py-3 whitespace-nowrap">Items</th>
              <th class="px-4 sm:px-6 py-3 text-right whitespace-nowrap">Amount</th>
              <th class="px-4 sm:px-6 py-3 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-4 sm:px-6 py-3 text-xs font-mono text-slate-500 whitespace-nowrap">#{{ order.id }}</td>
              <td class="px-4 sm:px-6 py-3 text-xs text-slate-600 whitespace-nowrap">{{ formatDate(order.created_at) }}</td>
              <td class="px-4 sm:px-6 py-3 text-xs text-slate-900 font-medium whitespace-nowrap max-w-37.5 truncate">
                {{ order.drinks?.length || 0 }} items
              </td>
              <td class="px-4 sm:px-6 py-3 text-xs font-semibold text-slate-900 text-right whitespace-nowrap">{{ formatCurrency(order.total_amount) }}</td>
              <td class="px-4 sm:px-6 py-3 text-center whitespace-nowrap">
                <span class="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-700 border border-green-100">
                  Completed
                </span>
              </td>
            </tr>
          </tbody>
        </table>
        <div v-if="recentOrders.length === 0" class="p-8 text-center text-xs text-slate-400">
          No orders found for this period.
        </div>
      </div>
    </div>
  </div>
</template>