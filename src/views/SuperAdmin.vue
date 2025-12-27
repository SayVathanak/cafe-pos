<script setup>
import { ref, onMounted, computed, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { supabase } from "../services/supabase";
import { useToastStore } from "../stores/toastStore";
import { useUserStore } from "../stores/userStore";
import {
  Building2, Plus, Search, Loader2, X, LayoutGrid,
  CheckCircle2, LogOut, Trash2, Coffee,
  Zap, Star, Briefcase, ChevronDown, Settings, Infinity as InfinityIcon,
  Users, Pencil, Calendar, AlertCircle, Ban, LogIn, CreditCard, ExternalLink, Check, X as XIcon, Menu
} from "lucide-vue-next";

const router = useRouter();
const toast = useToastStore();
const userStore = useUserStore();
const orgs = ref([]);
const loading = ref(true);
const showModal = ref(false);
const showPlansModal = ref(false); 
const saving = ref(false);
const searchQuery = ref("");
const activeDropdownId = ref(null); 

// Edit State
const editMode = ref(false);
const editingId = ref(null);

// Plan Config State
const planConfigs = ref([]);
const loadingPlans = ref(false);

// Payment Requests State
const showRequestsModal = ref(false);
const requests = ref([]);
const processingPayment = ref(false);

// Form State
const newOrg = ref({ name: "", ownerEmail: "", ownerPassword: "", plan: "starter", validUntil: "", status: "active" });

const uiPlans = [
  { id: 'starter', icon: Star, color: 'text-slate-600 bg-slate-100 border-slate-200' },
  { id: 'standard', icon: Zap, color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { id: 'business', icon: Briefcase, color: 'text-purple-600 bg-purple-50 border-purple-200' }
];

// --- Helpers ---
const isExpired = (dateString) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

const formatDate = (dateString) => {
  if (!dateString) return "No Date";
  return new Date(dateString).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

const getYesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const getNextMonth = () => {
  const d = new Date();
  d.setMonth(d.getMonth() + 1);
  return d.toISOString().split('T')[0];
};

// --- Actions ---
const toggleDropdown = (id) => {
  if (activeDropdownId.value === id) activeDropdownId.value = null;
  else activeDropdownId.value = id;
};

const closeDropdown = (e) => {
  if (!e.target.closest('.plan-trigger')) activeDropdownId.value = null;
};

// --- IMPERSONATION LOGIC ---
const impersonateClient = (org) => {
  if (!confirm(`Log in as ${org.name}? You will see exactly what they see.`)) return;
  sessionStorage.setItem('superAdmin_restore', JSON.stringify({ role: userStore.role, orgId: userStore.organizationId, storeName: userStore.storeName }));
  userStore.organizationId = org.id;
  userStore.storeName = org.name;
  userStore.role = 'admin'; 
  toast.addToast(`Logged in as ${org.name}`, "success");
  router.push('/admin');
};

// --- PAYMENT REQUEST LOGIC ---
const fetchRequests = async () => {
  const { data } = await supabase.from('payment_requests').select('*, organizations(name)').eq('status', 'pending').order('created_at', { ascending: false });
  requests.value = data || [];
};

const openRequestsManager = () => {
  fetchRequests();
  showRequestsModal.value = true;
};

const approvePayment = async (req) => {
  if (!confirm(`Approve payment of $${req.amount} for ${req.organizations.name}?`)) return;
  processingPayment.value = true;

  const { data: currentOrg } = await supabase.from('organizations').select('plan, valid_until').eq('id', req.organization_id).single();

  const now = new Date();
  const validUntil = currentOrg.valid_until ? new Date(currentOrg.valid_until) : new Date(0);
  const hasTimeLeft = validUntil > now;
  const isPlanChange = currentOrg.plan !== req.plan_id;

  let updateData = {};
  let successMessage = "";

  if (hasTimeLeft && isPlanChange) {
     updateData = { next_plan: req.plan_id };
     successMessage = `Change queued! They will switch to ${req.plan_id} after expiry.`;
  } else {
     let newDate = hasTimeLeft ? validUntil : now;
     newDate.setMonth(newDate.getMonth() + 1);
     updateData = { plan: req.plan_id, valid_until: newDate.toISOString(), next_plan: null };
     successMessage = "Plan updated & subscription extended!";
  }

  const { error: orgErr } = await supabase.from('organizations').update(updateData).eq('id', req.organization_id);

  if (!orgErr) {
    await supabase.from('payment_requests').update({ status: 'approved' }).eq('id', req.id);
    toast.addToast(successMessage, "success");
    fetchRequests(); 
    fetchOrgs(); 
  } else {
    toast.addToast("Error: " + orgErr.message, "error");
  }
  processingPayment.value = false;
};

const rejectPayment = async (req) => {
  if (!confirm("Reject this payment request?")) return;
  processingPayment.value = true;
  await supabase.from('payment_requests').update({ status: 'rejected' }).eq('id', req.id);
  toast.addToast("Payment Rejected", "success");
  fetchRequests();
  processingPayment.value = false;
};

// --- PLAN CONFIG LOGIC ---
const fetchPlanConfigs = async () => {
  loadingPlans.value = true;
  const { data, error } = await supabase.from('plan_configs').select('*').order('price', { ascending: true });
  if (error) { toast.addToast("Failed to load plans", "error"); } else {
    planConfigs.value = data.map(dbPlan => ({ ...dbPlan, ...uiPlans.find(ui => ui.id === dbPlan.id), unlimitedBranches: dbPlan.max_branches === null, unlimitedItems: dbPlan.max_items === null, unlimitedOrders: dbPlan.max_orders === null }));
  }
  loadingPlans.value = false;
};

const savePlanConfigs = async () => {
  saving.value = true;
  const updates = planConfigs.value.map(p => ({ id: p.id, name: p.name, price: p.price, allow_custom_logo: p.allow_custom_logo, max_branches: p.unlimitedBranches ? null : p.max_branches, max_items: p.unlimitedItems ? null : p.max_items, max_orders: p.unlimitedOrders ? null : p.max_orders }));
  const { error } = await supabase.from('plan_configs').upsert(updates);
  if (error) toast.addToast("Update failed: " + error.message, "error");
  else { toast.addToast("Plan configurations updated!", "success"); showPlansModal.value = false; fetchOrgs(); }
  saving.value = false;
};

const openPlanManager = () => { fetchPlanConfigs(); showPlansModal.value = true; };

// --- CLIENT MANAGEMENT ---
const fetchOrgs = async () => {
  loading.value = true;
  const { data: orgsData, error } = await supabase.from("organizations").select("id, name, created_at, plan, valid_until").order("created_at", { ascending: false });
  if (error) { loading.value = false; return; }
  const { data: plansData } = await supabase.from('plan_configs').select('id, name');
  const planMap = {}; if(plansData) plansData.forEach(p => planMap[p.id] = p.name);
  const orgsWithCounts = await Promise.all(orgsData.map(async (org) => {
      const { count: stores } = await supabase.from("stores").select("*", { count: "exact", head: true }).eq("organization_id", org.id);
      const { count: profiles } = await supabase.from("profiles").select("*", { count: "exact", head: true }).eq("organization_id", org.id);
      return { ...org, stores: stores || 0, profiles: profiles || 0, plan: org.plan || 'starter', planName: planMap[org.plan] || org.plan };
  }));
  orgs.value = orgsWithCounts; loading.value = false;
};

const updatePlan = async (orgId, newPlan) => {
  const orgIndex = orgs.value.findIndex(o => o.id === orgId);
  if (orgIndex !== -1) orgs.value[orgIndex].plan = newPlan;
  activeDropdownId.value = null;
  const { error } = await supabase.from('organizations').update({ plan: newPlan }).eq('id', orgId);
  if (error) { toast.addToast("Update failed", "error"); fetchOrgs(); } else toast.addToast("Plan updated", "success");
};

// --- CREATE / EDIT LOGIC ---
const openAddModal = () => { editMode.value = false; editingId.value = null; newOrg.value = { name: "", ownerEmail: "", ownerPassword: "", plan: "starter", status: "active", validUntil: getNextMonth() }; showModal.value = true; };
const openEditModal = (org) => { editMode.value = true; editingId.value = org.id; const expired = isExpired(org.valid_until); newOrg.value = { name: org.name, plan: org.plan, status: expired ? 'suspended' : 'active', validUntil: org.valid_until ? org.valid_until.split('T')[0] : "", ownerEmail: "", ownerPassword: "" }; showModal.value = true; };
const updateClient = async () => { saving.value = true; let finalDate = newOrg.value.validUntil; if (newOrg.value.status === 'suspended') finalDate = getYesterday(); else if (newOrg.value.status === 'active' && isExpired(finalDate)) finalDate = getNextMonth(); const { error } = await supabase.from('organizations').update({ name: newOrg.value.name, plan: newOrg.value.plan, valid_until: finalDate }).eq('id', editingId.value); if (error) toast.addToast("Update failed: " + error.message, "error"); else { toast.addToast(newOrg.value.status === 'suspended' ? "Client Suspended" : "Client Updated", "success"); showModal.value = false; fetchOrgs(); } saving.value = false; };
const createClient = async () => { if (!newOrg.value.name || !newOrg.value.ownerEmail || !newOrg.value.ownerPassword) return toast.addToast("Fill all fields", "error"); saving.value = true; try { const { data: org, error: orgErr } = await supabase.from("organizations").insert({ name: newOrg.value.name, plan: newOrg.value.plan, valid_until: newOrg.value.validUntil }).select().single(); if (orgErr) throw orgErr; const { data: newStore, error: storeErr } = await supabase.from("stores").insert({ organization_id: org.id, name: `${newOrg.value.name} - HQ`, location: "Main Branch", active: true }).select().single(); if (storeErr) throw storeErr; const tempSupabase = createSupabaseClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, { auth: { autoRefreshToken: false, persistSession: false } }); const { data: authData, error: authErr } = await tempSupabase.auth.signUp({ email: newOrg.value.ownerEmail, password: newOrg.value.ownerPassword, options: { data: { full_name: `${newOrg.value.name} Manager`, organization_id: org.id, role: "admin" } } }); if (authErr) throw authErr; if (authData.user) { await supabase.from("profiles").insert({ id: authData.user.id, organization_id: org.id, store_id: newStore.id, email: newOrg.value.ownerEmail, role: "admin", full_name: "Manager" }); await supabase.from("user_roles").insert({ user_id: authData.user.id, store_id: newStore.id, role: "admin" }); toast.addToast(`Client created on ${newOrg.value.plan} tier!`, "success"); showModal.value = false; fetchOrgs(); } } catch (e) { toast.addToast(e.message, "error"); } finally { saving.value = false; } };
const deleteOrg = async (id) => { if(!confirm("Delete this client? Data will be lost.")) return; const { error } = await supabase.from("organizations").delete().eq("id", id); if (!error) { toast.addToast("Deleted", "success"); fetchOrgs(); } };
const handleLogout = async () => { await supabase.auth.signOut(); router.push("/"); };
const filteredOrgs = computed(() => { if (!searchQuery.value) return orgs.value; return orgs.value.filter(o => o.name.toLowerCase().includes(searchQuery.value.toLowerCase())); });

onMounted(() => { fetchOrgs(); fetchRequests(); window.addEventListener('click', closeDropdown); });
onUnmounted(() => { window.removeEventListener('click', closeDropdown); });
</script>

<template>
  <div class="flex flex-col h-screen bg-slate-50 font-sans text-slate-900 overflow-hidden">
    
    <nav class="shrink-0 bg-white border-b border-slate-200 h-16 flex items-center justify-between px-4 sm:px-6 z-20 shadow-sm relative">
      <div class="flex items-center gap-3">
        <div class="w-9 h-9 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-200">
          <LayoutGrid class="w-5 h-5" />
        </div>
        <div>
          <h1 class="font-bold text-sm text-slate-900 leading-tight">Super Admin</h1>
          <p class="text-[10px] text-slate-500 font-medium">Platform Management</p>
        </div>
      </div>
      <button @click="handleLogout" class="group flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-red-50 text-slate-500 hover:text-red-600 transition-all">
        <span class="text-xs font-bold hidden sm:inline">Logout</span>
        <LogOut class="w-4 h-4" />
      </button>
    </nav>

    <div class="shrink-0 px-4 sm:px-6 py-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-white/50 backdrop-blur-sm border-b border-slate-200">
      <div class="relative w-full sm:w-72 group">
        <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-indigo-600 transition-colors" />
        <input 
          v-model="searchQuery" 
          placeholder="Search clients by name..." 
          class="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-sm font-medium focus:ring-2 focus:ring-slate-900 focus:border-slate-900 outline-none transition-all shadow-sm placeholder:text-slate-400" 
        />
      </div>
      
      <div class="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0 no-scrollbar">
         <router-link to="/global-menu" class="whitespace-nowrap bg-white border hover:bg-slate-50 border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95">
           <Coffee class="w-3.5 h-3.5 text-slate-500"/> Menu
         </router-link>
         
         <button @click="openRequestsManager" class="whitespace-nowrap bg-white border hover:bg-slate-50 border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95 relative">
            <CreditCard class="w-3.5 h-3.5 text-slate-500"/> Payments
            <span v-if="requests.length > 0" class="absolute -top-1 -right-1 flex h-3 w-3">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
         </button>
         
         <button @click="openPlanManager" class="whitespace-nowrap bg-white border hover:bg-slate-50 border-slate-200 px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-2 transition-all shadow-sm active:scale-95">
            <Settings class="w-3.5 h-3.5 text-slate-500"/> Plans
         </button>

         <div class="w-px h-6 bg-slate-200 mx-1 hidden sm:block"></div>

         <button @click="openAddModal" class="whitespace-nowrap bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg font-bold text-xs flex items-center gap-2 shadow-lg shadow-slate-200 transition-all active:scale-95">
            <Plus class="w-4 h-4" /> <span class="hidden sm:inline">Add Client</span><span class="sm:hidden">Add</span>
         </button>
      </div>
    </div>

    <main class="flex-1 overflow-hidden p-4 sm:p-6">
      <div class="h-full max-w-7xl mx-auto flex flex-col">
        
        <div class="hidden md:grid grid-cols-12 gap-4 px-4 py-3 bg-white border-b border-slate-200 rounded-t-xl text-[10px] font-bold uppercase tracking-widest text-slate-400 select-none">
          <div class="col-span-4">Client Details</div>
          <div class="col-span-2">Status</div>
          <div class="col-span-3">Subscription Tier</div>
          <div class="col-span-2">Usage</div>
          <div class="col-span-1 text-right">Actions</div>
        </div>

        <div class="flex-1 overflow-y-auto rounded-xl md:rounded-t-none border border-slate-200 bg-white shadow-sm no-scrollbar">
          
          <div v-if="loading" class="flex flex-col items-center justify-center py-20 text-slate-400">
             <Loader2 class="w-8 h-8 animate-spin mb-4 text-indigo-500" />
             <p class="text-xs font-medium">Loading organization data...</p>
          </div>

          <div v-else-if="filteredOrgs.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
            <div class="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mb-4">
               <Search class="w-8 h-8 opacity-50" />
            </div>
            <p class="font-medium">No clients found matching "{{ searchQuery }}"</p>
          </div>

          <div v-else class="divide-y divide-slate-100">
            <div v-for="org in filteredOrgs" :key="org.id" 
                 class="group md:grid md:grid-cols-12 md:gap-4 md:items-center px-4 py-4 hover:bg-slate-50 transition-colors relative flex flex-col gap-4"
                 :class="{'bg-red-50/30': isExpired(org.valid_until)}">
              
              <div class="md:col-span-4 flex items-start gap-3">
                <div class="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 text-slate-500 font-bold text-lg uppercase">
                  {{ org.name.charAt(0) }}
                </div>
                <div>
                  <div class="font-bold text-sm text-slate-900 flex items-center gap-2">
                    {{ org.name }}
                    <span v-if="isExpired(org.valid_until)" class="md:hidden bg-red-100 text-red-600 text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide">Expired</span>
                  </div>
                  <div class="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                    <span>ID: {{ org.id.split('-')[0] }}...</span>
                    <span class="w-1 h-1 rounded-full bg-slate-300"></span>
                    <span>Created {{ formatDate(org.created_at) }}</span>
                  </div>
                </div>
              </div>

              <div class="md:col-span-2 flex items-center justify-between md:justify-start">
                <span class="md:hidden text-xs font-bold text-slate-400 uppercase">Status</span>
                <div v-if="isExpired(org.valid_until)" class="flex items-center gap-2 text-red-600 bg-red-50 border border-red-100 px-2.5 py-1 rounded-full w-fit">
                   <AlertCircle class="w-3.5 h-3.5" />
                   <span class="text-[10px] font-bold uppercase tracking-wide">Expired</span>
                </div>
                <div v-else class="flex flex-col items-end md:items-start">
                   <div class="flex items-center gap-1.5 text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-0.5 rounded-full w-fit mb-1">
                      <div class="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
                      <span class="text-[10px] font-bold uppercase tracking-wide">Active</span>
                   </div>
                   <span class="text-[10px] text-slate-400 font-medium ml-1">Renews: {{ formatDate(org.valid_until) }}</span>
                </div>
              </div>

              <div class="md:col-span-3 relative">
                 <div class="flex items-center justify-between md:hidden mb-1">
                   <span class="text-xs font-bold text-slate-400 uppercase">Plan</span>
                 </div>
                 <button @click.stop="toggleDropdown(org.id)" 
                   class="plan-trigger w-full md:w-48 flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-xs font-bold transition-all hover:shadow-sm" 
                   :class="[uiPlans.find(p => p.id === org.plan)?.color || 'bg-white border-slate-200', activeDropdownId === org.id ? 'ring-2 ring-slate-900 ring-offset-1 z-20 relative' : '']">
                    <div class="flex items-center gap-2">
                       <component v-if="uiPlans.find(p => p.id === org.plan)" :is="uiPlans.find(p => p.id === org.plan).icon" class="w-3.5 h-3.5" />
                       <span class="uppercase tracking-wide">{{ org.planName }}</span>
                    </div>
                    <ChevronDown class="w-3.5 h-3.5 opacity-50" />
                 </button>

                 <div v-if="activeDropdownId === org.id" class="absolute top-full md:top-auto md:bottom-full md:mb-2 left-0 w-full md:w-56 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1">
                    <div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2 bg-slate-50/50">Change Tier</div>
                    <button v-for="plan in uiPlans" :key="plan.id" @click.stop="updatePlan(org.id, plan.id)" 
                            class="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 rounded-lg flex items-center gap-2 mb-0.5 transition-colors" 
                            :class="org.plan === plan.id ? 'bg-slate-50 font-bold' : 'font-medium text-slate-600'">
                       <div class="w-6 h-6 rounded flex items-center justify-center" :class="plan.color.replace('border', 'border-0')">
                          <component :is="plan.icon" class="w-3.5 h-3.5" />
                       </div>
                       <span class="capitalize">{{ plan.id }}</span>
                       <CheckCircle2 v-if="org.plan === plan.id" class="w-3.5 h-3.5 ml-auto text-emerald-500" />
                    </button>
                 </div>
              </div>

              <div class="md:col-span-2 flex md:block items-center justify-between gap-4 border-t md:border-0 border-slate-50 pt-3 md:pt-0 mt-2 md:mt-0">
                 <div class="flex items-center gap-4">
                    <div class="flex items-center gap-2 text-slate-600" title="Active Stores">
                       <Building2 class="w-3.5 h-3.5 text-slate-400" />
                       <span class="text-xs font-bold">{{ org.stores }} <span class="text-[10px] font-normal text-slate-400 hidden lg:inline">Stores</span></span>
                    </div>
                    <div class="flex items-center gap-2 text-slate-600" title="Staff Members">
                       <Users class="w-3.5 h-3.5 text-slate-400" />
                       <span class="text-xs font-bold">{{ org.profiles }} <span class="text-[10px] font-normal text-slate-400 hidden lg:inline">Staff</span></span>
                    </div>
                 </div>
              </div>

              <div class="md:col-span-1 flex justify-end items-center gap-1 border-t md:border-0 border-slate-50 pt-3 md:pt-0 mt-1 md:mt-0">
                 <button @click.stop="impersonateClient(org)" class="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 p-2 rounded-lg transition-colors" title="Log In as Client">
                    <LogIn class="w-4 h-4" />
                 </button>
                 <button @click.stop="openEditModal(org)" class="text-slate-400 hover:text-slate-900 hover:bg-slate-100 p-2 rounded-lg transition-colors" title="Edit Details">
                    <Pencil class="w-4 h-4" />
                 </button>
                 <button @click.stop="deleteOrg(org.id)" class="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-lg transition-colors" title="Delete Client">
                    <Trash2 class="w-4 h-4" />
                 </button>
              </div>

            </div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm transition-opacity">
      <div class="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden ring-1 ring-white/20 animate-in fade-in zoom-in-95 duration-200">
         <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
            <h2 class="text-base font-bold text-slate-900">{{ editMode ? 'Edit Client Details' : 'Onboard New Client' }}</h2>
            <button @click="showModal = false" class="text-slate-400 hover:text-slate-600"><X class="w-5 h-5"/></button>
         </div>
         <div class="p-6 space-y-4">
            <div>
               <label class="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Business Name</label>
               <input v-model="newOrg.name" placeholder="e.g. Acme Coffee Co." class="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900 focus:border-slate-900 transition-all placeholder:text-slate-300" />
            </div>

            <div v-if="editMode" class="p-3 bg-slate-50 rounded-lg border border-slate-100">
               <label class="text-[10px] font-bold uppercase text-slate-500 mb-2 block">Account Status</label>
               <div class="grid grid-cols-2 gap-2">
                  <button @click="newOrg.status = 'active'" class="py-2 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-2" :class="newOrg.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'">
                     <CheckCircle2 class="w-3.5 h-3.5" /> Active
                  </button>
                  <button @click="newOrg.status = 'suspended'" class="py-2 rounded-md border text-xs font-bold transition-all flex items-center justify-center gap-2" :class="newOrg.status === 'suspended' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'">
                     <Ban class="w-3.5 h-3.5" /> Suspended
                  </button>
               </div>
            </div>

            <div :class="{ 'opacity-50 pointer-events-none grayscale': newOrg.status === 'suspended' }">
               <label class="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Subscription End Date</label>
               <div class="relative group">
                  <input type="date" v-model="newOrg.validUntil" class="w-full border border-slate-200 p-2.5 pl-10 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono text-slate-600" />
                  <Calendar class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 group-focus-within:text-slate-900" />
               </div>
               <p v-if="newOrg.status === 'suspended'" class="text-[10px] text-red-500 mt-1.5 font-medium flex items-center gap-1"><AlertCircle class="w-3 h-3"/> Access revoked immediately.</p>
            </div>

            <div>
               <label class="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Starting Plan</label>
               <div class="grid grid-cols-3 gap-2">
                  <button v-for="plan in uiPlans" :key="plan.id" @click="newOrg.plan = plan.id" 
                          class="flex flex-col items-center justify-center py-2 border rounded-lg hover:bg-slate-50 transition-all relative overflow-hidden" 
                          :class="newOrg.plan === plan.id ? 'border-slate-900 bg-slate-50 text-slate-900 ring-1 ring-slate-900 shadow-sm' : 'border-slate-200 text-slate-500'">
                     <component :is="plan.icon" class="w-4 h-4 mb-1" />
                     <span class="text-[10px] font-bold capitalize">{{ plan.id }}</span>
                  </button>
               </div>
            </div>

            <div v-if="!editMode" class="space-y-4 pt-2 border-t border-slate-100 mt-2">
               <div>
                  <label class="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Owner Email</label>
                  <input v-model="newOrg.ownerEmail" type="email" placeholder="admin@client.com" class="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all" />
               </div>
               <div>
                  <label class="text-[10px] font-bold uppercase text-slate-500 mb-1.5 block">Temporary Password</label>
                  <input v-model="newOrg.ownerPassword" type="text" placeholder="••••••••" class="w-full border border-slate-200 p-2.5 rounded-lg text-sm outline-none focus:ring-2 focus:ring-slate-900 transition-all font-mono" />
               </div>
            </div>

            <div class="flex gap-3 pt-4">
               <button @click="showModal = false" class="flex-1 py-2.5 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors">Cancel</button>
               <button @click="editMode ? updateClient() : createClient()" :disabled="saving" class="flex-1 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 transition-all flex items-center justify-center gap-2">
                  <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />
                  {{ saving ? 'Processing...' : (editMode ? 'Save Changes' : 'Create Account') }}
               </button>
            </div>
         </div>
      </div>
    </div>
    
    <div v-if="showPlansModal" class="fixed inset-0 z-50 overflow-hidden">
       <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showPlansModal = false"></div>
       <div class="absolute inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
          <div class="w-screen max-w-2xl pointer-events-auto transition-transform bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
             <div class="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                <div>
                   <h2 class="text-lg font-bold text-slate-900">Plan Configurations</h2>
                   <p class="text-xs text-slate-500 mt-0.5">Control pricing, limits, and feature gating globally.</p>
                </div>
                <button @click="showPlansModal = false" class="p-2 text-slate-400 hover:bg-slate-200 rounded-full transition-colors"><X class="w-5 h-5"/></button>
             </div>
             
             <div class="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                <div v-if="loadingPlans" class="flex justify-center py-20"><Loader2 class="w-8 h-8 animate-spin text-slate-300"/></div>
                <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div v-for="plan in planConfigs" :key="plan.id" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md hover:border-slate-300 transition-all group">
                      <div class="flex items-center gap-3 mb-6">
                         <div class="w-10 h-10 rounded-lg flex items-center justify-center border transition-colors" :class="plan.color">
                            <component :is="plan.icon" class="w-5 h-5"/>
                         </div>
                         <div class="w-full">
                            <input v-model="plan.name" class="font-bold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-slate-900 focus:outline-none w-full transition-colors" placeholder="Plan Name" />
                            <div class="text-[10px] text-slate-400 font-mono uppercase mt-0.5">{{ plan.id }} tier</div>
                         </div>
                      </div>
                      
                      <div class="space-y-4">
                         <div>
                            <label class="text-[9px] font-bold uppercase text-slate-400 mb-1.5 block">Monthly Price ($)</label>
                            <div class="relative">
                               <span class="absolute left-3 top-2 text-slate-400 font-bold text-xs">$</span>
                               <input type="number" v-model="plan.price" class="w-full border border-slate-200 rounded-md pl-6 pr-3 py-2 text-sm font-bold focus:ring-1 focus:ring-slate-900 outline-none" />
                            </div>
                         </div>
                         
                         <div class="h-px bg-slate-100 my-2"></div>
                         
                         <div class="space-y-3">
                            <div v-for="(limit, key) in { Branches: 'max_branches', 'Menu Items': 'max_items', 'Orders/Mo': 'max_orders' }" :key="key">
                               <div class="flex justify-between items-center mb-1">
                                  <label class="text-[9px] font-bold uppercase text-slate-400">{{ key }}</label>
                                  <div class="flex items-center gap-1.5 cursor-pointer" @click="plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders'] = !plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders']">
                                     <div class="w-3 h-3 border border-slate-300 rounded flex items-center justify-center" :class="{'bg-slate-900 border-slate-900': plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders']}">
                                        <Check v-if="plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders']" class="w-2 h-2 text-white" />
                                     </div>
                                     <span class="text-[9px] text-slate-500 font-medium select-none">Unlimited</span>
                                  </div>
                               </div>
                               <div class="relative">
                                  <input type="number" 
                                     v-model="plan[limit]" 
                                     :disabled="plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders']" 
                                     class="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-slate-900 outline-none disabled:bg-slate-50 disabled:text-slate-400 transition-all" 
                                  />
                                  <InfinityIcon v-if="plan[key === 'Branches' ? 'unlimitedBranches' : key === 'Menu Items' ? 'unlimitedItems' : 'unlimitedOrders']" class="absolute right-3 top-2 w-4 h-4 text-slate-400" />
                               </div>
                            </div>
                         </div>
                         
                         <div class="h-px bg-slate-100 my-2"></div>
                         
                         <div class="flex items-center justify-between p-3 bg-slate-50 rounded-lg border border-slate-100 cursor-pointer hover:bg-slate-100 transition-colors" @click="plan.allow_custom_logo = !plan.allow_custom_logo">
                            <span class="text-[10px] font-bold text-slate-600">Allow Custom Branding</span>
                            <div class="w-8 h-4 bg-slate-200 rounded-full relative transition-colors" :class="{'bg-indigo-500': plan.allow_custom_logo}">
                               <div class="absolute top-0.5 left-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm" :class="{'translate-x-4': plan.allow_custom_logo}"></div>
                            </div>
                         </div>
                      </div>
                   </div>
                </div>
             </div>
             
             <div class="p-4 border-t border-slate-200 bg-white flex justify-end gap-3">
                <button @click="showPlansModal = false" class="px-5 py-2.5 border border-slate-200 rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors">Close</button>
                <button @click="savePlanConfigs" :disabled="saving" class="px-6 py-2.5 bg-slate-900 text-white rounded-lg font-bold text-xs hover:bg-slate-800 hover:shadow-lg hover:shadow-slate-200 transition-all flex items-center gap-2">
                   <Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin"/>
                   {{ saving ? 'Saving Changes...' : 'Save Configuration' }}
                </button>
             </div>
          </div>
       </div>
    </div>

    <div v-if="showRequestsModal" class="fixed inset-0 z-50 overflow-hidden">
       <div class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" @click="showRequestsModal = false"></div>
       <div class="absolute inset-y-0 right-0 flex max-w-full pl-10 pointer-events-none">
          <div class="w-screen max-w-md pointer-events-auto transition-transform bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-300">
            <div class="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
               <div>
                  <h2 class="text-lg font-bold text-slate-900">Payment Queue</h2>
                  <p class="text-xs text-slate-500 mt-0.5">Approve manual wire transfers</p>
               </div>
               <button @click="showRequestsModal = false" class="p-2 hover:bg-slate-200 rounded-full transition-colors"><XIcon class="w-5 h-5 text-slate-500"/></button>
            </div>
            
            <div class="flex-1 overflow-y-auto p-5 bg-slate-50/50">
               <div v-if="requests.length === 0" class="flex flex-col items-center justify-center py-20 text-slate-400">
                  <div class="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-3">
                     <CheckCircle2 class="w-8 h-8 opacity-30" />
                  </div>
                  <p class="font-medium text-sm">All caught up!</p>
                  <p class="text-xs mt-1">No pending payments.</p>
               </div>
               
               <div v-else class="space-y-4">
                  <div v-for="req in requests" :key="req.id" class="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm group hover:shadow-md transition-all">
                     <div class="relative h-40 bg-slate-100 border-b border-slate-100 overflow-hidden cursor-zoom-in">
                        <img :src="req.proof_url" class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                        <a :href="req.proof_url" target="_blank" class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-sm">
                           <div class="bg-white/20 border border-white/50 text-white px-3 py-1.5 rounded-full text-xs font-bold flex items-center gap-2 backdrop-blur-md">
                              <ExternalLink class="w-3.5 h-3.5" /> View Proof
                           </div>
                        </a>
                     </div>
                     <div class="p-4">
                        <div class="flex justify-between items-start mb-3">
                           <div>
                              <h3 class="font-bold text-slate-900 text-sm">{{ req.organizations?.name || 'Unknown Org' }}</h3>
                              <div class="text-[10px] text-slate-500 font-mono mt-0.5">{{ new Date(req.created_at).toLocaleString() }}</div>
                           </div>
                           <div class="text-right">
                              <div class="text-lg font-bold text-slate-900 tracking-tight">${{ req.amount }}</div>
                              <div class="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ req.plan_id }} Plan</div>
                           </div>
                        </div>
                        <div class="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-50">
                           <button @click="rejectPayment(req)" :disabled="processingPayment" class="py-2 border border-red-200 bg-white text-red-600 rounded-lg text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-1.5 transition-colors">
                              <XIcon class="w-3.5 h-3.5" /> Reject
                           </button>
                           <button @click="approvePayment(req)" :disabled="processingPayment" class="py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm shadow-emerald-200 flex items-center justify-center gap-1.5 transition-all active:scale-95">
                              <Check class="w-3.5 h-3.5" /> Approve
                           </button>
                        </div>
                     </div>
                  </div>
               </div>
            </div>
          </div>
       </div>
    </div>
  </div>
</template>