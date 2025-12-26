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
  Users, Pencil, Calendar, AlertCircle, Ban, LogIn, CreditCard, ExternalLink, Check, X as XIcon 
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

// --- PAYMENT REQUEST LOGIC (UPDATED WITH STACKING) ---
const fetchRequests = async () => {
  const { data } = await supabase.from('payment_requests').select('*, organizations(name)').eq('status', 'pending').order('created_at', { ascending: false });
  requests.value = data || [];
};

const openRequestsManager = () => {
  fetchRequests();
  showRequestsModal.value = true;
};

// Updated Approve Logic
const approvePayment = async (req) => {
  if (!confirm(`Approve payment of $${req.amount} for ${req.organizations.name}?`)) return;
  processingPayment.value = true;

  // 1. Get current status
  const { data: currentOrg } = await supabase
    .from('organizations')
    .select('plan, valid_until')
    .eq('id', req.organization_id)
    .single();

  const now = new Date();
  const validUntil = currentOrg.valid_until ? new Date(currentOrg.valid_until) : new Date(0);
  const hasTimeLeft = validUntil > now;
  const isPlanChange = currentOrg.plan !== req.plan_id;

  let updateData = {};
  let successMessage = "";

  // SCENARIO A: Plan Change with Time Left (The "5 Days Left" Case)
  if (hasTimeLeft && isPlanChange) {
     // Don't change plan yet. Queue it.
     // Don't extend date yet. Let it expire so the swap triggers.
     updateData = { 
        next_plan: req.plan_id 
     };
     successMessage = `Change queued! They will stay on ${currentOrg.plan} until expired, then switch to ${req.plan_id}.`;
  } 
  
  // SCENARIO B: Renewal (Same Plan) OR Expired (Immediate Switch)
  else {
     // Calculate new date (Add 1 month to existing future date OR now)
     let newDate = hasTimeLeft ? validUntil : now;
     newDate.setMonth(newDate.getMonth() + 1);

     updateData = { 
        plan: req.plan_id,
        valid_until: newDate.toISOString(),
        next_plan: null // Clear any old queue
     };
     successMessage = "Plan updated & subscription extended!";
  }

  // 2. Perform Update
  const { error: orgErr } = await supabase.from('organizations')
    .update(updateData)
    .eq('id', req.organization_id);

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
    <nav class="shrink-0 bg-white border-b border-slate-200 h-14 flex items-center justify-between px-4 z-20">
      <div class="flex items-center gap-3">
        <div class="w-8 h-8 bg-black rounded-lg flex items-center justify-center text-white"><LayoutGrid class="w-4 h-4" /></div>
        <span class="font-bold text-sm">Platform Admin</span>
      </div>
      <button @click="handleLogout" class="text-slate-500 hover:text-red-600"><LogOut class="w-4 h-4" /></button>
    </nav>

    <div class="shrink-0 px-4 py-3 bg-white/50 border-b border-slate-200 flex items-center justify-between">
      <div class="relative w-64">
        <Search class="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
        <input v-model="searchQuery" placeholder="Search clients..." class="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-lg text-xs font-medium focus:ring-1 focus:ring-black outline-none" />
      </div>
      <div class="flex gap-2">
         <router-link to="/global-menu" class="bg-white border hover:bg-slate-50 border-slate-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors"><Coffee class="w-3.5 h-3.5"/> Menu</router-link>
         
         <button @click="openRequestsManager" class="bg-white border hover:bg-slate-50 border-slate-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors relative"><CreditCard class="w-3.5 h-3.5"/> Payments <span v-if="requests.length > 0" class="absolute -top-1 -right-1 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse"></span></button>
         
         <button @click="openPlanManager" class="bg-white border hover:bg-slate-50 border-slate-200 px-3 py-1.5 rounded text-xs font-bold flex items-center gap-2 transition-colors"><Settings class="w-3.5 h-3.5"/> Manage Plans</button>
         <button @click="openAddModal" class="bg-black hover:bg-slate-800 text-white px-4 py-1.5 rounded-md font-bold text-xs flex items-center gap-2"><Plus class="w-3.5 h-3.5" /> Add Client</button>
      </div>
    </div>

    <main class="flex-1 overflow-hidden p-4">
      <div class="h-full bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm">
        <div class="shrink-0 border-b border-slate-100 bg-slate-50/50 px-4 py-2 flex items-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
          <div class="w-[30%]">Client</div>
          <div class="w-[15%]">Status</div>
          <div class="w-[25%]">Current Plan</div>
          <div class="w-[15%]">Stats</div>
          <div class="w-[15%] text-right">Actions</div>
        </div>
        <div class="flex-1 overflow-y-auto">
          <div v-for="org in filteredOrgs" :key="org.id" class="px-4 py-3 flex items-center hover:bg-slate-50 border-b border-slate-50 last:border-0 text-sm" :class="isExpired(org.valid_until) ? 'bg-red-50/50' : ''">
            <div class="w-[30%]"><div class="font-bold flex items-center gap-2">{{ org.name }}<span v-if="isExpired(org.valid_until)" class="bg-red-100 text-red-600 text-[9px] px-1.5 rounded font-bold uppercase tracking-wide">Expired</span></div><div class="text-[10px] text-slate-400 font-mono flex items-center gap-2"><span>ID: {{ org.id.split('-')[0] }}...</span></div></div>
            <div class="w-[15%]"><div v-if="isExpired(org.valid_until)" class="flex items-center gap-1.5 text-red-600"><AlertCircle class="w-3 h-3" /><span class="text-[10px] font-bold">Expired</span></div><div v-else class="flex flex-col"><span class="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[10px] font-bold border border-emerald-100 w-fit">Active</span><span class="text-[9px] text-slate-400 mt-1">Exp: {{ formatDate(org.valid_until) }}</span></div></div>
            <div class="w-[25%] relative"><button @click.stop="toggleDropdown(org.id)" class="plan-trigger flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase tracking-wide w-36 transition-all active:scale-95" :class="[uiPlans.find(p => p.id === org.plan)?.color || 'bg-white border-slate-200', activeDropdownId === org.id ? 'ring-2 ring-slate-900 ring-offset-1' : '']"><div class="flex items-center gap-2"><component v-if="uiPlans.find(p => p.id === org.plan)" :is="uiPlans.find(p => p.id === org.plan).icon" class="w-3.5 h-3.5" />{{ org.planName }}</div><ChevronDown class="w-3 h-3 opacity-50" /></button><div v-if="activeDropdownId === org.id" class="absolute top-full left-0 mt-2 w-40 bg-white border border-slate-200 shadow-xl rounded-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1"><div class="text-[9px] font-bold text-slate-400 uppercase tracking-wider px-3 py-2">Select Tier</div><button v-for="plan in uiPlans" :key="plan.id" @click.stop="updatePlan(org.id, plan.id)" class="w-full text-left px-3 py-2.5 text-xs hover:bg-slate-50 rounded-lg flex items-center gap-2 mb-0.5 transition-colors" :class="org.plan === plan.id ? 'bg-slate-50 font-bold' : 'font-medium text-slate-600'"><component :is="plan.icon" class="w-3.5 h-3.5" :class="org.plan === plan.id ? 'text-black' : 'text-slate-400'" />{{ plan.id.charAt(0).toUpperCase() + plan.id.slice(1) }}<CheckCircle2 v-if="org.plan === plan.id" class="w-3.5 h-3.5 ml-auto text-emerald-500" /></button></div></div>
            <div class="w-[15%] text-xs text-slate-500 flex gap-3"><span title="Stores"><Building2 class="w-3 h-3 inline mr-1"/>{{ org.stores }}</span><span title="Staff"><Users class="w-3 h-3 inline mr-1"/>{{ org.profiles }}</span></div>
            <div class="w-[15%] flex justify-end items-center gap-1"><button @click.stop="impersonateClient(org)" class="text-slate-400 hover:text-emerald-600 p-2 transition-colors" title="Log In as Store"><LogIn class="w-3.5 h-3.5" /></button><button @click.stop="openEditModal(org)" class="text-slate-400 hover:text-blue-600 p-2 transition-colors" title="Edit Details"><Pencil class="w-3.5 h-3.5" /></button><button @click.stop="deleteOrg(org.id)" class="text-slate-400 hover:text-red-600 p-2" title="Delete Client"><Trash2 class="w-4 h-4" /></button></div>
          </div>
        </div>
      </div>
    </main>

    <div v-if="showModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
      <div class="bg-white w-full max-w-sm rounded-xl p-6 shadow-2xl">
         <h2 class="text-lg font-bold mb-4">{{ editMode ? 'Edit Client' : 'New Client' }}</h2>
         <div class="space-y-3">
            <div><label class="text-[10px] font-bold uppercase text-slate-400">Business Name</label><input v-model="newOrg.name" placeholder="Business Name" class="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all" /></div>
            <div v-if="editMode"><label class="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Account Status</label><div class="grid grid-cols-2 gap-2"><button @click="newOrg.status = 'active'" class="py-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-2" :class="newOrg.status === 'active' ? 'bg-emerald-50 border-emerald-200 text-emerald-700 ring-1 ring-emerald-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'"><CheckCircle2 class="w-3.5 h-3.5" /> Active</button><button @click="newOrg.status = 'suspended'" class="py-2 rounded border text-xs font-bold transition-all flex items-center justify-center gap-2" :class="newOrg.status === 'suspended' ? 'bg-red-50 border-red-200 text-red-700 ring-1 ring-red-500' : 'border-slate-200 text-slate-500 hover:bg-slate-50'"><Ban class="w-3.5 h-3.5" /> Suspended</button></div></div>
            <div :class="{ 'opacity-50 pointer-events-none': newOrg.status === 'suspended' }"><label class="text-[10px] font-bold uppercase text-slate-400">Valid Until</label><div class="relative"><input type="date" v-model="newOrg.validUntil" class="w-full border p-2 pl-9 rounded text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all uppercase" /><Calendar class="absolute left-3 top-2.5 w-4 h-4 text-slate-400 pointer-events-none" /></div><p v-if="newOrg.status === 'suspended'" class="text-[9px] text-red-500 mt-1 font-medium">* Setting to suspended will expire access immediately.</p></div>
            <div><label class="text-[10px] font-bold uppercase text-slate-400 mb-1 block">Plan Tier</label><div class="grid grid-cols-3 gap-2"><button v-for="plan in uiPlans" :key="plan.id" @click="newOrg.plan = plan.id" class="flex flex-col items-center justify-center py-2 border rounded hover:bg-slate-50 transition-all" :class="newOrg.plan === plan.id ? 'border-black bg-slate-50 ring-1 ring-black' : 'border-slate-200'"><component :is="plan.icon" class="w-4 h-4 mb-1" /><span class="text-[10px] font-bold capitalize">{{ plan.id }}</span></button></div></div>
            <div v-if="!editMode"><label class="text-[10px] font-bold uppercase text-slate-400">Owner Email</label><input v-model="newOrg.ownerEmail" placeholder="Owner Email" class="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all" /></div>
            <div v-if="!editMode"><label class="text-[10px] font-bold uppercase text-slate-400">Password</label><input v-model="newOrg.ownerPassword" placeholder="Password" class="w-full border p-2 rounded text-sm outline-none focus:ring-2 focus:ring-black/5 transition-all" /></div>
            <div class="flex gap-2 pt-2"><button @click="showModal = false" class="flex-1 py-2.5 border rounded-lg font-bold text-xs hover:bg-slate-50">Cancel</button><button @click="editMode ? updateClient() : createClient()" :disabled="saving" class="flex-1 py-2.5 bg-black text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center justify-center gap-2"><Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin" />{{ saving ? 'Saving...' : (editMode ? 'Update Client' : 'Create Client') }}</button></div>
         </div>
      </div>
    </div>
    
    <div v-if="showPlansModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
       <div class="bg-white w-full max-w-4xl rounded-2xl p-0 shadow-2xl flex flex-col max-h-[90vh]">
          <div class="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50 rounded-t-2xl"><div><h2 class="text-xl font-bold text-slate-900">Plan Configurations</h2><p class="text-xs text-slate-500 mt-1">Manage limits, pricing, and features for all tiers.</p></div><button @click="showPlansModal = false" class="p-2 text-slate-400 hover:bg-slate-100 rounded-full transition-colors"><X class="w-5 h-5"/></button></div>
          <div class="p-6 overflow-y-auto bg-slate-50/30">
             <div v-if="loadingPlans" class="flex justify-center py-20"><Loader2 class="w-8 h-8 animate-spin text-slate-300"/></div>
             <div v-else class="grid grid-cols-1 md:grid-cols-3 gap-6"><div v-for="plan in planConfigs" :key="plan.id" class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-all"><div class="flex items-center gap-3 mb-6"><div class="w-10 h-10 rounded-lg flex items-center justify-center border" :class="plan.color"><component :is="plan.icon" class="w-5 h-5"/></div><div><input v-model="plan.name" class="font-bold text-sm bg-transparent border-b border-transparent hover:border-slate-300 focus:border-black focus:outline-none w-full" placeholder="Plan Name" /><div class="text-[10px] text-slate-400 font-mono uppercase">{{ plan.id }}</div></div></div><div class="space-y-4"><div><label class="text-[9px] font-bold uppercase text-slate-400 mb-1 block">Monthly Price ($)</label><input type="number" v-model="plan.price" class="w-full border border-slate-200 rounded-md px-3 py-2 text-sm font-bold focus:ring-1 focus:ring-black outline-none" /></div><div class="h-px bg-slate-100 my-2"></div><div class="space-y-3"><div><div class="flex justify-between items-center mb-1"><label class="text-[9px] font-bold uppercase text-slate-400">Max Branches</label><div class="flex items-center gap-1"><input type="checkbox" v-model="plan.unlimitedBranches" class="w-3 h-3 rounded border-slate-300 text-black focus:ring-0"/><span class="text-[9px] text-slate-500">Unlimited</span></div></div><div class="relative"><input type="number" v-model="plan.max_branches" :disabled="plan.unlimitedBranches" class="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-black outline-none disabled:bg-slate-50 disabled:text-slate-400" /><InfinityIcon v-if="plan.unlimitedBranches" class="absolute right-3 top-2.5 w-4 h-4 text-slate-400" /></div></div><div><div class="flex justify-between items-center mb-1"><label class="text-[9px] font-bold uppercase text-slate-400">Max Menu Items</label><div class="flex items-center gap-1"><input type="checkbox" v-model="plan.unlimitedItems" class="w-3 h-3 rounded border-slate-300 text-black focus:ring-0"/><span class="text-[9px] text-slate-500">Unlimited</span></div></div><div class="relative"><input type="number" v-model="plan.max_items" :disabled="plan.unlimitedItems" class="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-black outline-none disabled:bg-slate-50 disabled:text-slate-400" /><InfinityIcon v-if="plan.unlimitedItems" class="absolute right-3 top-2.5 w-4 h-4 text-slate-400" /></div></div><div><div class="flex justify-between items-center mb-1"><label class="text-[9px] font-bold uppercase text-slate-400">Monthly Orders</label><div class="flex items-center gap-1"><input type="checkbox" v-model="plan.unlimitedOrders" class="w-3 h-3 rounded border-slate-300 text-black focus:ring-0"/><span class="text-[9px] text-slate-500">Unlimited</span></div></div><div class="relative"><input type="number" v-model="plan.max_orders" :disabled="plan.unlimitedOrders" class="w-full border border-slate-200 rounded-md px-3 py-2 text-xs font-medium focus:ring-1 focus:ring-black outline-none disabled:bg-slate-50 disabled:text-slate-400" /><InfinityIcon v-if="plan.unlimitedOrders" class="absolute right-3 top-2.5 w-4 h-4 text-slate-400" /></div></div></div><div class="h-px bg-slate-100 my-2"></div><div class="flex items-center justify-between p-2 bg-slate-50 rounded-lg border border-slate-100"><span class="text-[10px] font-bold text-slate-600">Custom Branding</span><input type="checkbox" v-model="plan.allow_custom_logo" class="w-4 h-4 rounded border-slate-300 text-black focus:ring-0" /></div></div></div></div>
          </div>
          <div class="p-6 border-t border-slate-100 bg-white rounded-b-2xl flex justify-end gap-3"><button @click="showPlansModal = false" class="px-5 py-2.5 border rounded-lg font-bold text-xs hover:bg-slate-50 transition-colors">Close</button><button @click="savePlanConfigs" :disabled="saving" class="px-6 py-2.5 bg-black text-white rounded-lg font-bold text-xs hover:shadow-lg transition-all flex items-center gap-2"><Loader2 v-if="saving" class="w-3.5 h-3.5 animate-spin"/>{{ saving ? 'Saving Changes...' : 'Save Configuration' }}</button></div>
       </div>
    </div>

    <div v-if="showRequestsModal" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm">
       <div class="bg-white w-full max-w-2xl rounded-2xl p-0 shadow-2xl flex flex-col max-h-[80vh]">
          <div class="p-5 border-b border-slate-100 flex justify-between items-center"><h2 class="text-lg font-bold text-slate-900">Pending Payments</h2><button @click="showRequestsModal = false" class="p-2 hover:bg-slate-100 rounded-full"><XIcon class="w-5 h-5 text-slate-400"/></button></div>
          <div class="p-5 overflow-y-auto bg-slate-50/50 flex-1">
             <div v-if="requests.length === 0" class="text-center py-10 text-slate-400"><CheckCircle2 class="w-10 h-10 mx-auto mb-2 opacity-20" /><p>No pending payments</p></div>
             <div v-else class="space-y-4">
                <div v-for="req in requests" :key="req.id" class="bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row gap-4">
                   <a :href="req.proof_url" target="_blank" class="w-full sm:w-32 h-32 bg-slate-100 rounded-lg border border-slate-100 overflow-hidden shrink-0 group relative cursor-zoom-in"><img :src="req.proof_url" class="w-full h-full object-cover" /><div class="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ExternalLink class="w-5 h-5 text-white" /></div></a>
                   <div class="flex-1">
                      <div class="flex justify-between items-start mb-2"><div><h3 class="font-bold text-slate-900">{{ req.organizations?.name || 'Unknown Org' }}</h3><div class="text-[10px] text-slate-500 font-mono">{{ new Date(req.created_at).toLocaleString() }}</div></div><div class="text-right"><div class="text-lg font-bold text-slate-900">${{ req.amount }}</div><div class="text-[10px] uppercase font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">{{ req.plan_id }} Plan</div></div></div>
                      <div class="flex gap-2 mt-4 pt-4 border-t border-slate-50"><button @click="rejectPayment(req)" :disabled="processingPayment" class="flex-1 py-2 border border-red-200 bg-red-50 text-red-700 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-1"><XIcon class="w-3.5 h-3.5" /> Reject</button><button @click="approvePayment(req)" :disabled="processingPayment" class="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 shadow-sm flex items-center justify-center gap-1"><Check class="w-3.5 h-3.5" /> Confirm & Activate</button></div>
                   </div>
                </div>
             </div>
          </div>
       </div>
    </div>
  </div>
</template>