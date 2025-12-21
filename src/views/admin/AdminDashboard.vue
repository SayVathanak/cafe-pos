<script setup>
import { ref, onMounted } from 'vue'
import { supabase } from '../../services/supabase'
import { Bar } from 'vue-chartjs'
import { Chart as ChartJS, Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale } from 'chart.js'
import { TrendingUp, DollarSign, ShoppingBag, CreditCard, CalendarDays } from 'lucide-vue-next'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const stats = ref({ revenue: 0, orders: 0, avg: 0 })
const chartData = ref({ labels: [], datasets: [] })

const getGradient = (ctx, chartArea) => {
  const gradient = ctx.createLinearGradient(0, chartArea.bottom, 0, chartArea.top)
  // Tailwind colors: Slate-900 (#0f172a) to Slate-500 (#64748b)
  gradient.addColorStop(0, '#0f172a') 
  gradient.addColorStop(1, '#64748b') 
  return gradient
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    x: { grid: { display: false }, ticks: { font: { size: 10, family: 'monospace' }, color: '#94a3b8' } },
    y: { border: { display: false }, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10, family: 'monospace' }, color: '#94a3b8' } }
  }
}

const fetchData = async () => {
  const { data: orders } = await supabase.from('orders').select('total_amount')
  if (orders && orders.length > 0) {
    stats.value.revenue = orders.reduce((sum, o) => sum + o.total_amount, 0)
    stats.value.orders = orders.length
    stats.value.avg = Math.round(stats.value.revenue / (stats.value.orders || 1))
  }

  const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)
  const { data: chartStats } = await supabase.rpc('get_daily_sales_stats', {
    start_date: thirtyDaysAgo.toISOString(),
    end_date: new Date().toISOString()
  })

  if (chartStats) {
    chartData.value = {
      labels: chartStats.map(s => {
        const d = new Date(s.sale_date); 
        return `${d.getDate()}/${d.getMonth()+1}`
      }),
      datasets: [{
        label: 'Revenue',
        data: chartStats.map(s => s.total_revenue),
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx, chartArea } = chart
          if (!chartArea) return null
          return getGradient(ctx, chartArea)
        },
        borderRadius: 4,
        barThickness: 'flex',
        maxBarThickness: 40
      }]
    }
  }
}

onMounted(fetchData)
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div>
        <h2 class="text-2xl font-medium tracking-tight text-slate-900">Dashboard</h2>
        <p class="text-xs text-slate-500 mt-1">Daily overview of your store performance.</p>
      </div>
      <div class="self-start sm:self-auto flex items-center gap-2 bg-white px-3 py-1.5 rounded-full border border-slate-200 shadow-sm text-xs font-medium text-slate-600">
        <CalendarDays class="w-3.5 h-3.5 text-slate-400" />
        {{ new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' }) }}
      </div>
    </div>

    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-all">
        <div class="relative z-10">
          <p class="text-[10px] uppercase font-medium text-slate-400 tracking-widest mb-2">Total Revenue</p>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-medium text-slate-900">{{ stats.revenue.toLocaleString() }}</span>
            <span class="text-sm font-medium text-slate-400">៛</span>
          </div>
        </div>
        <div class="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
          <DollarSign class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-all">
        <div class="relative z-10">
          <p class="text-[10px] uppercase font-medium text-slate-400 tracking-widest mb-2">Total Orders</p>
          <p class="text-2xl font-medium text-slate-900 ">{{ stats.orders }}</p>
        </div>
        <div class="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
          <ShoppingBag class="w-5 h-5" />
        </div>
      </div>

      <div class="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden group hover:border-slate-200 transition-all sm:col-span-2 lg:col-span-1">
        <div class="relative z-10">
          <p class="text-[10px] uppercase font-medium text-slate-400 tracking-widest mb-2">Avg. Order Value</p>
          <div class="flex items-baseline gap-1">
            <span class="text-2xl font-medium text-slate-900 ">{{ stats.avg.toLocaleString() }}</span>
            <span class="text-sm font-medium text-slate-400">៛</span>
          </div>
        </div>
        <div class="absolute right-4 top-4 w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-slate-400 group-hover:bg-slate-900 group-hover:text-white transition-colors duration-300">
          <CreditCard class="w-5 h-5" />
        </div>
      </div>
    </div>

    <div class="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <div class="p-1.5 bg-slate-50 rounded-md border border-slate-100"><TrendingUp class="w-4 h-4 text-slate-600" /></div>
          <h3 class="font-medium text-sm text-slate-900">Revenue Trends (30 Days)</h3>
        </div>
      </div>
      <div class="h-75 w-full">
        <Bar v-if="chartData.labels.length" :data="chartData" :options="chartOptions" />
        <div v-else class="h-full flex flex-col items-center justify-center text-slate-400 gap-2">
          <div class="w-10 h-10 border-2 border-slate-100 border-t-slate-300 rounded-full animate-spin"></div>
          <span class="text-xs">Loading analytics...</span>
        </div>
      </div>
    </div>
  </div>
</template>