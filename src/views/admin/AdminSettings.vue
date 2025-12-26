<script setup>
import { ref, onMounted, computed } from "vue";
import { useRouter } from "vue-router"; 
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useToastStore } from "../../stores/toastStore";
import { usePlanLimits } from "../../composables/usePlanLimits";
import {
  Loader2, Save, Upload, MapPin, Phone, Wifi,
  DollarSign, Percent, Lock, Monitor, Smartphone, 
  Image, CheckCircle2, ArrowRight, FileText, Clock, CreditCard, Store, List, ShoppingBag, ArrowDown, AlertTriangle, Ban, Info
} from "lucide-vue-next";

const router = useRouter();
const userStore = useUserStore();
const toast = useToastStore();
const { fetchUsage, checkLimit, currentPlan, usage, limits, planConfigs } = usePlanLimits();

const inputClass = "w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-slate-400 focus:ring-0 transition-all placeholder:text-slate-300";

const activeTab = ref('identity');
const saving = ref(false);
const loading = ref(true);
const uploading = ref(false);
const showMobilePreview = ref(false);

// Payment State
const showPaymentModal = ref(false);
const paymentFile = ref(null);
const paymentPreview = ref(null);
const paymentPlan = ref(null);
const uploadingPayment = ref(false);
const pendingRequest = ref(null);

// ACTION MODAL STATE
const actionModal = ref({
  isOpen: false,
  mode: 'error', 
  title: '',
  message: '',
  details: [], 
  primaryAction: null, 
  primaryLabel: '',
  secondaryAction: null,
  secondaryLabel: 'Cancel'
});

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
  use_logo_header: true,
});

const showTax = ref(false);
const showService = ref(false);

// --- Helpers ---
const displayLimit = (val) => (val === Infinity || val === null) ? '∞' : val;
const formatLimitText = (val) => (val === Infinity || val === null) ? 'Unlimited' : val;

const getProgress = (curr, max) => {
  if (max === Infinity || max === null) return 0;
  return Math.min((curr / max) * 100, 100);
};

const sortedPlans = computed(() => {
  return Object.entries(planConfigs.value)
    .map(([key, val]) => ({ id: key, ...val }))
    .sort((a, b) => a.price - b.price);
});

// Preview Logic
const previewTotal = 5.00; 
const previewTaxVal = computed(() => showTax.value ? (previewTotal * (form.value.tax_rate || 0)) / 100 : 0);
const previewServiceVal = computed(() => showService.value ? (previewTotal * (form.value.service_charge || 0)) / 100 : 0);
const finalUsd = computed(() => previewTotal + previewTaxVal.value + previewServiceVal.value);
const finalRiel = computed(() => Math.ceil((finalUsd.value * (form.value.exchange_rate || 4000)) / 100) * 100);
const baseRiel = computed(() => Math.ceil((previewTotal * (form.value.exchange_rate || 4000)) / 100) * 100);

// --- VALIDATION LOGIC ---

const checkPendingPayments = async () => {
  if (!userStore.organizationId) return;
  const { data } = await supabase.from('payment_requests')
    .select('*')
    .eq('organization_id', userStore.organizationId)
    .eq('status', 'pending')
    .single();
  pendingRequest.value = data;
};

const getPlanValidationErrors = (targetPlanId) => {
  const targetPlan = planConfigs.value[targetPlanId];
  if (!targetPlan) return { valid: false, error: "Invalid plan" };

  const errors = [];

  // Check Menu Items
  if (targetPlan.max_items !== null && usage.value.items > targetPlan.max_items) {
    const diff = usage.value.items - targetPlan.max_items;
    errors.push({
      type: 'items', // Added type for smart routing
      icon: List,
      title: 'Menu Limit Exceeded',
      current: `${usage.value.items} Items`,
      limit: `Max ${targetPlan.max_items}`,
      action: `Archive or delete ${diff} items to proceed.`
    });
  }

  // Check Branches
  if (targetPlan.max_branches !== null && usage.value.branches > targetPlan.max_branches) {
    const diff = usage.value.branches - targetPlan.max_branches;
    errors.push({
      type: 'branches', // Added type for smart routing
      icon: Store,
      title: 'Too Many Branches',
      current: `${usage.value.branches} Stores`,
      limit: `Max ${targetPlan.max_branches}`,
      action: `Remove ${diff} extra store locations.`
    });
  }

  return { valid: errors.length === 0, errors, planName: targetPlan.name };
};

// --- HANDLERS (SMART BUTTON LOGIC) ---

const handleDowngradeClick = (plan) => {
  // Ensure we have the ID to check validation
  const check = getPlanValidationErrors(plan.id);

  // SCENARIO 1: BLOCKER (Smart Routing)
  if (!check.valid) {
    // 1. Identify the primary issue
    const firstIssue = check.errors[0];
    
    // 2. Determine Button Label & Route based on issue type
    let smartAction = { label: 'Go to Dashboard', route: 'admin-dashboard' };

    if (firstIssue.type === 'branches') {
      smartAction = { label: 'Manage Stores', route: 'AdminStores' }; // Routes to /admin/stores
    } else if (firstIssue.type === 'items') {
      smartAction = { label: 'Manage Products', route: 'admin-products' }; // Routes to /admin/products
    }

    actionModal.value = {
      isOpen: true,
      mode: 'error',
      title: `Cannot Switch to ${check.planName}`,
      message: `Your current data exceeds the limits of the ${check.planName} plan. Please resolve the issues below to continue.`,
      details: check.errors,
      primaryLabel: smartAction.label, // Dynamic Label
      primaryAction: () => { 
        actionModal.value.isOpen = false; 
        router.push({ name: smartAction.route }); // Dynamic Route
      },
      secondaryLabel: 'Close',
      secondaryAction: () => { actionModal.value.isOpen = false; }
    };
    return;
  }

  // SCENARIO 2: CONFIRMATION (Detailed Warning)
  actionModal.value = {
    isOpen: true,
    mode: 'confirm',
    title: `Downgrade to ${plan.name}?`,
    message: `You are about to switch to the ${plan.name} plan.`,
    details: [
      { icon: Info, title: 'Effect Timing', current: 'Next Cycle', limit: '', action: 'Changes apply automatically when your current plan expires.' },
      { icon: Ban, title: 'Feature Loss', current: 'Branding', limit: '', action: 'You will lose custom receipt branding and premium support.' }
    ],
    primaryLabel: 'Yes, Schedule Downgrade',
    primaryAction: async () => {
      await executeDowngrade(plan);
      actionModal.value.isOpen = false;
    },
    secondaryLabel: 'Keep Current Plan',
    secondaryAction: () => { actionModal.value.isOpen = false; }
  };
};

const executeDowngrade = async (plan) => {
  const { error } = await supabase
    .from('organizations')
    .update({ next_plan: plan.id })
    .eq('id', userStore.organizationId);

  if (error) {
    toast.addToast("Error: " + error.message, "error");
  } else {
    toast.addToast(`Downgrade scheduled. You will switch to ${plan.name} next month.`, "success");
  }
};

const openPaymentModal = (planId, price) => {
  // 1. Validation Check
  const check = getPlanValidationErrors(planId);
  
  if (!check.valid) {
     // FIX: Create the plan object manually since planConfigs[id] doesn't have the ID property
     const planObject = { 
        id: planId, 
        ...planConfigs.value[planId] 
     };
     handleDowngradeClick(planObject); // Show the nice error modal
     return;
  }

  // 2. Pending Check
  if (pendingRequest.value) return toast.addToast("You already have a pending payment request.", "error");
  
  // 3. Open Modal
  paymentPlan.value = { id: planId, price: price };
  paymentFile.value = null;
  paymentPreview.value = null;
  showPaymentModal.value = true;
};

// ... (Rest of Payment/Upload logic remains unchanged) ...
const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  paymentFile.value = file;
  paymentPreview.value = URL.createObjectURL(file);
};

const submitPayment = async () => {
  if (!paymentFile.value) return toast.addToast("Please upload a receipt", "error");
  uploadingPayment.value = true;
  try {
    const fileName = `${userStore.organizationId}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage.from('payment-proofs').upload(fileName, paymentFile.value);
    if (uploadError) throw uploadError;
    const { data: { publicUrl } } = supabase.storage.from('payment-proofs').getPublicUrl(fileName);

    const { error: dbError } = await supabase.from('payment_requests').insert({
      organization_id: userStore.organizationId,
      plan_id: paymentPlan.value.id,
      amount: paymentPlan.value.price,
      proof_url: publicUrl
    });
    if (dbError) throw dbError;

    toast.addToast("Payment submitted!", "success");
    showPaymentModal.value = false;
    checkPendingPayments();
  } catch (e) {
    toast.addToast(e.message, "error");
  } finally {
    uploadingPayment.value = false;
  }
};

const fetchSettings = async () => {
  if (!userStore.organizationId) return;
  loading.value = true;
  await fetchUsage();
  await checkPendingPayments();
  const { data } = await supabase.from("settings").select("*").eq("organization_id", userStore.organizationId).single();
  if (data) {
    form.value = { ...form.value, ...data };
    showTax.value = data.tax_rate > 0;
    showService.value = data.service_charge > 0;
    if (!checkLimit('custom_logo')) form.value.use_logo_header = false;
  }
  loading.value = false;
};

const handleLogoUpload = async (event) => {
  if (!checkLimit('custom_logo')) return;
  const file = event.target.files[0];
  if (!file) return;
  uploading.value = true;
  try {
    const fileName = `${userStore.organizationId}-${Date.now()}.${file.name.split(".").pop()}`;
    const { error: upErr } = await supabase.storage.from("logos").upload(`store-logos/${fileName}`, file, { upsert: true });
    if (upErr) throw upErr;
    const { data } = supabase.storage.from("logos").getPublicUrl(`store-logos/${fileName}`);
    form.value.logo_url = data.publicUrl;
    toast.addToast("Logo uploaded", "success");
  } catch (e) { toast.addToast("Upload failed", "error"); } 
  finally { uploading.value = false; }
};

const saveSettings = async () => {
  saving.value = true;
  const payload = { ...form.value, organization_id: userStore.organizationId };
  delete payload.id; delete payload.created_at;
  if (!showTax.value) payload.tax_rate = 0;
  if (!showService.value) payload.service_charge = 0;
  
  const { error } = await supabase.from("settings").upsert(payload, { onConflict: "organization_id" });
  saving.value = false;
  if (error) toast.addToast(error.message, "error");
  else toast.addToast("Configuration Saved", "success");
};

onMounted(fetchSettings);

const tabs = [
  { id: 'identity', label: 'Branding' },
  { id: 'billing', label: 'Plan & Billing' },
  { id: 'finance', label: 'Finance' },
  { id: 'system', label: 'System' },
];
</script>

<template>
  <div class="relative">
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
      <div class="flex gap-6 overflow-x-auto no-scrollbar border-b border-slate-200 sm:border-none pb-1 sm:pb-0">
        <button v-for="tab in tabs" :key="tab.id" @click="activeTab = tab.id" class="pb-2 text-xs font-semibold border-b-2 transition-colors whitespace-nowrap" :class="activeTab === tab.id ? 'text-slate-900 border-slate-900' : 'text-slate-400 border-transparent hover:text-slate-600'">{{ tab.label }}</button>
      </div>
      <div class="flex items-center gap-2 self-end sm:self-auto">
        <button @click="showMobilePreview = true" class="md:hidden p-2 text-slate-500 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors"><Smartphone class="w-4 h-4"/></button>
        <button @click="saveSettings" :disabled="saving" class="flex items-center gap-2 bg-slate-900 text-white px-5 py-2 rounded-lg text-xs font-bold hover:bg-slate-800 transition-all disabled:opacity-50 shadow-sm"><Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" /><Save v-else class="w-3.5 h-3.5" /><span>Save Changes</span></button>
      </div>
    </div>

    <div class="flex flex-col lg:flex-row gap-10 items-start">
      <div class="flex-1 w-full min-w-0">
        <div v-if="loading" class="flex justify-center py-20"><Loader2 class="w-8 h-8 animate-spin text-slate-300"/></div>
        
        <div v-else class="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
          
          <div v-if="activeTab === 'identity'" class="space-y-6">
            <div class="flex items-start gap-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
               <div class="shrink-0 group relative w-24 h-24 rounded-lg border border-slate-100 bg-slate-50 flex items-center justify-center overflow-hidden">
                  <img v-if="form.logo_url" :src="form.logo_url" class="w-full h-full object-contain p-2" />
                  <Image v-else class="w-6 h-6 text-slate-300" />
                  <div v-if="!checkLimit('custom_logo')" class="absolute inset-0 bg-slate-100/90 flex flex-col items-center justify-center text-slate-400"><Lock class="w-4 h-4 mb-1" /><span class="text-[8px] font-bold uppercase">Locked</span></div>
                  <label v-else class="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-opacity text-white"><Upload class="w-4 h-4" /><input type="file" class="hidden" @change="handleLogoUpload" accept="image/*" /></label>
               </div>
               <div class="flex-1 space-y-4"><div class="grid gap-1.5"><label class="text-[10px] font-bold uppercase text-slate-400">Shop Name</label><input v-model="form.receipt_header" :class="inputClass" placeholder="My Coffee Shop" /></div><div class="flex items-center gap-2"><input type="checkbox" v-model="form.use_logo_header" :disabled="!checkLimit('custom_logo')" class="rounded border-slate-300 text-slate-900 focus:ring-0 w-3.5 h-3.5" /><span class="text-xs font-medium text-slate-600">Use Logo on Receipt</span></div></div>
            </div>
            <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="md:col-span-2"><label class="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1.5"><MapPin class="w-3 h-3"/> Address</label><textarea v-model="form.receipt_address" rows="2" :class="inputClass" class="resize-none" placeholder="Store address..."></textarea></div>
               <div><label class="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1.5"><Phone class="w-3 h-3"/> Phone</label><input v-model="form.receipt_phone" :class="inputClass" placeholder="012..." /></div>
               <div><label class="text-[10px] font-bold uppercase text-slate-400 flex items-center gap-1 mb-1.5"><Wifi class="w-3 h-3"/> Wifi</label><input v-model="form.wifi_pass" :class="inputClass" placeholder="Pass123" /></div>
               <div class="md:col-span-2"><label class="text-[10px] font-bold uppercase text-slate-400 mb-1.5 block">Footer Note</label><input v-model="form.receipt_footer" :class="inputClass" placeholder="Thank you!" /></div>
            </div>
          </div>

          <div v-if="activeTab === 'billing'" class="space-y-6">
            <section class="grid grid-cols-1 md:grid-cols-2 gap-4">
               <div class="col-span-1 md:col-span-2 bg-slate-900 text-white rounded-xl p-6 shadow-md flex items-center justify-between relative overflow-hidden">
                  <div class="absolute right-0 top-0 h-full w-1/3 bg-linear-to-l from-white/10 to-transparent pointer-events-none"></div>
                  <div class="relative z-10"><div class="text-[10px] font-bold uppercase text-slate-400 mb-1">Current Plan</div><div class="text-2xl font-bold flex items-center gap-3">{{ limits.name }} <span class="px-2 py-0.5 rounded-md bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-[9px] font-bold uppercase tracking-wide">Active</span></div></div>
                  <div class="text-right relative z-10"><div class="text-[10px] font-bold uppercase text-slate-400 mb-1">Status</div><div class="text-sm font-bold">Active</div></div>
               </div>
               <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-sm"><div class="flex justify-between items-end mb-3"><span class="text-xs font-bold text-slate-700">Menu Items</span><span class="text-[10px] font-mono text-slate-400">{{ usage.items }} / {{ displayLimit(limits.max_items) }}</span></div><div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-slate-900 rounded-full transition-all duration-1000" :style="`width: ${getProgress(usage.items, limits.max_items)}%`"></div></div></div>
               <div class="p-5 bg-white border border-slate-200 rounded-xl shadow-sm"><div class="flex justify-between items-end mb-3"><span class="text-xs font-bold text-slate-700">Monthly Orders</span><span class="text-[10px] font-mono text-slate-400">{{ usage.orders_month }} / {{ displayLimit(limits.max_orders) }}</span></div><div class="h-2 w-full bg-slate-100 rounded-full overflow-hidden"><div class="h-full bg-blue-600 rounded-full transition-all duration-1000" :style="`width: ${getProgress(usage.orders_month, limits.max_orders)}%`"></div></div></div>
            </section>

            <section>
              <div class="flex items-center justify-between mb-4 mt-2">
                 <h3 class="text-sm font-bold text-slate-900">Manage Plan</h3>
                 <div v-if="pendingRequest" class="flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-200"><Clock class="w-3.5 h-3.5" /><span class="text-[10px] font-bold">Payment Pending Review</span></div>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
                 <div v-for="plan in sortedPlans" :key="plan.id" class="relative p-5 rounded-xl border transition-all flex flex-col justify-between min-h-35" :class="currentPlan === plan.id ? 'border-slate-900 bg-slate-50 ring-1 ring-slate-900' : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-sm'">
                    <div v-if="currentPlan === plan.id" class="absolute top-3 right-3 text-emerald-600"><CheckCircle2 class="w-5 h-5" /></div>
                    <div><div class="text-[10px] font-bold uppercase tracking-widest mb-1" :class="currentPlan === plan.id ? 'text-slate-600' : 'text-slate-400'">{{ plan.name }}</div><div class="text-2xl font-bold text-slate-900">{{ plan.price > 0 ? '$' + plan.price : 'Free' }}<span v-if="plan.price > 0" class="text-[10px] font-medium text-slate-400 ml-0.5">/mo</span></div></div>
                    <div class="my-4 space-y-2">
                       <div class="flex items-center gap-2 text-[10px] text-slate-600"><Store class="w-3.5 h-3.5 text-slate-400" /><span>{{ formatLimitText(plan.max_branches) }} Branch{{ plan.max_branches !== 1 ? 'es' : '' }}</span></div>
                       <div class="flex items-center gap-2 text-[10px] text-slate-600"><List class="w-3.5 h-3.5 text-slate-400" /><span>{{ formatLimitText(plan.max_items) }} Menu Items</span></div>
                       <div class="flex items-center gap-2 text-[10px] text-slate-600"><ShoppingBag class="w-3.5 h-3.5 text-slate-400" /><span>{{ formatLimitText(plan.max_orders) }} Orders/mo</span></div>
                       <div class="flex items-center gap-2 text-[10px] text-slate-600"><Image class="w-3.5 h-3.5 text-slate-400" /><span>{{ plan.allow_custom_logo ? 'Custom Branding' : 'Standard Branding' }}</span></div>
                    </div>
                    <div class="mt-auto pt-3 border-t border-slate-100">
                       
                       <button v-if="currentPlan !== plan.id && plan.price > 0" @click="openPaymentModal(plan.id, plan.price)" :disabled="!!pendingRequest" class="w-full py-2 bg-black text-white rounded-lg text-xs font-bold hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed">{{ pendingRequest ? 'Pending...' : 'Switch Plan' }}</button>

                       <button v-else-if="currentPlan !== plan.id && plan.price === 0" @click="handleDowngradeClick(plan)" class="w-full py-2 border border-slate-200 text-slate-600 rounded-lg text-xs font-bold hover:bg-slate-50 flex items-center justify-center gap-2"><ArrowDown class="w-3 h-3" /> Downgrade</button>

                       <div v-else-if="currentPlan === plan.id">
                          <div v-if="plan.price > 0" class="flex flex-col gap-2"><div class="text-center text-[10px] font-bold text-emerald-600 bg-emerald-100/50 py-1 rounded">Current Plan</div><button @click="openPaymentModal(plan.id, plan.price)" :disabled="!!pendingRequest" class="w-full py-2 border border-slate-900 text-slate-900 rounded-lg text-xs font-bold hover:bg-slate-50 disabled:opacity-50">{{ pendingRequest ? 'Pending...' : 'Renew / Extend' }}</button></div>
                          <div v-else class="text-center text-[10px] font-bold text-slate-400 py-2">Active Free Plan</div>
                       </div>

                    </div>
                 </div>
              </div>
            </section>
          </div>
          
          <div v-if="activeTab === 'finance'" class="space-y-6">
             <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between"><div><div class="text-sm font-bold text-slate-900">Exchange Rate</div><div class="text-[10px] text-slate-500 mt-1">Global KHR conversion rate</div></div><div class="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-200"><span class="text-xs font-bold text-slate-400">$1 =</span><input v-model="form.exchange_rate" type="number" class="w-20 text-right text-lg font-bold bg-transparent border-none p-0 focus:ring-0" /><span class="text-xs font-bold text-slate-900">៛</span></div></div>
             <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-6"><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-blue-50 flex items-center justify-center text-blue-600"><Percent class="w-5 h-5"/></div><div><div class="text-sm font-bold text-slate-900">VAT Tax</div><div class="text-[10px] text-slate-500">Percentage added to subtotal</div></div></div><div class="flex items-center gap-3"><input v-if="showTax" v-model="form.tax_rate" type="number" class="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg py-1.5 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" /><button @click="showTax = !showTax" class="w-10 h-6 rounded-full transition-colors relative" :class="showTax ? 'bg-blue-600' : 'bg-slate-200'"><span class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm" :class="showTax ? 'translate-x-4' : ''"></span></button></div></div><div class="border-t border-slate-100"></div><div class="flex items-center justify-between"><div class="flex items-center gap-4"><div class="w-10 h-10 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><DollarSign class="w-5 h-5"/></div><div><div class="text-sm font-bold text-slate-900">Service Charge</div><div class="text-[10px] text-slate-500">Service fee for dine-in</div></div></div><div class="flex items-center gap-3"><input v-if="showService" v-model="form.service_charge" type="number" class="w-16 text-center text-sm font-bold border border-slate-200 rounded-lg py-1.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500" /><button @click="showService = !showService" class="w-10 h-6 rounded-full transition-colors relative" :class="showService ? 'bg-emerald-600' : 'bg-slate-200'"><span class="absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform shadow-sm" :class="showService ? 'translate-x-4' : ''"></span></button></div></div></div>
          </div>
          <div v-if="activeTab === 'system'" class="space-y-6">
             <div class="bg-white p-6 rounded-xl border border-slate-200 shadow-sm"><label class="text-[10px] font-bold uppercase text-slate-400 mb-4 block">Default Paper Size</label><div class="grid grid-cols-1 sm:grid-cols-2 gap-4"><button @click="form.paper_size = '58mm'" class="px-5 py-4 rounded-xl border-2 text-left transition-all" :class="form.paper_size === '58mm' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'"><div class="text-sm font-bold text-slate-900 mb-1">58mm (Small)</div><div class="text-[10px] text-slate-500">Standard for portable Bluetooth printers.</div></button><button @click="form.paper_size = '80mm'" class="px-5 py-4 rounded-xl border-2 text-left transition-all" :class="form.paper_size === '80mm' ? 'border-slate-900 bg-slate-50' : 'border-slate-100 hover:border-slate-300'"><div class="text-sm font-bold text-slate-900 mb-1">80mm (Wide)</div><div class="text-[10px] text-slate-500">Standard for kitchen & countertop printers.</div></button></div></div>
          </div>

        </div>
      </div>

      <div class="hidden md:block w-72 lg:w-80 shrink-0 relative">
        <div class="sticky top-0"> 
           <div class="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2"><Monitor class="w-3 h-3"/> Live Preview</div>
           <div class="relative w-full drop-shadow-xl transition-transform hover:scale-[1.01] duration-300">
              <div class="absolute -top-2 left-0 w-full h-3 z-10 rotate-180" style="background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%); background-size: 10px 20px; background-repeat: repeat-x;"></div>
              <div class="bg-white p-6 pt-8 pb-8 text-[10px] font-mono leading-tight relative min-h-90">
                 <div class="text-center mb-4"><div v-if="form.use_logo_header && form.logo_url" class="mb-2 flex justify-center"><img :src="form.logo_url" class="h-10 object-contain grayscale" /></div><div v-else class="font-bold text-sm uppercase tracking-tight text-slate-900 mb-2 wrap-break-word">{{ form.receipt_header || "SHOP NAME" }}</div><div class="text-[9px] text-slate-500 leading-relaxed font-sans mt-1 wrap-break-word">{{ form.receipt_address || "123 Business St, Phnom Penh" }}<br/>{{ form.receipt_phone || "012 345 678" }}</div></div>
                 <div class="border-b border-dashed border-slate-300 my-3"></div>
                 <div class="space-y-3 mb-4"><div class="flex justify-between font-bold text-slate-900"><span>1x Iced Latte (Large)</span><span>{{ (baseRiel * 0.70).toLocaleString() }} ៛</span></div><div class="text-[9px] text-slate-500 font-sans italic -mt-2">Oat Milk, Less Sugar</div><div class="flex justify-between font-bold text-slate-900"><span>1x Butter Croissant</span><span>{{ (baseRiel * 0.30).toLocaleString() }} ៛</span></div></div>
                 <div class="border-t-[1.5px] border-slate-900 pt-3 space-y-1 font-sans"><div class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"><span>Subtotal</span><span>{{ baseRiel.toLocaleString() }} ៛</span></div><div v-if="showTax" class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"><span>VAT ({{ form.tax_rate }}%)</span><span>{{ (baseRiel * (form.tax_rate / 100)).toLocaleString() }} ៛</span></div><div v-if="showService" class="flex justify-between text-slate-500 font-bold text-[9px] uppercase tracking-wider"><span>Service ({{ form.service_charge }}%)</span><span>{{ (baseRiel * (form.service_charge / 100)).toLocaleString() }} ៛</span></div><div class="border-b border-slate-200 my-2"></div><div class="flex justify-between items-center mt-1"><span class="text-[10px] font-bold uppercase text-slate-900">Total (KHR)</span><span class="text-xl font-semibold text-slate-900 tracking-tighter">{{ finalRiel.toLocaleString() }} ៛</span></div><div class="flex justify-between items-center text-slate-500 font-medium mt-1"><span class="text-[9px]">Total (USD)</span><span class="text-xs font-semibold tracking-tighter">${{ finalUsd.toFixed(2) }}</span></div></div>
                 <div class="border-b border-dashed border-slate-300 my-4"></div>
                 <div class="text-center space-y-4"><p class="font-bold text-slate-900 uppercase text-[9px] tracking-tight leading-snug wrap-break-word">{{ form.receipt_footer || "Thank you for your visit!" }}</p><div v-if="form.wifi_pass" class="inline-block px-3 py-1 border border-slate-900 rounded-md"><p class="text-[7px] font-bold text-slate-500 uppercase tracking-widest mb-0.5">WIFI PASS</p><p class="font-bold text-slate-900 tracking-wider text-[10px]">{{ form.wifi_pass }}</p></div><div class="text-[8px] text-slate-400 uppercase tracking-widest pt-2">Powered by Cambodge POS</div></div>
              </div>
              <div class="absolute -bottom-2 left-0 w-full h-3 z-10" style="background-image: linear-gradient(135deg, #fff 25%, transparent 25%), linear-gradient(225deg, #fff 25%, transparent 25%); background-size: 10px 20px; background-repeat: repeat-x;"></div>
           </div>
        </div>
      </div>
    </div>

    <div v-if="actionModal.isOpen" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
       <div class="bg-white w-full max-w-sm rounded-xl shadow-2xl p-6 relative overflow-hidden">
          
          <div class="flex justify-center mb-4">
             <div v-if="actionModal.mode === 'error'" class="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-600 animate-in zoom-in-50 duration-300"><Ban class="w-6 h-6" /></div>
             <div v-else class="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 animate-in zoom-in-50 duration-300"><AlertTriangle class="w-6 h-6" /></div>
          </div>

          <h2 class="text-lg font-bold text-center mb-2 text-slate-900">{{ actionModal.title }}</h2>
          <p class="text-xs text-slate-500 text-center mb-6 leading-relaxed">{{ actionModal.message }}</p>

          <div v-if="actionModal.details && actionModal.details.length" class="bg-slate-50 rounded-lg p-3 border border-slate-100 mb-6 space-y-3">
             <div v-for="(detail, i) in actionModal.details" :key="i" class="flex gap-3 text-[11px] items-start">
                <div class="mt-0.5 p-1 bg-white border border-slate-200 rounded shrink-0"><component :is="detail.icon" class="w-3 h-3 text-slate-500" /></div>
                <div class="flex-1">
                   <div class="flex justify-between items-center mb-0.5">
                      <span class="font-bold text-slate-900">{{ detail.title }}</span>
                      <span v-if="detail.current" class="text-[9px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded font-mono">{{ detail.current }}</span>
                   </div>
                   <div class="text-slate-500 leading-snug">{{ detail.action }}</div>
                </div>
             </div>
          </div>

          <div class="flex gap-2">
             <button @click="actionModal.secondaryAction()" class="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors text-slate-600">{{ actionModal.secondaryLabel }}</button>
             <button @click="actionModal.primaryAction()" 
               class="flex-1 py-2.5 rounded-lg font-bold text-xs text-white shadow-md transition-all flex items-center justify-center gap-2 hover:shadow-lg hover:-translate-y-0.5"
               :class="actionModal.mode === 'error' ? 'bg-slate-900 hover:bg-slate-800' : 'bg-red-600 hover:bg-red-700'">
               {{ actionModal.primaryLabel }}
             </button>
          </div>
       </div>
    </div>

    <div v-if="showPaymentModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div class="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
         <h2 class="text-lg font-bold mb-1">{{ currentPlan === paymentPlan?.id ? 'Renew / Extend' : 'Upgrade Plan' }}</h2>
         <p class="text-xs text-slate-500 mb-4">Transfer <span class="font-bold text-black">${{ paymentPlan?.price }}</span> to the account below.</p>
         <div class="bg-slate-50 p-4 rounded-lg border border-slate-200 mb-4 space-y-2"><div class="flex justify-between text-xs"><span class="text-slate-500">Bank:</span><span class="font-bold">ABA Bank</span></div><div class="flex justify-between text-xs"><span class="text-slate-500">Account:</span><span class="font-bold font-mono">001 234 567</span></div><div class="flex justify-between text-xs"><span class="text-slate-500">Name:</span><span class="font-bold">MY COMPANY LTD</span></div></div>
         <div class="mb-4"><label class="block w-full cursor-pointer relative overflow-hidden group"><div v-if="!paymentPreview" class="border-2 border-dashed border-slate-300 rounded-xl h-32 flex flex-col items-center justify-center gap-2 group-hover:border-slate-400 group-hover:bg-slate-50 transition-colors"><FileText class="w-6 h-6 text-slate-400" /><span class="text-[10px] font-bold text-slate-500">Click to upload receipt</span></div><img v-else :src="paymentPreview" class="w-full h-32 object-cover rounded-xl border border-slate-200" /><input type="file" class="hidden" @change="handleFileSelect" accept="image/*" /></label></div>
         <div class="flex gap-2"><button @click="showPaymentModal = false" class="flex-1 py-2.5 border rounded-lg font-bold text-xs hover:bg-slate-50">Cancel</button><button @click="submitPayment" :disabled="uploadingPayment" class="flex-1 py-2.5 bg-black text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2"><Loader2 v-if="uploadingPayment" class="w-3.5 h-3.5 animate-spin" />{{ uploadingPayment ? 'Uploading...' : 'Submit Payment' }}</button></div>
      </div>
    </div>
  </div>
</template>