<script setup>
import { ref, onMounted, computed, watch } from "vue";
import { useRoute } from "vue-router";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useStaff } from "../../composables/useStaff";
import { toast } from "vue-sonner";
import { usePlanLimits } from "../../composables/usePlanLimits";
import {
  Users,
  Search,
  Store,
  MapPin,
  Phone,
  Wifi,
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Lock,
  ArrowLeft,
  Building2,
  Signal,
  MoreVertical
} from "lucide-vue-next";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
  Menu,
  MenuButton,
  MenuItems,
  MenuItem,
} from "@headlessui/vue";

const route = useRoute();
const userStore = useUserStore();
const { staff, loading: staffLoading, fetchStaff } = useStaff();
const { fetchUsage, checkLimit } = usePlanLimits();

const isFixMode = computed(
  () => route.query.redirect_reason === "downgrade_fix"
);

// Stores data
const stores = ref([]);
const storesLoading = ref(true);
const showStoreModal = ref(false);
const showDeleteStoreModal = ref(false);
const savingStore = ref(false);
const storeForm = ref({
  id: null,
  name: "",
  location: "",
  phone: "",
  wifi_pass: "",
  active: true,
});
const storeToDelete = ref(null);

// Staff data
const searchQuery = ref("");
const showStaffModal = ref(false);
const creatingStaff = ref(false);
const showDeleteStaffModal = ref(false);
const staffToDelete = ref(null);
const isDeletingStaff = ref(false);
const newStaff = ref({
  email: "",
  password: "",
  fullName: "",
  role: "staff",
  store_id: "",
});

// Active tab
const activeTab = ref("stores");

// Filtered staff
const filteredStaff = computed(() => {
  if (!searchQuery.value) return staff.value;
  const q = searchQuery.value.toLowerCase();
  return staff.value.filter(
    (s) =>
      (s.email?.toLowerCase() || "").includes(q) ||
      (s.full_name?.toLowerCase() || "").includes(q)
  );
});

// --- CORE LOGIC & FIXES ---

const initData = async () => {
  if (!userStore.organizationId) return;
  try {
    await fetchUsage();
  } catch (err) {
    console.error("Plan usage check failed:", err);
  }
  await Promise.all([
    fetchStores(),
    fetchStaff(userStore.organizationId)
  ]);
};

const fetchStores = async () => {
  storesLoading.value = true;
  try {
    const { data, error } = await supabase
      .from("stores")
      .select("*")
      .eq("organization_id", userStore.organizationId)
      .order("id");

    if (error) throw error;
    stores.value = data || [];
  } catch (error) {
    console.error("Error fetching stores:", error);
    toast.error("Failed to load stores");
  } finally {
    storesLoading.value = false;
  }
};

watch(
  () => userStore.organizationId,
  (newId) => {
    if (newId) initData();
  },
  { immediate: true }
);

// --- HANDLERS ---

const handleAddStoreClick = () => {
  if (!checkLimit("add_branch")) {
    toast.error("Upgrade plan to add more branches");
    return;
  }
  storeForm.value = {
    id: null,
    name: "",
    location: "",
    phone: "",
    wifi_pass: "",
    active: true,
  };
  showStoreModal.value = true;
};

const openEditStore = (store) => {
  storeForm.value = { ...store };
  showStoreModal.value = true;
};

const confirmDeleteStore = (store) => {
  storeToDelete.value = store;
  showDeleteStoreModal.value = true;
};

const handleConfirmDeleteStore = async () => {
  const { error } = await supabase
    .from("stores")
    .delete()
    .eq("id", storeToDelete.value.id);
  showDeleteStoreModal.value = false;
  if (error) toast.error(error.message);
  else {
    toast.success("Store deleted");
    fetchStores();
    fetchUsage();
  }
};

const handleSaveStore = async () => {
  savingStore.value = true;
  const { id, ...payloadData } = storeForm.value;
  const payload = { ...payloadData, organization_id: userStore.organizationId };
  
  try {
    const query = id
      ? supabase.from("stores").update(payload).eq("id", id)
      : supabase.from("stores").insert([payload]);
    
    const { error } = await query;
    if (error) throw error;

    toast.success(id ? "Store updated" : "Store created");
    showStoreModal.value = false;
    fetchStores();
    fetchUsage();
  } catch (error) {
    toast.error(error.message);
  } finally {
    savingStore.value = false;
  }
};

const updateStaff = async (user) => {
  user.isSaving = true;
  const { error } = await supabase
    .from("user_roles")
    .upsert(
      {
        user_id: user.id,
        role: user.role,
        store_id: user.store_id,
        organization_id: userStore.organizationId,
      },
      { onConflict: "user_id" }
    );
  if (!error)
    await supabase
      .from("profiles")
      .update({ role: user.role })
      .eq("id", user.id);
  user.isSaving = false;
  if (error) toast.error(error.message);
  else toast.success("Staff updated");
};

const createStaffAccount = async () => {
  creatingStaff.value = true;
  const { error } = await supabase.rpc("create_staff_user", {
    new_email: newStaff.value.email,
    new_password: newStaff.value.password,
    new_name: newStaff.value.fullName,
    new_role: newStaff.value.role,
    new_store_id: newStaff.value.store_id,
    org_id: userStore.organizationId,
  });
  creatingStaff.value = false;
  if (error) toast.error(error.message);
  else {
    toast.success("Staff member created");
    showStaffModal.value = false;
    fetchStaff(userStore.organizationId);
  }
};

const confirmDeleteStaff = (user) => {
  staffToDelete.value = user;
  showDeleteStaffModal.value = true;
};

const handleConfirmDeleteStaff = async () => {
  isDeletingStaff.value = true;
  const { error } = await supabase.rpc("delete_staff_user", {
    target_user_id: staffToDelete.value.id,
  });
  isDeletingStaff.value = false;
  showDeleteStaffModal.value = false;
  if (error) toast.error(error.message);
  else {
    toast.success("Staff member deleted");
    fetchStaff(userStore.organizationId);
  }
};

const handleAddStaffClick = () => {
  if (stores.value.length === 0) {
    toast.error("Please create a store first");
    return;
  }
  newStaff.value = {
    email: "",
    password: "",
    fullName: "",
    role: "staff",
    store_id: stores.value[0].id,
  };
  showStaffModal.value = true;
};
</script>

<template>
  <div class="space-y-8 pb-24 max-w-7xl mx-auto">
    <div class="flex flex-col md:flex-row md:items-center justify-between gap-6">
      <div>
        <h1 class="text-3xl font-semibold tracking-tight text-slate-900">
          Branch Access
        </h1>
        <p class="text-slate-500 mt-2 text-sm max-w-2xl">
          Manage store locations and account access
        </p>
      </div>

      <div
        v-if="isFixMode"
        class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm animate-pulse"
      >
        <AlertTriangle class="size-5 text-amber-600" />
        <div class="text-sm">
          <p class="font-semibold text-amber-900">Plan Downgraded</p>
          <p class="text-amber-700 text-xs">Remove extra branches to continue.</p>
        </div>
      </div>
    </div>

    <div class="space-y-6">
      <div class="border-b border-slate-200">
        <nav class="-mb-px flex space-x-8" aria-label="Tabs">
          <button
            @click="activeTab = 'stores'"
            :class="[
              activeTab === 'stores'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              'group inline-flex items-center py-4 px-1 border-b-2 font-semibold text-sm transition-colors'
            ]"
          >
            <Store
              :class="[
                activeTab === 'stores' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-500',
                '-ml-0.5 mr-2 size-5'
              ]"
            />
            <span>Branches</span>
            <span
              v-if="stores.length > 0"
              class="ml-2 bg-slate-100 text-slate-900 py-0.5 px-2.5 rounded-full text-xs font-medium hidden sm:inline-block"
            >
              {{ stores.length }}
            </span>
          </button>

          <button
            @click="activeTab = 'staff'"
            :class="[
              activeTab === 'staff'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              'group inline-flex items-center py-4 px-1 border-b-2 font-semibold text-sm transition-colors'
            ]"
          >
            <Users
              :class="[
                activeTab === 'staff' ? 'text-slate-900' : 'text-slate-400 group-hover:text-slate-500',
                '-ml-0.5 mr-2 size-5'
              ]"
            />
            <span>Account Access</span>
            <span
              v-if="staff.length > 0"
              class="ml-2 bg-slate-100 text-slate-900 py-0.5 px-2.5 rounded-full text-xs font-medium hidden sm:inline-block"
            >
              {{ staff.length }}
            </span>
          </button>
        </nav>
      </div>

      <div v-show="activeTab === 'stores'" class="space-y-6">
        <div class="flex justify-end">
          <button
            @click="handleAddStoreClick"
            :class="[
              checkLimit('add_branch')
                ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200',
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95'
            ]"
          >
            <component :is="checkLimit('add_branch') ? Plus : Lock" class="size-4" />
            <span>{{ checkLimit("add_branch") ? "New Branch" : "Limit Reached" }}</span>
          </button>
        </div>

        <div v-if="storesLoading" class="flex flex-col items-center justify-center py-20">
          <Loader2 class="size-10 animate-spin text-slate-300 mb-4" />
          <p class="text-sm text-slate-500 animate-pulse">Loading branches...</p>
        </div>

        <div
          v-else-if="stores.length === 0"
          class="flex flex-col items-center justify-center py-24 bg-slate-50/50 border border-dashed border-slate-300 rounded-2xl"
        >
          <div class="bg-white p-4 rounded-full shadow-sm mb-4">
            <Store class="size-8 text-slate-400" />
          </div>
          <h3 class="text-slate-900 font-semibold text-lg">No branches found</h3>
          <p class="text-slate-500 text-sm mt-1 mb-6 max-w-xs text-center">
            Get started by adding your first physical store location.
          </p>
          <button
             @click="handleAddStoreClick"
             class="text-slate-900 font-semibold text-sm hover:underline"
          >
            Create first branch
          </button>
        </div>

        <div v-else class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          <div
            v-for="store in stores"
            :key="store.id"
            class="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200"
          >
            <div class="flex justify-between items-start mb-6">
              <div class="flex gap-4">
                <div class="size-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg shadow-slate-900/10 group-hover:scale-105 transition-transform duration-300">
                  <Store class="size-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-slate-900 leading-tight">
                    {{ store.name }}
                  </h3>
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="relative flex h-2 w-2">
                      <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span class="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                    </span>
                    <span class="text-xs font-medium text-slate-500">Active</span>
                  </div>
                </div>
              </div>

              <Menu as="div" class="relative">
                <MenuButton class="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors">
                  <MoreVertical class="size-5" />
                </MenuButton>
                <transition
                  enter-active-class="transition ease-out duration-100"
                  enter-from-class="transform opacity-0 scale-95"
                  enter-to-class="transform opacity-100 scale-100"
                  leave-active-class="transition ease-in duration-75"
                  leave-from-class="transform opacity-100 scale-100"
                  leave-to-class="transform opacity-0 scale-95"
                >
                  <MenuItems class="absolute right-0 z-10 mt-1 w-32 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 focus:outline-none py-1">
                    <MenuItem v-slot="{ active }">
                      <button
                        @click="openEditStore(store)"
                        :class="[active ? 'bg-slate-50' : '', 'flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700']"
                      >
                        <Edit2 class="mr-2 size-3.5" /> Edit
                      </button>
                    </MenuItem>
                    <MenuItem v-slot="{ active }">
                      <button
                        @click="confirmDeleteStore(store)"
                        :class="[active ? 'bg-red-50 text-red-700' : 'text-red-600', 'flex w-full items-center px-4 py-2 text-xs font-semibold']"
                      >
                        <Trash2 class="mr-2 size-3.5" /> Delete
                      </button>
                    </MenuItem>
                  </MenuItems>
                </transition>
              </Menu>
            </div>

            <div class="space-y-3 pt-4 border-t border-slate-100">
              <div class="flex items-start gap-3">
                <MapPin class="size-4 text-slate-400 shrink-0 mt-0.5" />
                <span class="text-sm text-slate-600 leading-snug">{{ store.location || "No address set" }}</span>
              </div>
              <div class="flex items-center gap-3">
                <Phone class="size-4 text-slate-400 shrink-0" />
                <span class="text-sm text-slate-600">{{ store.phone || "No phone" }}</span>
              </div>
              <div class="flex items-center gap-3">
                <Signal class="size-4 text-slate-400 shrink-0" />
                <div class="flex items-center gap-2">
                  <span class="text-xs font-semibold text-slate-500 uppercase tracking-wide">WiFi:</span>
                  <span class="text-sm text-slate-700 font-medium bg-slate-100 px-2 py-0.5 rounded">{{ store.wifi_pass || "None" }}</span>
                </div>
              </div>
            </div>
            
            </div>
        </div>
      </div>

      <div v-show="activeTab === 'staff'" class="space-y-6">
        <div class="flex flex-col sm:flex-row gap-4 justify-between">
          <div class="relative flex-1 max-w-sm">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search by name or email..."
              class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
            />
          </div>
          <button
            @click="handleAddStaffClick"
            class="bg-slate-900 hover:bg-slate-800 text-white shadow-lg shadow-slate-900/10 px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all active:scale-95"
          >
            <Plus class="size-4" />
            <span>Add Member</span>
          </button>
        </div>

        <div v-if="staffLoading" class="flex flex-col items-center justify-center py-20">
          <Loader2 class="size-8 animate-spin text-slate-300" />
        </div>

        <div
          v-else-if="filteredStaff.length === 0"
          class="flex flex-col items-center justify-center py-20 bg-slate-50/50 border border-dashed border-slate-300 rounded-2xl"
        >
          <Users class="size-10 text-slate-400 mb-3" />
          <h3 class="text-slate-900 font-semibold text-lg">No staff found</h3>
          <p class="text-slate-500 text-sm">Try adjusting your search or add a new member.</p>
        </div>

        <div v-else class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
          <div class="overflow-x-auto">
            <table class="w-full">
              <thead class="bg-slate-50/80 border-b border-slate-200">
                <tr>
                  <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">User Profile</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Access Level</th>
                  <th class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500 tracking-wider">Branch Assignment</th>
                  <th class="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500 tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-100">
                <tr v-for="user in filteredStaff" :key="user.id" class="group hover:bg-slate-50/50 transition-colors">
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="flex items-center gap-4">
                      <div class="size-10 rounded-full bg-linear-to-br from-slate-800 to-slate-900 flex items-center justify-center text-white font-semibold text-sm shadow-md shadow-slate-900/10">
                        {{ user.full_name?.charAt(0).toUpperCase() || "U" }}
                      </div>
                      <div>
                        <p class="text-sm font-semibold text-slate-900">{{ user.full_name }}</p>
                        <p class="text-xs text-slate-500 font-medium">{{ user.email }}</p>
                      </div>
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="relative w-36">
                      <select
                        v-model="user.role"
                        class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-slate-900/10 outline-none cursor-pointer transition-shadow hover:border-slate-300"
                      >
                        <option value="staff">Staff Member</option>
                        <option value="admin">Administrator</option>
                      </select>
                      <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap">
                    <div class="relative w-48">
                      <select
                        v-model="user.store_id"
                        class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-slate-900/10 outline-none cursor-pointer transition-shadow hover:border-slate-300"
                      >
                        <option v-for="store in stores" :key="store.id" :value="store.id">
                          {{ store.name }}
                        </option>
                      </select>
                      <ChevronDown class="absolute right-2.5 top-1/2 -translate-y-1/2 size-3.5 text-slate-400 pointer-events-none" />
                    </div>
                  </td>
                  <td class="px-6 py-4 whitespace-nowrap text-right">
                    <div class="flex items-center justify-end gap-2">
                      <button
                        @click="updateStaff(user)"
                        :disabled="user.isSaving"
                        class="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50 hover:border-slate-300 transition-all disabled:opacity-50"
                      >
                        <Loader2 v-if="user.isSaving" class="size-3 animate-spin" />
                        {{ user.isSaving ? "Saving..." : "Save Changes" }}
                      </button>
                      <button
                        @click="confirmDeleteStaff(user)"
                        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Remove User"
                      >
                        <Trash2 class="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>

    <TransitionRoot :show="showStoreModal" as="template">
      <Dialog @close="showStoreModal = false" class="relative z-50">
        <TransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center">
                  <DialogTitle class="text-lg font-semibold text-slate-900">
                    {{ storeForm.id ? "Edit Branch" : "Add New Branch" }}
                  </DialogTitle>
                  <button @click="showStoreModal = false" class="text-slate-400 hover:text-slate-600">
                    <span class="sr-only">Close</span>
                    <svg class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd" /></svg>
                  </button>
                </div>
                
                <div class="p-6 space-y-5">
                  <div class="grid grid-cols-1 gap-5">
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Branch Name
                      </label>
                      <input
                        v-model="storeForm.name"
                        type="text"
                        placeholder="e.g. Riverside Cafe"
                        class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Full Address
                      </label>
                      <input
                        v-model="storeForm.location"
                        type="text"
                        placeholder="e.g. #123 Sisowath Quay, Phnom Penh"
                        class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          Phone
                        </label>
                        <input
                          v-model="storeForm.phone"
                          type="text"
                          placeholder="012 345 678"
                          class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                        />
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          WiFi Password
                        </label>
                        <input
                          v-model="storeForm.wifi_pass"
                          type="text"
                          placeholder="Optional"
                          class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button
                    @click="showStoreModal = false"
                    class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    @click="handleSaveStore"
                    :disabled="savingStore"
                    class="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/10"
                  >
                    <Loader2 v-if="savingStore" class="size-4 animate-spin" />
                    {{ savingStore ? "Saving Changes..." : "Save Branch" }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot :show="showStaffModal" as="template">
      <Dialog @close="showStaffModal = false" class="relative z-50">
        <TransitionChild
          enter="duration-300 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-200 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="duration-300 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-200 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden ring-1 ring-slate-900/5">
                <div class="bg-slate-50 px-6 py-4 border-b border-slate-100">
                  <DialogTitle class="text-lg font-semibold text-slate-900">Add Account</DialogTitle>
                </div>
                
                <div class="p-6 space-y-5">
                   <div>
                      <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Full Name
                      </label>
                      <input
                        v-model="newStaff.fullName"
                        type="text"
                        placeholder="John Doe"
                        class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Email Address
                      </label>
                      <input
                        v-model="newStaff.email"
                        type="email"
                        placeholder="john@example.com"
                        class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                    <div>
                      <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                        Temporary Password
                      </label>
                      <input
                        v-model="newStaff.password"
                        type="password"
                        placeholder="••••••••"
                        class="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                      />
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                      <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          Role
                        </label>
                        <div class="relative">
                          <select
                            v-model="newStaff.role"
                            class="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                          >
                            <option value="staff">Staff</option>
                            <option value="admin">Admin</option>
                          </select>
                          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                      <div>
                        <label class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5">
                          Assign Branch
                        </label>
                        <div class="relative">
                          <select
                            v-model="newStaff.store_id"
                            class="w-full appearance-none px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all"
                          >
                            <option v-for="store in stores" :key="store.id" :value="store.id">
                              {{ store.name }}
                            </option>
                          </select>
                          <ChevronDown class="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
                        </div>
                      </div>
                    </div>
                </div>

                <div class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3">
                  <button
                    @click="showStaffModal = false"
                    class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    @click="createStaffAccount"
                    :disabled="creatingStaff"
                    class="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2 transition-all shadow-lg shadow-slate-900/10"
                  >
                    <Loader2 v-if="creatingStaff" class="size-4 animate-spin" />
                    {{ creatingStaff ? "Creating Account..." : "Create Member" }}
                  </button>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot :show="showDeleteStoreModal" as="template">
      <Dialog @close="showDeleteStoreModal = false" class="relative z-50">
        <TransitionChild
          enter="duration-200 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-150 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="duration-200 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-150 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
                <div class="flex flex-col items-center text-center">
                  <div class="size-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <Trash2 class="size-6 text-red-600" />
                  </div>
                  <DialogTitle class="text-lg font-semibold text-slate-900 mb-2">Delete Branch?</DialogTitle>
                  <p class="text-sm text-slate-500 mb-6">
                    This will permanently delete <span class="font-semibold text-slate-900">{{ storeToDelete?.name }}</span>. This action cannot be undone.
                  </p>
                  <div class="flex gap-3 w-full">
                    <button @click="showDeleteStoreModal = false" class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                    <button @click="handleConfirmDeleteStore" class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-600/20">Delete</button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

    <TransitionRoot :show="showDeleteStaffModal" as="template">
      <Dialog @close="showDeleteStaffModal = false" class="relative z-50">
        <TransitionChild
          enter="duration-200 ease-out"
          enter-from="opacity-0"
          enter-to="opacity-100"
          leave="duration-150 ease-in"
          leave-from="opacity-100"
          leave-to="opacity-0"
        >
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        </TransitionChild>
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <TransitionChild
              enter="duration-200 ease-out"
              enter-from="opacity-0 scale-95"
              enter-to="opacity-100 scale-100"
              leave="duration-150 ease-in"
              leave-from="opacity-100 scale-100"
              leave-to="opacity-0 scale-95"
            >
              <DialogPanel class="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl">
                <div class="flex flex-col items-center text-center">
                  <div class="size-12 bg-red-50 rounded-full flex items-center justify-center mb-4">
                    <Trash2 class="size-6 text-red-600" />
                  </div>
                  <DialogTitle class="text-lg font-semibold text-slate-900 mb-2">Remove Member?</DialogTitle>
                  <p class="text-sm text-slate-500 mb-6">
                    Permanently remove <span class="font-semibold text-slate-900">{{ staffToDelete?.full_name }}</span>? They will lose access immediately.
                  </p>
                  <div class="flex gap-3 w-full">
                    <button @click="showDeleteStaffModal = false" class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50">Cancel</button>
                    <button @click="handleConfirmDeleteStaff" :disabled="isDeletingStaff" class="flex-1 px-4 py-2.5 bg-red-600 text-white rounded-xl text-sm font-semibold hover:bg-red-700 shadow-lg shadow-red-600/20 flex items-center justify-center gap-2">
                      <Loader2 v-if="isDeletingStaff" class="size-4 animate-spin" />
                      {{ isDeletingStaff ? "Removing..." : "Remove" }}
                    </button>
                  </div>
                </div>
              </DialogPanel>
            </TransitionChild>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>

  </div>
</template>