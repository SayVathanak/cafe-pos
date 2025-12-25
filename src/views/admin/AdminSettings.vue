<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useToastStore } from "../../stores/toastStore";
import {
  Save,
  Loader2,
  Store,
  Receipt,
  Printer,
  ShieldAlert,
  Image as ImageIcon,
  DollarSign,
  Upload,
  X,
} from "lucide-vue-next";

const userStore = useUserStore();
const toast = useToastStore();

const saving = ref(false);
const loading = ref(true);
const uploading = ref(false);

const form = ref({
  receipt_header: "",
  receipt_address: "",
  receipt_phone: "",
  wifi_pass: "",
  receipt_footer: "",
  tax_rate: 0,
  service_charge: 0,
  exchange_rate: 4000,
  logo_url: "",
  paper_size: "58mm",
  require_shift: false,
  use_logo_header: true, // New field for logo/brand toggle
});

const showTax = ref(false);
const showService = ref(false);

// Operational Math for Real-time Preview
const previewSubtotal = 5.0;
const previewTax = computed(() =>
  showTax.value ? (previewSubtotal * (form.value.tax_rate || 0)) / 100 : 0
);
const previewService = computed(() =>
  showService.value
    ? (previewSubtotal * (form.value.service_charge || 0)) / 100
    : 0
);
const previewTotal = computed(
  () => previewSubtotal + previewTax.value + previewService.value
);
const previewRiel = computed(
  () =>
    Math.ceil((previewTotal.value * (form.value.exchange_rate || 4100)) / 100) *
    100
);

const fetchSettings = async () => {
  if (!userStore.organizationId) return;
  loading.value = true;
  const { data } = await supabase
    .from("settings")
    .select("*")
    .eq("organization_id", userStore.organizationId)
    .single();
  if (data) {
    form.value = { ...form.value, ...data };
    showTax.value = data.tax_rate > 0;
    showService.value = data.service_charge > 0;
  }
  loading.value = false;
};

const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith("image/"))
    return toast.addToast("Invalid format", "error");
  uploading.value = true;
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userStore.organizationId}-${Date.now()}.${fileExt}`;
    const { error: upErr } = await supabase.storage
      .from("logos")
      .upload(`store-logos/${fileName}`, file);
    if (upErr) throw upErr;
    const {
      data: { publicUrl },
    } = supabase.storage.from("logos").getPublicUrl(`store-logos/${fileName}`);
    form.value.logo_url = publicUrl;
    toast.addToast("Logo updated", "success");
  } catch (e) {
    toast.addToast(e.message, "error");
  } finally {
    uploading.value = false;
  }
};

const saveSettings = async () => {
  if (!userStore.organizationId) return;
  saving.value = true;
  const payload = { ...form.value, organization_id: userStore.organizationId };
  // Remove ID and created_at to avoid Supabase primary key conflicts
  delete payload.id;
  delete payload.created_at;

  const { error } = await supabase
    .from("settings")
    .upsert(payload, { onConflict: "organization_id" });
  saving.value = false;
  if (error) toast.addToast(error.message, "error");
  else toast.addToast("Settings synced", "success");
};

onMounted(fetchSettings);
</script>

<template>
  <div class="max-w-7xl mx-auto pb-10 font-sans text-slate-900">
    <header
      class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4 mb-6"
    >
      <div class="flex items-center gap-3">
        <div class="w-1 h-6 bg-slate-700 rounded-full"></div>
        <h2 class="text-xl font-bold tracking-tight">Store Setup</h2>
      </div>
      <button
        @click="saveSettings"
        :disabled="saving"
        class="bg-slate-700 hover:bg-slate-800 text-white px-5 py-2 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-40 cursor-pointer"
      >
        <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
        <Save v-else class="w-3.5 h-3.5" /> Commit
      </button>
    </header>

    <div v-if="loading" class="flex justify-center py-10">
      <Loader2 class="w-6 h-6 animate-spin text-slate-300" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
      <div class="lg:col-span-7 xl:col-span-8 space-y-4">
        <section
          class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm"
        >
          <div class="flex items-center justify-between mb-4">
            <h3
              class="text-[10px] font-bold uppercase tracking-widest text-slate-500 flex items-center gap-2"
            >
              <Store class="w-3.5 h-3.5" /> Identity & Branding
            </h3>
          </div>

          <div class="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-5">
            <div
              class="sm:col-span-3 lg:col-span-2 flex justify-center sm:justify-start"
            >
              <div
                class="relative group w-20 h-20 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-center overflow-hidden"
              >
                <img
                  v-if="form.logo_url"
                  :src="form.logo_url"
                  class="w-full h-full object-contain p-2"
                />
                <ImageIcon v-else class="w-6 h-6 text-slate-300" />
                <label
                  class="absolute inset-0 bg-slate-800/80 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all"
                >
                  <Upload class="w-4 h-4 text-white" /><input
                    type="file"
                    class="hidden"
                    @change="handleLogoUpload"
                    accept="image/*"
                  />
                </label>
                <button
                  v-if="form.logo_url"
                  @click="form.logo_url = ''"
                  class="absolute top-1 right-1 p-0.5 bg-white rounded shadow-sm text-red-500 cursor-pointer"
                >
                  <X class="w-3 h-3" />
                </button>
              </div>
            </div>

            <div
              class="sm:col-span-9 lg:col-span-10 grid grid-cols-1 sm:grid-cols-2 gap-3"
            >
              <div class="sm:col-span-2">
                <label
                  class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1"
                  >Shop Name</label
                >
                <input
                  v-model="form.receipt_header"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-bold outline-none transition-all focus:bg-white focus:border-slate-400"
                />
              </div>
              <div class="sm:col-span-2">
                <label
                  class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1"
                  >Address</label
                >
                <input
                  v-model="form.receipt_address"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all focus:bg-white focus:border-slate-400"
                />
              </div>
              <div>
                <label
                  class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1"
                  >Phone</label
                >
                <input
                  v-model="form.receipt_phone"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all focus:bg-white focus:border-slate-400"
                />
              </div>
              <div>
                <label
                  class="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1 ml-1"
                  >WiFi Pass</label
                >
                <input
                  v-model="form.wifi_pass"
                  class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-mono font-bold outline-none transition-all focus:bg-white focus:border-slate-400"
                />
              </div>
            </div>
          </div>

          <!-- Receipt Header Toggle -->
          <div class="mt-4 pt-4 border-t border-slate-100">
            <div
              @click="form.use_logo_header = !form.use_logo_header"
              class="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <div class="flex items-center gap-2">
                <Receipt class="w-3.5 h-3.5 text-slate-500" />
                <span
                  class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                  >Use Logo on Receipt</span
                >
              </div>
              <div
                class="w-9 h-5 rounded-full relative transition-colors"
                :class="form.use_logo_header ? 'bg-slate-700' : 'bg-slate-300'"
              >
                <div
                  class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
                  :class="form.use_logo_header ? 'translate-x-4' : ''"
                ></div>
              </div>
            </div>
            <p class="text-[9px] text-slate-400 mt-2 ml-1">
              {{
                form.use_logo_header
                  ? "Receipt will show logo image"
                  : "Receipt will show brand name text"
              }}
            </p>
          </div>
        </section>

        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <section
            class="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-sm space-y-4"
          >
            <h3
              class="text-[10px] font-bold uppercase tracking-widest text-slate-500"
            >
              Operations
            </h3>
            <div class="flex bg-slate-50 p-1 rounded-lg">
              <button
                @click="form.paper_size = '58mm'"
                class="flex-1 py-2 rounded-md text-[9px] font-bold uppercase tracking-tighter transition-all cursor-pointer"
                :class="
                  form.paper_size === '58mm'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400'
                "
              >
                58mm
              </button>
              <button
                @click="form.paper_size = '80mm'"
                class="flex-1 py-2 rounded-md text-[9px] font-bold uppercase tracking-tighter transition-all cursor-pointer"
                :class="
                  form.paper_size === '80mm'
                    ? 'bg-white text-slate-800 shadow-sm'
                    : 'text-slate-400'
                "
              >
                80mm
              </button>
            </div>
            <div
              @click="form.require_shift = !form.require_shift"
              class="flex items-center justify-between px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-100 transition-colors"
            >
              <span
                class="text-[10px] font-bold text-slate-600 uppercase tracking-wide"
                >Strict Shifts</span
              >
              <div
                class="w-9 h-5 rounded-full relative transition-colors"
                :class="form.require_shift ? 'bg-slate-700' : 'bg-slate-300'"
              >
                <div
                  class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm"
                  :class="form.require_shift ? 'translate-x-4' : ''"
                ></div>
              </div>
            </div>
          </section>

          <section
            class="bg-slate-700 p-4 sm:p-5 rounded-xl shadow-sm text-white space-y-3"
          >
            <h3
              class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-2"
            >
              Financial Engine
            </h3>
            <div class="flex justify-between items-center text-[10px]">
              <span class="font-bold text-slate-300 uppercase tracking-tighter"
                >Rate (KHR)</span
              >
              <div class="relative">
                <input
                  v-model="form.exchange_rate"
                  type="number"
                  class="w-16 bg-transparent border-b border-white/20 text-right font-bold outline-none pr-3"
                /><span class="absolute right-0 bottom-0.5 text-white/30"
                  >៛</span
                >
              </div>
            </div>
            <div class="flex justify-between items-center text-[10px]">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold text-slate-300 uppercase tracking-tighter"
                  >VAT (%)</span
                >
                <button
                  @click="showTax = !showTax"
                  class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 cursor-pointer transition-colors"
                  :class="showTax ? 'text-blue-300' : 'text-slate-500'"
                >
                  {{ showTax ? "ON" : "OFF" }}
                </button>
              </div>
              <input
                v-if="showTax"
                v-model="form.tax_rate"
                type="number"
                class="w-10 bg-transparent border-b border-white/20 text-center font-bold outline-none"
              />
            </div>
            <div class="flex justify-between items-center text-[10px]">
              <div class="flex items-center gap-2">
                <span
                  class="font-bold text-slate-300 uppercase tracking-tighter"
                  >Svc (%)</span
                >
                <button
                  @click="showService = !showService"
                  class="text-[9px] px-1.5 py-0.5 rounded bg-white/10 cursor-pointer transition-colors"
                  :class="showService ? 'text-blue-300' : 'text-slate-500'"
                >
                  {{ showService ? "ON" : "OFF" }}
                </button>
              </div>
              <input
                v-if="showService"
                v-model="form.service_charge"
                type="number"
                class="w-10 bg-transparent border-b border-white/20 text-center font-bold outline-none"
              />
            </div>
          </section>
        </div>

        <section
          class="bg-white p-4 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center gap-3"
        >
          <label
            class="text-[9px] font-bold text-slate-500 uppercase tracking-widest shrink-0"
            >Receipt Footer</label
          >
          <input
            v-model="form.receipt_footer"
            class="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs font-medium outline-none transition-all focus:bg-white focus:border-slate-400"
            placeholder="Thank you message..."
          />
        </section>
      </div>

      <div
        class="lg:col-span-5 xl:col-span-4 lg:sticky lg:top-4 flex flex-col items-center"
      >
        <div class="relative w-full max-w-70 mx-auto">
          <div
            class="absolute -top-2 left-0 w-full h-3 z-10 rotate-180"
            style="
              background-image: linear-gradient(
                  135deg,
                  #fff 25%,
                  transparent 25%
                ),
                linear-gradient(225deg, #fff 25%, transparent 25%);
              background-size: 10px 20px;
              background-repeat: repeat-x;
            "
          ></div>

          <div
            class="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] p-6 pt-8 pb-8 text-[10px] font-mono leading-tight relative"
          >
            <div class="text-center mb-4">
              <div v-if="form.use_logo_header && form.logo_url">
                <img
                  :src="form.logo_url"
                  class="h-10 mx-auto mb-2 object-contain"
                />
              </div>
              <div v-else class="font-black text-sm uppercase tracking-tight">
                {{ form.receipt_header || "SHOP NAME" }}
              </div>
              <div
                class="text-[9px] text-slate-500 leading-relaxed font-sans mt-1"
              >
                {{ form.receipt_address || "123 Business St, Phnom Penh"
                }}<br />
                {{ form.receipt_phone || "012 345 678" }}
              </div>
            </div>

            <div class="border-b border-dashed border-slate-300 my-3"></div>

            <div class="space-y-3 mb-4">
              <div class="flex justify-between font-bold text-slate-900">
                <span>1x Iced Latte (Large)</span>
                <span>14,400 ៛</span>
              </div>
              <div class="text-[9px] text-slate-500 font-sans italic -mt-2">
                Oat Milk, Less Sugar
              </div>
              <div class="flex justify-between font-bold text-slate-900">
                <span>1x Butter Croissant</span>
                <span>6,100 ៛</span>
              </div>
            </div>

            <div
              class="border-t-[1.5px] border-slate-900 pt-3 space-y-1 font-sans"
            >
              <div
                class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"
              >
                <span>Subtotal</span>
                <span>{{ previewRiel.toLocaleString() }} ៛</span>
              </div>

              <div
                v-if="showTax"
                class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"
              >
                <span>VAT ({{ form.tax_rate }}%)</span>
                <span
                  >{{
                    (previewRiel * (form.tax_rate / 100)).toLocaleString()
                  }}
                  ៛</span
                >
              </div>
              <div
                v-if="showService"
                class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"
              >
                <span>Service ({{ form.service_charge }}%)</span>
                <span
                  >{{
                    (previewRiel * (form.service_charge / 100)).toLocaleString()
                  }}
                  ៛</span
                >
              </div>

              <div class="border-b border-slate-200 my-2"></div>

              <div
                class="flex justify-between text-slate-900 font-bold text-[9px] uppercase tracking-wider mb-2"
              >
                <span>Paid via:</span>
                <span>Cash</span>
              </div>

              <div class="border-b border-slate-200 my-2"></div>

              <div class="flex justify-between items-center mt-1">
                <span class="text-[10px] font-bold uppercase text-slate-900"
                  >Total (KHR)</span
                >
                <span
                  class="text-xl font-semibold text-slate-900 tracking-tighter"
                >
                  {{
                    // Calculate KHR total including tax/service for preview
                    (
                      previewRiel +
                      (showTax ? previewRiel * (form.tax_rate / 100) : 0) +
                      (showService
                        ? previewRiel * (form.service_charge / 100)
                        : 0)
                    ).toLocaleString()
                  }}
                  ៛
                </span>
              </div>

              <div
                class="flex justify-between items-center text-slate-500 font-medium mt-1"
              >
                <span class="text-[9px]">Total (USD)</span>
                <span class="text-xs font-semibold tracking-tighter"
                  >${{ previewTotal.toFixed(2) }}</span
                >
              </div>
            </div>

            <div class="border-b border-dashed border-slate-300 my-4"></div>

            <div class="text-center space-y-4">
              <p
                class="font-bold text-slate-900 uppercase text-[9px] tracking-tight leading-snug"
              >
                {{ form.receipt_footer || "Thank you for your visit!" }}
              </p>

              <div
                v-if="form.wifi_pass"
                class="inline-block px-3 py-1 border border-slate-900 rounded-md"
              >
                <p
                  class="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5"
                >
                  WIFI PASS
                </p>
                <p class="font-bold text-slate-900 tracking-wider text-[10px]">
                  {{ form.wifi_pass }}
                </p>
              </div>

              <div
                class="text-[8px] text-slate-400 uppercase tracking-widest pt-2"
              >
                Powered by Cambodge POS
              </div>
            </div>
          </div>

          <div
            class="absolute -bottom-2 left-0 w-full h-3 z-10"
            style="
              background-image: linear-gradient(
                  135deg,
                  #fff 25%,
                  transparent 25%
                ),
                linear-gradient(225deg, #fff 25%, transparent 25%);
              background-size: 10px 20px;
              background-repeat: repeat-x;
            "
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>
