<script setup>
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { supabase } from '../../services/supabase'
import { useUserStore } from '../../stores/userStore' 
import { Bar } from 'vue-chartjs'
import { 
  Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale 
} from 'chart.js'
import { 
  TrendingUp, ArrowUpRight, ArrowDownRight, DollarSign, 
  ShoppingBag, CreditCard, Clock, Package, ChevronRight, Store, 
  Wallet, QrCode, Banknote 
} from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const router = useRouter()
const userStore = useUserStore()

// State
const loading = ref(true)
const timeRange = ref('30') 
const selectedStore = ref('all') 
const stores = ref([]) 
const stats = ref({ revenue: 0, revenueGrowth: 0, orders: 0, ordersGrowth: 0, avg: 0, avgGrowth: 0 })
const paymentStats = ref({ cash: 0, aba: 0, acleda: 0 })
const recentOrders = ref([])
const topProducts = ref([])
const chartData = ref({ labels: [], datasets: [] })
const EXCHANGE_RATE = 4100 

// Options
const barOptions = {
  responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 9, family: 'monospace' }, color: '#94a3b8' } },
    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { callback: (val) => val >= 1000 ? `${val/1000}k` : val, font: { size: 9, family: 'monospace' }, color: '#94a3b8' } }
  }
}

// Helpers
const formatCurrency = (amount) => new Intl.NumberFormat('en-US').format(amount) + ' ៛'
const formatUSD = (amountInRiel) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amountInRiel / EXCHANGE_RATE)
const formatDate = (dateStr) => new Date(dateStr).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })
const getGradient = (ctx, chartArea) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  gradient.addColorStop(0, '#0f172a') 
  gradient.addColorStop(1, '#64748b') 
  return gradient
}
const viewAllOrders = () => router.push('/admin/orders')

// --- DATA FETCHING ---
const fetchStores = async () => {
  if (!userStore.organizationId) return
  const { data } = await supabase.from('stores').select('id, name').eq('organization_id', userStore.organizationId)
  stores.value = data || []
}

const fetchDashboardData = async () => {
  if (!userStore.organizationId) return
  loading.value = true
  
  const now = new Date()
  const startDate = new Date()
  
  if (timeRange.value === 'today') startDate.setHours(0,0,0,0)
  else startDate.setDate(now.getDate() - parseInt(timeRange.value))

  const prevStartDate = new Date(startDate)
  if (timeRange.value === 'today') prevStartDate.setDate(startDate.getDate() - 1)
  else prevStartDate.setDate(startDate.getDate() - parseInt(timeRange.value))

  let currentQuery = supabase.from('orders').select('total_amount, created_at, drinks, payment_method').gte('created_at', startDate.toISOString()).lte('created_at', now.toISOString()).eq('organization_id', userStore.organizationId)
  let prevQuery = supabase.from('orders').select('total_amount').gte('created_at', prevStartDate.toISOString()).lt('created_at', startDate.toISOString()).eq('organization_id', userStore.organizationId)

  if (userStore.role !== 'admin') {
    currentQuery = currentQuery.eq('store_id', userStore.storeId)
    prevQuery = prevQuery.eq('store_id', userStore.storeId)
  } else if (selectedStore.value !== 'all') {
    currentQuery = currentQuery.eq('store_id', selectedStore.value)
    prevQuery = prevQuery.eq('store_id', selectedStore.value)
  }

  const { data: currentOrders } = await currentQuery
  const { data: prevOrders } = await prevQuery

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

  // Payment Stats
  let cashTotal = 0, abaTotal = 0, acledaTotal = 0;
  currentOrders?.forEach(order => {
    const method = (order.payment_method || 'Cash').toLowerCase();
    if (method.includes('aba')) abaTotal += order.total_amount;
    else if (method.includes('acleda')) acledaTotal += order.total_amount;
    else cashTotal += order.total_amount;
  });
  paymentStats.value = { cash: cashTotal, aba: abaTotal, acleda: acledaTotal };

  // Recent Orders (Including display_id)
  let recentQuery = supabase.from('orders').select('*').eq('organization_id', userStore.organizationId).order('created_at', { ascending: false }).limit(5)
  if (userStore.role !== 'admin') recentQuery = recentQuery.eq('store_id', userStore.storeId)
  else if (selectedStore.value !== 'all') recentQuery = recentQuery.eq('store_id', selectedStore.value)
  const { data: recentData } = await recentQuery
  recentOrders.value = recentData || []

  // Top Products
  const productMap = {}
  currentOrders?.forEach(order => {
    const items = order.drinks || [] 
    items.forEach(item => {
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
        if (!ctx.chart.chartArea) return null
        return getGradient(ctx.chart.ctx, ctx.chart.chartArea)
      },
      borderRadius: 4, barThickness: 'flex', maxBarThickness: 40
    }]
  }
  loading.value = false
}

watch([timeRange, selectedStore], () => fetchDashboardData())
onMounted(() => {
  if (userStore.isAdminOrSuper) fetchStores()
  fetchDashboardData()
  const subscription = supabase.channel('dashboard-updates')
    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders', filter: `organization_id=eq.${userStore.organizationId}` }, () => fetchDashboardData())
    .subscribe()
  onUnmounted(() => supabase.removeChannel(subscription))
})
</script>

<template>
  <div class="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20">
    <div class="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
      <div><h2 class="text-xl font-bold tracking-tight text-slate-900">{{ selectedStore !== 'all' ? stores.find(s => s.id === selectedStore)?.name : 'Dashboard' }}</h2></div>
      <div class="flex items-center gap-2">
        <div v-if="userStore.role === 'admin'" class="relative">
          <Store class="absolute left-2.5 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400" />
          <select v-model="selectedStore" class="pl-8 pr-7 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 focus:outline-none focus:border-slate-900 shadow-sm cursor-pointer hover:border-slate-300 transition-all">
            <option value="all">All Stores</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">{{ store.name }}</option>
          </select>
        </div>
        <div class="flex p-1 bg-white border border-slate-200 rounded-lg shadow-sm gap-1">
          <button v-for="range in [{l:'Today', v:'today'}, {l:'7D', v:'7'}, {l:'30D', v:'30'}]" :key="range.v" @click="timeRange = range.v" class="px-2.5 py-1 text-[10px] font-semibold rounded-md transition-all text-center uppercase tracking-wide" :class="timeRange === range.v ? 'bg-slate-900 text-white shadow-sm' : 'text-slate-500 hover:text-slate-900'">{{ range.l }}</button>
        </div>
      </div>
    </div>

    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
       <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group lg:col-span-2">
          <div class="flex justify-between items-start mb-2">
            <div class="p-1.5 bg-slate-50 rounded-md group-hover:bg-slate-900 group-hover:text-white transition-colors"><DollarSign class="w-4 h-4 text-slate-400 group-hover:text-white" /></div>
            <div class="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" :class="stats.revenueGrowth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'"><component :is="stats.revenueGrowth >= 0 ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />{{ Math.abs(stats.revenueGrowth).toFixed(1) }}%</div>
          </div>
          <p class="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Total Revenue</p>
          <h3 class="text-2xl font-semibold text-slate-900 mt-0.5 mb-3">{{ formatCurrency(stats.revenue) }}</h3>
          <div class="grid grid-cols-3 gap-2 border-t border-slate-100 pt-3">
            <div><div class="flex items-center gap-1 mb-0.5"><QrCode class="w-3 h-3 text-blue-500" /><span class="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">ABA</span></div><div class="text-xs font-semibold text-slate-700">{{ formatCurrency(paymentStats.aba) }}</div></div>
            <div class="border-l border-slate-100 pl-3"><div class="flex items-center gap-1 mb-0.5"><CreditCard class="w-3 h-3 text-indigo-500" /><span class="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Acleda</span></div><div class="text-xs font-semibold text-slate-700">{{ formatCurrency(paymentStats.acleda) }}</div></div>
            <div class="border-l border-slate-100 pl-3"><div class="flex items-center gap-1 mb-0.5"><Banknote class="w-3 h-3 text-emerald-500" /><span class="text-[9px] uppercase font-semibold text-slate-400 tracking-wider">Cash</span></div><div class="text-xs font-semibold text-slate-700">{{ formatCurrency(paymentStats.cash) }}</div></div>
          </div>
       </div>
       <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between">
          <div><div class="flex justify-between items-start mb-2"><div class="p-1.5 bg-slate-50 rounded-md group-hover:bg-slate-900 group-hover:text-white transition-colors"><ShoppingBag class="w-4 h-4 text-slate-400 group-hover:text-white" /></div><div class="flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md" :class="stats.ordersGrowth >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'"><component :is="stats.ordersGrowth >= 0 ? ArrowUpRight : ArrowDownRight" class="w-3 h-3" />{{ Math.abs(stats.ordersGrowth).toFixed(1) }}%</div></div><p class="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Orders</p><h3 class="text-2xl font-semibold text-slate-900 mt-0.5">{{ stats.orders }}</h3></div>
       </div>
       <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm relative overflow-hidden group flex flex-col justify-between">
          <div><div class="flex justify-between items-start mb-2"><div class="p-1.5 bg-slate-50 rounded-md group-hover:bg-slate-900 group-hover:text-white transition-colors"><CreditCard class="w-4 h-4 text-slate-400 group-hover:text-white" /></div></div><p class="text-[10px] uppercase font-semibold text-slate-400 tracking-wider">Avg Value (USD)</p><h3 class="text-2xl font-semibold text-slate-900 mt-0.5">{{ formatUSD(stats.avg) }}</h3><p class="text-[9px] text-slate-400 mt-1">approx {{ formatCurrency(stats.avg) }}</p></div>
       </div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div class="flex items-center gap-2 mb-3"><div class="p-1 bg-slate-50 rounded-md border border-slate-100"><TrendingUp class="w-3.5 h-3.5 text-slate-600" /></div><h3 class="font-bold text-xs text-slate-900 uppercase tracking-wide">Revenue Trends</h3></div><div class="h-48 w-full"><Bar v-if="!loading && chartData.labels.length" :data="chartData" :options="barOptions" /><div v-else class="h-full flex flex-col items-center justify-center text-slate-300 gap-2"><div v-if="loading" class="w-6 h-6 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div><span v-else class="text-[10px]">No data</span></div></div></div>
      
      <div class="bg-white p-4 rounded-xl border border-slate-100 shadow-sm"><div class="flex items-center gap-2 mb-3"><div class="p-1 bg-slate-50 rounded-md border border-slate-100"><Package class="w-3.5 h-3.5 text-slate-600" /></div><h3 class="font-bold text-xs text-slate-900 uppercase tracking-wide">Top Items</h3></div><div class="space-y-3"><div v-for="(item, idx) in topProducts" :key="idx" class="flex items-center justify-between group cursor-default"><div class="flex items-center gap-2"><span class="text-[10px] font-mono text-slate-400 w-3 group-hover:text-slate-900 transition-colors">0{{idx+1}}</span><div><p class="text-[11px] font-semibold text-slate-900 leading-tight">{{ item.name }}</p><p class="text-[9px] text-slate-500">{{ item.qty }} sold</p></div></div><span class="text-[11px] font-semibold text-slate-700">{{ formatCurrency(item.revenue) }}</span></div><div v-if="topProducts.length === 0" class="text-center py-8 text-[10px] text-slate-400">No data yet</div></div></div>
    </div>
    
    <div class="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
      <div class="px-4 py-3 border-b border-slate-50 flex items-center justify-between">
        <div class="flex items-center gap-2"><div class="p-1 bg-slate-50 rounded-md border border-slate-100"><Clock class="w-3.5 h-3.5 text-slate-600" /></div><h3 class="font-bold text-xs text-slate-900 uppercase tracking-wide">Recent Orders</h3></div>
        <button @click="viewAllOrders" class="flex items-center gap-1 text-[9px] font-semibold text-slate-500 hover:text-slate-900 uppercase tracking-wide transition-colors">View All <ChevronRight class="w-3 h-3" /></button>
      </div>
      <div class="overflow-x-auto scrollbar-hide">
        <table class="w-full text-left border-collapse">
          <thead class="bg-slate-50/50 text-[9px] uppercase text-slate-400 font-semibold tracking-wider">
            <tr>
              <th class="px-4 py-2 whitespace-nowrap">ID</th>
              <th class="px-4 py-2 whitespace-nowrap">Date</th>
              <th class="px-4 py-2 whitespace-nowrap">Items</th>
              <th class="px-4 py-2 whitespace-nowrap">Payment</th>
              <th class="px-4 py-2 text-right whitespace-nowrap">Amount</th>
              <th class="px-4 py-2 text-center whitespace-nowrap">Status</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-for="order in recentOrders" :key="order.id" class="hover:bg-slate-50/50 transition-colors">
              <td class="px-4 py-2 text-[10px] font-mono text-slate-900 font-bold whitespace-nowrap">
                {{ order.display_id || '#' + order.id.slice(0, 4) }}
              </td>
              <td class="px-4 py-2 text-[10px] text-slate-600 whitespace-nowrap">{{ formatDate(order.created_at) }}</td>
              <td class="px-4 py-2 text-[10px] text-slate-900 font-medium whitespace-nowrap max-w-32 truncate">{{ order.drinks?.length || 0 }} items</td>
              <td class="px-4 py-2 text-[10px] text-slate-600 whitespace-nowrap">{{ order.payment_method || 'Cash' }}</td>
              <td class="px-4 py-2 text-[10px] font-semibold text-slate-900 text-right whitespace-nowrap">{{ formatCurrency(order.total_amount) }}</td>
              <td class="px-4 py-2 text-center whitespace-nowrap"><span class="inline-flex items-center px-1.5 py-0.5 rounded-sm text-[9px] font-semibold bg-green-50 text-green-700 border border-green-100">Done</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </div>
</template>