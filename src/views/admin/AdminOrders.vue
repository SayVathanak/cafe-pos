<script setup>
import { ref, computed, onMounted, watch } from "vue";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore"; // Import User Store
import {
  Search,
  Eye,
  ChevronLeft,
  ChevronRight,
  X,
  Calendar,
  Coffee,
  Store,
  Download,
} from "lucide-vue-next";

const userStore = useUserStore();

// --- STATE ---
const orders = ref([]);
const stores = ref([]);
const selectedStore = ref("all"); // Default: All stores
const loading = ref(true);
const searchQuery = ref("");
const currentPage = ref(1);
const itemsPerPage = 10;
const selectedOrder = ref(null);

// --- FETCH DATA ---
const fetchStores = async () => {
  if (userStore.role !== "admin") return;
  const { data } = await supabase.from("stores").select("id, name");
  stores.value = data || [];
};

const fetchOrders = async () => {
  loading.value = true;

  let query = supabase
    .from("orders")
    .select("*")
    .order("created_at", { ascending: false });

  // If a specific store is selected, filter by it
  if (selectedStore.value !== "all") {
    query = query.eq("store_id", selectedStore.value);
  }

  const { data, error } = await query;
  if (data) orders.value = data;

  loading.value = false;
};

const exportCSV = () => {
  const headers = [
    "Order ID",
    "Date",
    "Store ID",
    "Total Amount",
    "Status",
    "Items",
  ];

  const rows = filteredOrders.value.map((order) => {
    // Flatten drinks array into a string
    const itemNames =
      order.drinks?.map((d) => `${d.qty}x ${d.name}`).join("; ") || "";
    return [
      order.id,
      new Date(order.created_at).toLocaleString(),
      order.store_id,
      order.total_amount,
      order.status,
      `"${itemNames}"`, // Escape commas in item names
    ].join(",");
  });

  const csvContent = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });

  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = `orders_export_${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
};

// Watch dropdown change to refetch
watch(selectedStore, () => {
  currentPage.value = 1; // Reset pagination
  fetchOrders();
});

// --- COMPUTED / FILTERING ---
const filteredOrders = computed(() => {
  if (!searchQuery.value) return orders.value;
  const lowerQuery = searchQuery.value.toLowerCase();
  return orders.value.filter((order) =>
    order.id.toString().toLowerCase().includes(lowerQuery)
  );
});

const totalPages = computed(() =>
  Math.ceil(filteredOrders.value.length / itemsPerPage)
);

const paginatedOrders = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  return filteredOrders.value.slice(start, end);
});

// --- HELPERS ---
const formatCurrency = (val) =>
  new Intl.NumberFormat("en-US").format(val) + " ៛";
const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
const openModal = (order) => {
  selectedOrder.value = order;
};
const closeModal = () => {
  selectedOrder.value = null;
};

onMounted(() => {
  fetchStores();
  fetchOrders();
});
</script>

<template>
  <div
    class="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10"
  >
    <div
      class="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
    >
      <div>
        <h2 class="text-2xl font-semibold tracking-tight text-slate-900">
          Order Management
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          View and manage customer orders.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <div v-if="userStore.role === 'admin'" class="relative min-w-40">
          <Store
            class="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"
          />
          <select
            v-model="selectedStore"
            class="w-full pl-9 pr-8 py-2 bg-white border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-slate-900 appearance-none cursor-pointer hover:border-slate-300 transition-colors"
          >
            <option value="all">All Stores</option>
            <option v-for="store in stores" :key="store.id" :value="store.id">
              {{ store.name }}
            </option>
          </select>
          <div
            class="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
          >
            <div
              class="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-t-4 border-t-slate-400"
            ></div>
          </div>
        </div>

        <div class="relative w-full sm:w-64">
          <div
            class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"
          >
            <Search class="h-4 w-4 text-slate-400" />
          </div>
          <input
            v-model="searchQuery"
            type="text"
            placeholder="Search Order ID..."
            class="block w-full pl-10 pr-3 py-2 border border-slate-200 rounded-lg leading-5 bg-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-900 focus:border-slate-900 sm:text-xs transition-colors"
          />
        </div>
        <button
          @click="exportCSV"
          class="bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 px-3 py-2 rounded-lg text-xs font-bold uppercase tracking-wide flex items-center gap-2 transition-colors"
        >
          <Download class="w-4 h-4" /> Export
        </button>
      </div>
    </div>

    <div
      class="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
    >
      <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
          <thead
            class="bg-slate-50/50 text-[10px] uppercase text-slate-400 font-semibold tracking-wider"
          >
            <tr>
              <th class="px-6 py-4 whitespace-nowrap">Order ID</th>
              <th class="px-6 py-4 whitespace-nowrap">Date & Time</th>
              <th class="px-6 py-4 whitespace-nowrap">Items Summary</th>
              <th class="px-6 py-4 text-right whitespace-nowrap">Total</th>
              <th class="px-6 py-4 text-center whitespace-nowrap">Status</th>
              <th class="px-6 py-4 text-center whitespace-nowrap">Action</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-50">
            <tr v-if="loading" class="animate-pulse">
              <td
                colspan="6"
                class="px-6 py-8 text-center text-xs text-slate-400"
              >
                Loading orders...
              </td>
            </tr>

            <tr v-else-if="paginatedOrders.length === 0">
              <td
                colspan="6"
                class="px-6 py-8 text-center text-xs text-slate-400"
              >
                No orders found.
              </td>
            </tr>

            <tr
              v-else
              v-for="order in paginatedOrders"
              :key="order.id"
              class="hover:bg-slate-50/50 transition-colors group"
            >
              <td
                class="px-6 py-4 text-xs font-mono text-slate-500 font-medium"
              >
                #{{ order.id }}
              </td>

              <td class="px-6 py-4 text-xs text-slate-600">
                <div class="flex items-center gap-2">
                  <Calendar class="w-3.5 h-3.5 text-slate-400" />
                  {{ formatDate(order.created_at) }}
                </div>
              </td>

              <td class="px-6 py-4">
                <div class="flex flex-col gap-1">
                  <span class="text-xs font-medium text-slate-900 line-clamp-1">
                    {{ order.drinks?.[0]?.name }}
                    <span
                      v-if="(order.drinks?.length || 0) > 1"
                      class="text-slate-400 font-normal"
                    >
                      + {{ order.drinks.length - 1 }} more
                    </span>
                  </span>
                </div>
              </td>

              <td class="px-6 py-4 text-right">
                <span class="text-xs font-semibold text-slate-900">{{
                  formatCurrency(order.total_amount)
                }}</span>
              </td>

              <td class="px-6 py-4 text-center">
                <span
                  class="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-medium bg-green-50 text-green-700 border border-green-100"
                >
                  Completed
                </span>
              </td>

              <td class="px-6 py-4 text-center">
                <button
                  @click="openModal(order)"
                  class="p-2 bg-white border border-slate-200 rounded-lg text-slate-500 hover:text-slate-900 hover:border-slate-300 transition-all shadow-sm"
                >
                  <Eye class="w-4 h-4" />
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div
        class="border-t border-slate-50 px-6 py-4 flex items-center justify-between"
      >
        <div class="text-[10px] text-slate-400 font-medium">
          Showing {{ (currentPage - 1) * itemsPerPage + 1 }} -
          {{ Math.min(currentPage * itemsPerPage, filteredOrders.length) }} of
          {{ filteredOrders.length }}
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="currentPage--"
            :disabled="currentPage === 1"
            class="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
          >
            <ChevronLeft class="w-4 h-4" />
          </button>
          <span class="text-xs font-medium text-slate-700 px-2"
            >Page {{ currentPage }}</span
          >
          <button
            @click="currentPage++"
            :disabled="currentPage >= totalPages"
            class="p-1.5 rounded-md border border-slate-200 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed text-slate-600 transition-colors"
          >
            <ChevronRight class="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>

    <div
      v-if="selectedOrder"
      class="fixed inset-0 z-50 flex items-center justify-center px-4"
    >
      <div
        class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        @click="closeModal"
      ></div>

      <div
        class="relative bg-white w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div
          class="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50"
        >
          <div>
            <h3 class="text-sm font-semibold text-slate-900">Order Details</h3>
            <p class="text-xs text-slate-500 font-mono mt-0.5">
              #{{ selectedOrder.id }}
            </p>
          </div>
          <button
            @click="closeModal"
            class="text-slate-400 hover:text-slate-900 p-1"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <div class="p-6 max-h-[60vh] overflow-y-auto">
          <div
            class="flex items-center justify-between mb-6 pb-6 border-b border-slate-50 border-dashed"
          >
            <div class="flex items-center gap-3">
              <div class="p-2 bg-slate-100 rounded-full">
                <Calendar class="w-4 h-4 text-slate-500" />
              </div>
              <div>
                <p
                  class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold"
                >
                  Date
                </p>
                <p class="text-xs font-medium text-slate-900">
                  {{ formatDate(selectedOrder.created_at) }}
                </p>
              </div>
            </div>
            <div class="flex items-center gap-3 text-right">
              <div>
                <p
                  class="text-[10px] text-slate-400 uppercase tracking-wider font-semibold"
                >
                  Status
                </p>
                <span class="text-xs font-semibold text-green-600"
                  >Completed</span
                >
              </div>
              <div class="p-2 bg-green-50 rounded-full">
                <Coffee class="w-4 h-4 text-green-600" />
              </div>
            </div>
          </div>

          <div class="space-y-4">
            <div
              v-for="(item, idx) in selectedOrder.drinks"
              :key="idx"
              class="flex gap-4 p-3 rounded-xl border border-slate-100 bg-slate-50/30"
            >
              <div
                class="w-12 h-12 bg-white rounded-lg border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden"
              >
                <img
                  v-if="item.image_url"
                  :src="item.image_url"
                  class="w-full h-full object-cover"
                />
                <Coffee v-else class="w-5 h-5 text-slate-300" />
              </div>

              <div class="flex-1 min-w-0">
                <div class="flex justify-between items-start">
                  <p class="text-sm font-semibold text-slate-900 truncate">
                    {{ item.name }}
                  </p>
                  <p class="text-xs font-semibold text-slate-900">
                    {{ formatCurrency(item.price * item.qty) }}
                  </p>
                </div>

                <p class="text-xs text-slate-500 mt-0.5">
                  {{ item.qty }}x @ {{ formatCurrency(item.price) }}
                </p>

                <div class="flex flex-wrap gap-2 mt-2">
                  <span
                    v-if="item.modifiers?.sugar"
                    class="inline-flex text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500"
                  >
                    Sugar: {{ item.modifiers.sugar }}
                  </span>
                  <span
                    v-if="item.modifiers?.ice"
                    class="inline-flex text-[10px] px-1.5 py-0.5 bg-white border border-slate-200 rounded text-slate-500"
                  >
                    Ice: {{ item.modifiers.ice }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-between items-center"
        >
          <span
            class="text-xs font-semibold text-slate-500 uppercase tracking-wider"
            >Total Amount</span
          >
          <span class="text-xl font-semibold text-slate-900">{{
            formatCurrency(selectedOrder.total_amount)
          }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
