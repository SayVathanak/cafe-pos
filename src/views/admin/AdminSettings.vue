<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useToastStore } from "../../stores/toastStore";
import {
  Loader2,
  Store,
  Receipt,
  ShieldAlert,
  Image as ImageIcon,
  Upload,
  MapPin,
  Phone,
  Wifi,
  DollarSign,
  Percent,
} from "lucide-vue-next";

const userStore = useUserStore();
const toast = useToastStore();

// --- State ---
const activeTab = ref('store');
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
  use_logo_header: true,
});

const showTax = ref(false);
const showService = ref(false);

// --- Math & Computed ---
// Fixed values to match your screenshot exactly
const previewSubtotal = 5.0; 
const previewTax = computed(() => showTax.value ? (previewSubtotal * (form.value.tax_rate || 0)) / 100 : 0);
const previewService = computed(() => showService.value ? (previewSubtotal * (form.value.service_charge || 0)) / 100 : 0);
const previewTotal = computed(() => previewSubtotal + previewTax.value + previewService.value);
const previewRiel = computed(() => Math.ceil((previewTotal.value * (form.value.exchange_rate || 4100)) / 100) * 100);

// --- Actions ---
const fetchSettings = async () => {
  if (!userStore.organizationId) return;
  loading.value = true;
  const { data } = await supabase.from("settings").select("*").eq("organization_id", userStore.organizationId).single();
  if (data) {
    form.value = { ...form.value, ...data };
    showTax.value = data.tax_rate > 0;
    showService.value = data.service_charge > 0;
  }
  loading.value = false;
};

const handleLogoUpload = async (event) => {
  const file = event.target.files[0];
  if (!file || !file.type.startsWith("image/")) return toast.addToast("Invalid format", "error");
  uploading.value = true;
  try {
    const fileExt = file.name.split(".").pop();
    const fileName = `${userStore.organizationId}-${Date.now()}.${fileExt}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(`store-logos/${fileName}`, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: { publicUrl } } = supabase.storage.from("logos").getPublicUrl(`store-logos/${fileName}`);
    form.value.logo_url = publicUrl;
    toast.addToast("Logo updated", "success");
  } catch (e) {
    console.error(e);
    toast.addToast("Upload failed", "error");
  } finally {
    uploading.value = false;
  }
};

const saveSettings = async () => {
  if (!userStore.organizationId) return;
  saving.value = true;
  const payload = { ...form.value, organization_id: userStore.organizationId };
  delete payload.id;
  delete payload.created_at;
  if (!showTax.value) payload.tax_rate = 0;
  if (!showService.value) payload.service_charge = 0;
  const { error } = await supabase.from("settings").upsert(payload, { onConflict: "organization_id" });
  saving.value = false;
  if (error) toast.addToast(error.message, "error");
  else toast.addToast("Settings saved successfully", "success");
};

onMounted(fetchSettings);

const tabs = [
  { id: 'store', label: 'Identity', icon: Store },
  { id: 'financial', label: 'Financials', icon: DollarSign },
  { id: 'system', label: 'System', icon: ShieldAlert },
];
</script>

<template>
  <div class="max-w-6xl mx-auto pb-20 font-sans text-slate-900">
    
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div>
        <h1 class="text-2xl font-bold tracking-tight text-slate-900">Settings</h1>
        <p class="text-sm text-slate-500 mt-1">Manage store preferences and receipt configuration.</p>
      </div>
      <button
        @click="saveSettings"
        :disabled="saving"
        class="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 text-white px-6 py-2.5 rounded-xl font-bold text-sm transition-all active:scale-95 disabled:opacity-70 shadow-sm"
      >
        <Loader2 v-if="saving" class="w-4 h-4 animate-spin" />
        <span v-else>Save Changes</span>
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-20">
      <Loader2 class="w-8 h-8 animate-spin text-slate-300" />
    </div>

    <div v-else class="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      
      <div class="lg:col-span-8 space-y-6">
        
        <div class="bg-slate-100 p-1.5 rounded-xl inline-flex w-full sm:w-auto">
          <button 
            v-for="tab in tabs" 
            :key="tab.id"
            @click="activeTab = tab.id"
            class="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2 rounded-lg text-sm font-bold transition-all duration-200"
            :class="activeTab === tab.id ? 'bg-white text-slate-900 shadow-sm ring-1 ring-black/5' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'"
          >
            <component :is="tab.icon" class="w-4 h-4" />
            {{ tab.label }}
          </button>
        </div>

        <div v-if="activeTab === 'store'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 class="font-bold text-slate-900">Brand Identity</h3>
              <p class="text-xs text-slate-500 mt-1">Logo and name appear on the top of your receipts.</p>
            </div>
            <div class="p-6 flex flex-col sm:flex-row gap-6">
              <div class="shrink-0">
                <div class="relative group w-32 h-32 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center overflow-hidden transition-colors hover:border-slate-400">
                  <Loader2 v-if="uploading" class="w-6 h-6 animate-spin text-slate-400" />
                  <img v-else-if="form.logo_url" :src="form.logo_url" class="w-full h-full object-contain p-2" />
                  <div v-else class="text-center p-4">
                    <ImageIcon class="w-8 h-8 text-slate-300 mx-auto mb-1" />
                    <span class="text-[10px] text-slate-400 font-bold uppercase">Upload Logo</span>
                  </div>
                  <label class="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                    <div class="text-white flex flex-col items-center">
                      <Upload class="w-5 h-5 mb-1" />
                      <span class="text-[9px] font-bold uppercase">Change</span>
                    </div>
                    <input type="file" class="hidden" @change="handleLogoUpload" accept="image/*" />
                  </label>
                </div>
              </div>
              <div class="flex-1 space-y-4">
                <div class="space-y-1">
                  <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Shop Name</label>
                  <div class="relative">
                    <Store class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input v-model="form.receipt_header" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" placeholder="My Awesome Cafe" />
                  </div>
                </div>
                <div @click="form.use_logo_header = !form.use_logo_header" class="flex items-center justify-between p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
                  <div class="flex items-center gap-3">
                    <Receipt class="w-4 h-4 text-slate-500" />
                    <div>
                      <div class="text-xs font-bold text-slate-700">Receipt Header Style</div>
                      <div class="text-[10px] text-slate-400">{{ form.use_logo_header ? 'Using Logo Image' : 'Using Text Only' }}</div>
                    </div>
                  </div>
                   <div class="w-9 h-5 rounded-full relative transition-colors" :class="form.use_logo_header ? 'bg-slate-900' : 'bg-slate-200'">
                    <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm" :class="form.use_logo_header ? 'translate-x-4' : ''"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div class="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-4">
            <h3 class="font-bold text-slate-900 mb-4">Location & Contact</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Phone</label>
                <div class="relative">
                  <Phone class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input v-model="form.receipt_phone" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" />
                </div>
              </div>
              <div class="space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Wifi Password</label>
                <div class="relative">
                  <Wifi class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input v-model="form.wifi_pass" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" />
                </div>
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Address</label>
                <div class="relative">
                  <MapPin class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <textarea v-model="form.receipt_address" rows="2" class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all resize-none"></textarea>
                </div>
              </div>
              <div class="md:col-span-2 space-y-1">
                <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Receipt Footer Message</label>
                <input v-model="form.receipt_footer" class="w-full px-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 outline-none transition-all" placeholder="Thank you for visiting!" />
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'financial'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
          <div class="bg-slate-900 rounded-xl shadow-lg p-6 text-white relative overflow-hidden">
             <div class="absolute top-0 right-0 p-4 opacity-10">
                <DollarSign class="w-32 h-32" />
             </div>
             <div class="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                <div>
                   <h3 class="font-bold text-lg">Exchange Rate</h3>
                   <p class="text-slate-400 text-xs mt-1">Used for automatic KHR calculations.</p>
                </div>
                <div class="bg-white/10 p-4 rounded-xl flex items-center gap-3 border border-white/20">
                   <div class="text-right">
                      <div class="text-[10px] font-bold text-slate-400 uppercase">1 USD equals</div>
                      <input v-model="form.exchange_rate" type="number" class="bg-transparent text-2xl font-mono font-bold text-white text-right w-24 outline-none border-b border-white/20 focus:border-white" />
                   </div>
                   <div class="text-xl font-bold text-slate-300">៛</div>
                </div>
             </div>
          </div>

          <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 class="font-bold text-slate-900">Taxes & Fees</h3>
              <p class="text-xs text-slate-500 mt-1">Applied to subtotal before final calculation.</p>
            </div>
            <div class="divide-y divide-slate-100">
              <div class="p-5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="p-2 bg-blue-50 text-blue-600 rounded-lg"><Percent class="w-4 h-4" /></div>
                   <div>
                      <div class="text-sm font-bold text-slate-700">Value Added Tax (VAT)</div>
                      <div class="text-xs text-slate-400">Add percentage to order total</div>
                   </div>
                </div>
                <div class="flex items-center gap-4">
                   <div v-if="showTax" class="flex items-center relative">
                      <input v-model="form.tax_rate" type="number" class="w-16 py-1 px-2 border border-slate-200 rounded text-right font-bold text-sm outline-none focus:border-blue-500" />
                      <span class="ml-1 text-xs font-bold text-slate-400">%</span>
                   </div>
                   <button @click="showTax = !showTax" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2" :class="showTax ? 'bg-slate-900' : 'bg-slate-200'">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" :class="showTax ? 'translate-x-6' : 'translate-x-1'" />
                    </button>
                </div>
              </div>
              <div class="p-5 flex items-center justify-between">
                <div class="flex items-center gap-3">
                   <div class="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><DollarSign class="w-4 h-4" /></div>
                   <div>
                      <div class="text-sm font-bold text-slate-700">Service Charge</div>
                      <div class="text-xs text-slate-400">Extra fee for dine-in services</div>
                   </div>
                </div>
                 <div class="flex items-center gap-4">
                   <div v-if="showService" class="flex items-center relative">
                      <input v-model="form.service_charge" type="number" class="w-16 py-1 px-2 border border-slate-200 rounded text-right font-bold text-sm outline-none focus:border-emerald-500" />
                      <span class="ml-1 text-xs font-bold text-slate-400">%</span>
                   </div>
                   <button @click="showService = !showService" class="relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2" :class="showService ? 'bg-slate-900' : 'bg-slate-200'">
                      <span class="inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out" :class="showService ? 'translate-x-6' : 'translate-x-1'" />
                    </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="activeTab === 'system'" class="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
           <div class="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
             <div class="p-5 border-b border-slate-100 bg-slate-50/50">
              <h3 class="font-bold text-slate-900">POS Operations</h3>
            </div>
            <div class="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
               <div class="space-y-2">
                 <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Printer Paper Size</label>
                 <div class="grid grid-cols-2 gap-2 bg-slate-50 p-1 rounded-lg">
                    <button @click="form.paper_size = '58mm'" class="py-2 rounded-md text-xs font-bold transition-all" :class="form.paper_size === '58mm' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'">58mm</button>
                    <button @click="form.paper_size = '80mm'" class="py-2 rounded-md text-xs font-bold transition-all" :class="form.paper_size === '80mm' ? 'bg-white shadow-sm text-slate-900' : 'text-slate-400'">80mm</button>
                 </div>
               </div>
               <div class="space-y-2">
                 <label class="text-xs font-bold text-slate-500 uppercase tracking-wider">Security</label>
                 <div @click="form.require_shift = !form.require_shift" class="flex items-center justify-between p-2.5 border border-slate-200 rounded-lg cursor-pointer bg-white">
                    <span class="text-sm font-bold text-slate-700">Strict Shift Tracking</span>
                    <div class="w-9 h-5 rounded-full relative transition-colors" :class="form.require_shift ? 'bg-slate-900' : 'bg-slate-200'">
                      <div class="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform shadow-sm" :class="form.require_shift ? 'translate-x-4' : ''"></div>
                    </div>
                 </div>
                 <p class="text-[10px] text-slate-400 leading-tight">If enabled, staff cannot place orders without opening a shift.</p>
               </div>
            </div>
           </div>
        </div>

      </div>

      <div class="lg:col-span-4 relative">
        <div class="sticky top-6">
          <div class="flex items-center justify-center gap-2 mb-4 text-slate-400">
            <Receipt class="w-4 h-4" />
            <span class="text-[10px] font-bold uppercase tracking-widest">Live Preview</span>
          </div>

          <div class="relative w-full max-w-65 mx-auto">
             
             <div class="absolute -top-2 left-0 w-full h-3 z-10 rotate-180" 
              style="background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%); background-size: 10px 20px; background-repeat: repeat-x;">
            </div>

            <div class="bg-white p-5 py-6 text-[9px] font-mono leading-tight relative text-slate-800 drop-shadow-xl z-0">
              
              <div class="text-center mb-4">
                <div v-if="form.use_logo_header && form.logo_url" class="mb-2">
                  <img :src="form.logo_url" class="h-5 mx-auto object-contain grayscale contrast-125" />
                </div>
                <div v-else class="font-black text-2xl tracking-tight mb-1">{{ form.receipt_header || "latte." }}</div>
                
                <div class="text-[8px] text-slate-500 font-sans leading-snug">
                  {{ form.receipt_address || "St.230, Teuk Laak 3, Toul Kork" }}<br />
                  {{ form.receipt_phone || "010536576" }}
                </div>
              </div>

              <div class="border-b border-dashed border-slate-300 my-2"></div>

              <div class="space-y-2 mb-3">
                <div class="flex justify-between font-bold text-slate-900">
                  <span>1x Iced Latte (Large)</span>
                  <span>14,400 ៛</span>
                </div>
                <div class="text-[8px] text-slate-500 font-sans italic -mt-1.5">Oat Milk, Less Sugar</div>
                <div class="flex justify-between font-bold text-slate-900">
                  <span>1x Butter Croissant</span>
                  <span>6,100 ៛</span>
                </div>
              </div>

              <div class="border-t-[1.5px] border-slate-900 pt-2 space-y-1 font-sans">
                <div class="flex justify-between text-slate-500 font-bold text-[8px] uppercase tracking-wider">
                  <span>Subtotal</span>
                  <span>{{ previewRiel.toLocaleString() }} ៛</span>
                </div>
                
                <div v-if="showTax" class="flex justify-between text-slate-500 font-bold text-[8px] uppercase tracking-wider">
                  <span>VAT ({{ form.tax_rate }}%)</span>
                  <span>{{ (previewRiel * (form.tax_rate / 100)).toLocaleString() }}</span>
                </div>
                <div v-if="showService" class="flex justify-between text-slate-500 font-bold text-[8px] uppercase tracking-wider">
                  <span>Svc ({{ form.service_charge }}%)</span>
                  <span>{{ (previewRiel * (form.service_charge / 100)).toLocaleString() }}</span>
                </div>

                <div class="flex justify-between text-slate-900 font-bold text-[8px] uppercase tracking-wider mt-1">
                  <span>Paid Via:</span>
                  <span>CASH</span>
                </div>

                <div class="border-b border-slate-200 my-1"></div>

                <div class="flex justify-between items-center mt-2">
                  <span class="text-[10px] font-bold uppercase text-slate-900">Total (KHR)</span>
                  <span class="text-xl font-bold text-slate-900 tracking-tighter">
                    {{ (previewRiel + (showTax ? previewRiel*(form.tax_rate/100) : 0) + (showService ? previewRiel*(form.service_charge/100) : 0)).toLocaleString() }} ៛
                  </span>
                </div>
                <div class="flex justify-between items-center text-slate-500">
                  <span class="text-[9px]">Total (USD)</span>
                  <span class="text-[10px] font-bold">${{ previewTotal.toFixed(2) }}</span>
                </div>
              </div>

              <div class="border-b border-dashed border-slate-300 my-3"></div>
              
              <div class="text-center space-y-3">
                <p class="font-bold text-slate-900 uppercase text-[8px] tracking-tight leading-snug">
                  {{ form.receipt_footer || "THANK YOU!" }}
                </p>

                <div v-if="form.wifi_pass" class="inline-block px-3 py-1 border border-slate-900 rounded-md">
                  <p class="text-[6px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">WIFI PASS</p>
                  <p class="font-mono font-bold text-slate-900 tracking-wider text-[9px]">{{ form.wifi_pass }}</p>
                </div>

                <div class="pt-2">
                   <p class="text-[7px] text-slate-400 font-bold uppercase tracking-widest">Powered by Cambodge POS</p>
                </div>
              </div>
            </div>

            <div class="absolute -bottom-2 left-0 w-full h-3 z-10" 
              style="background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%); background-size: 10px 20px; background-repeat: repeat-x;">
            </div>

          </div>
        </div>
      </div>

    </div>
  </div>
</template>