<script setup>
import { ref, onMounted, watch } from 'vue'
import { supabase } from '../../services/supabase'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { ShoppingBag, ArrowUpRight } from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const loading = ref(true)
const timeRange = ref('today')
const stats = ref({ revenue: 0, orders: 0, avg: 0 })
const topProducts = ref([])
const recentOrders = ref([])
const chartData = ref({ labels: [], datasets: [] })

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false }, tooltip: { 
    backgroundColor: '#000', padding: 8, titleFont: { size: 10 }, bodyFont: { size: 10 }, cornerRadius: 4
  }},
  scales: {
    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { size: 9 }, color: '#94a3b8' } },
    x: { grid: { display: false }, ticks: { font: { size: 9 }, color: '#94a3b8' } }
  }
}

const fetchData = async () => {
  loading.value = true
  const now = new Date(); let start = new Date(), end = new Date(), groupBy = 'hour'
  if (timeRange.value === 'today') { start.setHours(0,0,0,0); end.setHours(23,59,59,999); }
  else if (timeRange.value === 'week') { const day = now.getDay() || 7; start.setHours(-24 * (day - 1)); groupBy = 'day'; }
  else if (timeRange.value === 'month') { start.setDate(1); start.setHours(0,0,0,0); groupBy = 'day'; }

  const { data: orders } = await supabase.from('orders').select('*').gte('created_at', start.toISOString()).lte('created_at', end.toISOString()).order('created_at', { ascending: true })

  if (orders && orders.length) {
    stats.value.orders = orders.length
    stats.value.revenue = orders.reduce((acc, o) => acc + o.total, 0)
    stats.value.avg = Math.round(stats.value.revenue / stats.value.orders)

    const map = {}, productMap = {}
    orders.forEach(o => {
      const d = new Date(o.created_at)
      const k = groupBy === 'hour' ? `${d.getHours()}:00` : d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
      map[k] = (map[k] || 0) + o.total
      o.drinks?.forEach(d => {
        if (!productMap[d.name]) productMap[d.name] = { ...d, qty: 0, revenue: 0 }
        productMap[d.name].qty += d.qty; productMap[d.name].revenue += (d.price * d.qty)
      })
    })

    chartData.value = { labels: Object.keys(map), datasets: [{ data: Object.values(map), backgroundColor: '#18181b', borderRadius: 2, barPercentage: 0.5 }] }
    topProducts.value = Object.values(productMap).sort((a,b) => b.qty - a.qty).slice(0, 5)
    recentOrders.value = [...orders].reverse().slice(0, 5)
  } else {
    stats.value = { revenue: 0, orders: 0, avg: 0 }; chartData.value = { labels: [], datasets: [] }; topProducts.value = []; recentOrders.value = []
  }
  loading.value = false
}

watch(timeRange, fetchData); onMounted(fetchData)
</script>

<template>
  <div class="space-y-4">
    <div class="flex items-center justify-between">
      <div><h2 class="text-lg font-medium text-slate-900">Dashboard</h2></div>
      <div class="flex bg-white rounded-lg p-0.5 border border-slate-200">
        <button v-for="t in ['today', 'week', 'month']" :key="t" @click="timeRange = t" class="px-3 py-1 rounded-md text-[10px] font-medium uppercase transition-all" :class="timeRange === t ? 'bg-black text-white' : 'text-slate-500 hover:text-black'">{{ t }}</button>
      </div>
    </div>

    <div class="grid grid-cols-3 gap-3">
      <div v-for="(stat, key) in { 'Revenue': stats.revenue.toLocaleString() + '៛', 'Orders': stats.orders, 'Avg': stats.avg.toLocaleString() + '៛' }" :key="key" 
        class="bg-white px-4 py-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between group">
        <div>
          <p class="text-[10px] uppercase font-medium text-slate-400 tracking-wider">{{ key }}</p>
          <p class="text-sm font-medium text-slate-900 mt-0.5 font-mono">{{ stat }}</p>
        </div>
        <div class="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-black group-hover:text-white transition-colors">
          <ArrowUpRight class="w-3 h-3" />
        </div>
      </div>
    </div>

    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-sm h-56 relative">
      <h3 class="font-medium text-xs text-slate-900 absolute top-4 left-4">Sales Trend</h3>
      <div v-if="!loading" class="h-full w-full pt-6"><Bar :data="chartData" :options="chartOptions" /></div>
    </div>

    <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
        <div class="px-4 py-3 border-b border-slate-100"><h3 class="font-medium text-xs">Top Items</h3></div>
        <div class="p-2 flex-1 space-y-1 max-h-80 overflow-y-auto scrollbar-hide">
          <div v-for="(item, i) in topProducts" :key="item.name" class="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg">
             <div class="flex items-center gap-3">
               <span class="w-5 h-5 rounded-md bg-slate-100 flex items-center justify-center text-[10px] font-medium text-slate-500">{{ i + 1 }}</span>
               <div>
                 <div class="font-medium text-xs text-slate-900">{{ item.name }}</div>
                 <div class="text-[10px] text-slate-400 font-medium">{{ item.qty }} Sold</div>
               </div>
             </div>
             <div class="font-khmer text-xs font-medium">{{ item.revenue.toLocaleString() }}៛</div>
          </div>
          <div v-if="!topProducts.length" class="py-4 text-center text-[10px] text-slate-400 uppercase">No Data</div>
        </div>
      </div>

      <div class="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
        <div class="px-4 py-3 border-b border-slate-100"><h3 class="font-medium text-xs">Recent Orders</h3></div>
        <div class="p-2 flex-1 space-y-1 max-h-80 overflow-y-auto scrollbar-hide">
          <div v-for="order in recentOrders" :key="order.id" class="flex items-center justify-between px-3 py-2 hover:bg-slate-50 rounded-lg">
            <div class="flex items-center gap-3">
              <div class="w-6 h-6 rounded-full bg-slate-900 text-white flex items-center justify-center"><ShoppingBag class="w-3 h-3" /></div>
              <div>
                <div class="font-medium text-xs text-slate-900">#{{ order.id.toString().slice(0,4) }}</div>
                <div class="text-[10px] text-slate-400 font-mono">{{ new Date(order.created_at).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'}) }}</div>
              </div>
            </div>
            <div class="text-right">
              <div class="font-medium text-xs font-mono">{{ order.total.toLocaleString() }}៛</div>
              <div class="text-[10px] text-slate-400">{{ order.drinks.length }} Items</div>
            </div>
          </div>
          <div v-if="!recentOrders.length" class="py-4 text-center text-[10px] text-slate-400 uppercase">No Orders</div>
        </div>
      </div>
    </div>
  </div>
</template>