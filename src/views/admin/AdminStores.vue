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
  Plus,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  AlertTriangle,
  Lock,
  MoreVertical,
  ScrollText,
  Info,
  Mail, // Added for semantics, if not available use Users
  User,
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

// Global Settings State
const globalSettings = ref({
  receipt_address: "",
  receipt_phone: "",
});

const storeForm = ref({
  id: null,
  name: "",
  location: "",
  phone: "",
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

const activeTab = ref("stores");

const filteredStaff = computed(() => {
  if (!searchQuery.value) return staff.value;
  const q = searchQuery.value.toLowerCase();
  return staff.value.filter(
    (s) =>
      (s.email?.toLowerCase() || "").includes(q) ||
      (s.full_name?.toLowerCase() || "").includes(q)
  );
});

// --- CORE LOGIC ---

const initData = async () => {
  if (!userStore.organizationId) return;
  try {
    await fetchUsage();
  } catch (err) {
    console.error("Plan usage check failed:", err);
  }
  await Promise.all([
    fetchStores(),
    fetchStaff(userStore.organizationId),
    fetchGlobalSettings(),
  ]);
};

const fetchGlobalSettings = async () => {
  const { data, error } = await supabase
    .from("settings")
    .select("receipt_address, receipt_phone")
    .eq("organization_id", userStore.organizationId)
    .single();

  if (data) {
    globalSettings.value = data;
  }
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

// Staff Handlers
const updateStaff = async (user) => {
  user.isSaving = true;
  const { error } = await supabase.from("user_roles").upsert(
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

const inputIconClass =
  "w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400";
</script>

<template>
  <div class="space-y-8 pb-24 max-w-7xl mx-auto">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-6"
    >
      <div>
        <h1 class="text-2xl font-semibold tracking-tight text-slate-900">
          Branch Access
        </h1>
        <p class="text-slate-500 mt-2 text-sm max-w-2xl">
          Manage store locations and account access.
        </p>
      </div>

      <div
        v-if="isFixMode"
        class="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center gap-3 shadow-sm animate-pulse"
      >
        <AlertTriangle class="size-5 text-amber-600" />
        <div class="text-sm">
          <p class="font-semibold text-amber-900">Plan Downgraded</p>
          <p class="text-amber-700 text-xs">
            Remove extra branches to continue.
          </p>
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
              'group inline-flex items-center py-4 px-1 border-b-2 font-semibold text-sm transition-colors',
            ]"
          >
            <Store
              :class="[
                activeTab === 'stores' ? 'text-slate-900' : 'text-slate-400',
                '-ml-0.5 mr-2 size-5',
              ]"
            />
            <span>Branches</span>
          </button>

          <button
            @click="activeTab = 'staff'"
            :class="[
              activeTab === 'staff'
                ? 'border-slate-900 text-slate-900'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300',
              'group inline-flex items-center py-4 px-1 border-b-2 font-semibold text-sm transition-colors',
            ]"
          >
            <Users
              :class="[
                activeTab === 'staff' ? 'text-slate-900' : 'text-slate-400',
                '-ml-0.5 mr-2 size-5',
              ]"
            />
            <span>Account Access</span>
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
              'inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95',
            ]"
          >
            <component
              :is="checkLimit('add_branch') ? Plus : Lock"
              class="size-4"
            />
            <span>{{
              checkLimit("add_branch") ? "New Branch" : "Limit Reached"
            }}</span>
          </button>
        </div>

        <div
          v-if="storesLoading"
          class="flex flex-col items-center justify-center py-20"
        >
          <Loader2 class="size-10 animate-spin text-slate-300 mb-4" />
        </div>

        <div
          v-else-if="stores.length === 0"
          class="flex flex-col items-center justify-center py-24 bg-slate-50/50 border border-dashed border-slate-300 rounded-2xl"
        >
          <Store class="size-8 text-slate-400 mb-4" />
          <h3 class="text-slate-900 font-semibold text-lg">
            No branches found
          </h3>
          <button
            @click="handleAddStoreClick"
            class="text-slate-900 font-semibold text-sm hover:underline mt-6"
          >
            Create first branch
          </button>
        </div>

        <div
          v-else
          class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
        >
          <div
            v-for="store in stores"
            :key="store.id"
            class="group relative bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-all"
          >
            <div class="flex justify-between items-start mb-6">
              <div class="flex gap-4">
                <div
                  class="size-12 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg"
                >
                  <Store class="size-6" />
                </div>
                <div>
                  <h3 class="font-semibold text-slate-900 leading-tight">
                    {{ store.name }}
                  </h3>
                  <div class="flex items-center gap-1.5 mt-1">
                    <span class="text-xs font-medium text-slate-500"
                      >Active</span
                    >
                  </div>
                </div>
              </div>
              <Menu as="div" class="relative">
                <MenuButton
                  class="p-1.5 rounded-lg text-slate-400 hover:bg-slate-50"
                >
                  <MoreVertical class="size-5" />
                </MenuButton>
                <MenuItems
                  class="absolute right-0 z-10 mt-1 w-32 origin-top-right rounded-xl bg-white shadow-lg ring-1 ring-black/5 p-1 focus:outline-none"
                >
                  <MenuItem v-slot="{ active }"
                    ><button
                      @click="openEditStore(store)"
                      :class="[
                        active ? 'bg-slate-50' : '',
                        'flex w-full items-center px-4 py-2 text-xs font-semibold text-slate-700',
                      ]"
                    >
                      <Edit2 class="mr-2 size-3.5" /> Edit
                    </button></MenuItem
                  >
                  <MenuItem v-slot="{ active }"
                    ><button
                      @click="confirmDeleteStore(store)"
                      :class="[
                        active ? 'bg-red-50 text-red-700' : 'text-red-600',
                        'flex w-full items-center px-4 py-2 text-xs font-semibold',
                      ]"
                    >
                      <Trash2 class="mr-2 size-3.5" /> Delete
                    </button></MenuItem
                  >
                </MenuItems>
              </Menu>
            </div>

            <div class="space-y-3 pt-4 border-t border-slate-100">
              <div class="flex items-start gap-3">
                <MapPin class="size-4 text-slate-400 shrink-0 mt-0.5" />
                <span class="text-sm text-slate-600 leading-snug">
                  {{
                    store.location ||
                    globalSettings.receipt_address ||
                    "No address set"
                  }}
                  <span
                    v-if="!store.location && globalSettings.receipt_address"
                    class="text-[10px] text-slate-400 italic"
                    >(Default)</span
                  >
                </span>
              </div>
              <div class="flex items-center gap-3">
                <Phone class="size-4 text-slate-400 shrink-0" />
                <span class="text-sm text-slate-600">
                  {{
                    store.phone || globalSettings.receipt_phone || "No phone"
                  }}
                  <span
                    v-if="!store.phone && globalSettings.receipt_phone"
                    class="text-[10px] text-slate-400 italic"
                    >(Default)</span
                  >
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-show="activeTab === 'staff'" class="space-y-6">
        <div class="flex flex-col sm:flex-row gap-4 justify-between">
          <div class="relative flex-1 max-w-sm">
            <Search
              class="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400"
            />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Search..."
              class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all shadow-sm"
            />
          </div>
          <button
            @click="handleAddStaffClick"
            class="bg-slate-900 hover:bg-slate-800 text-white shadow-lg px-5 py-2.5 rounded-xl text-sm font-semibold flex items-center gap-2"
          >
            <Plus class="size-4" /><span>Add Member</span>
          </button>
        </div>

        <div
          v-if="filteredStaff.length > 0"
          class="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden overflow-x-auto"
        >
          <table class="w-full min-w-150">
            <thead class="bg-slate-50/80 border-b border-slate-200">
              <tr>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  User
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  Role
                </th>
                <th
                  class="px-6 py-4 text-left text-xs font-semibold uppercase text-slate-500"
                >
                  Branch
                </th>
                <th
                  class="px-6 py-4 text-right text-xs font-semibold uppercase text-slate-500"
                >
                  Actions
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              <tr v-for="user in filteredStaff" :key="user.id">
                <td class="px-6 py-4">
                  <div class="text-sm font-semibold text-slate-900">
                    {{ user.full_name }}
                  </div>
                  <div class="text-xs text-slate-500">{{ user.email }}</div>
                </td>
                <td class="px-6 py-4">
                  <select
                    v-model="user.role"
                    class="bg-white border border-slate-200 text-xs font-semibold rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option>
                  </select>
                </td>
                <td class="px-6 py-4">
                  <select
                    v-model="user.store_id"
                    class="bg-white border border-slate-200 text-xs font-semibold rounded-lg py-1.5 px-3 focus:ring-2 focus:ring-slate-900/10"
                  >
                    <option v-for="s in stores" :key="s.id" :value="s.id">
                      {{ s.name }}
                    </option>
                  </select>
                </td>
                <td class="px-6 py-4 text-right">
                  <button
                    @click="updateStaff(user)"
                    class="text-xs bg-slate-100 px-3 py-1.5 rounded-lg font-bold hover:bg-slate-200 mr-2 transition-colors"
                  >
                    Save</button
                  ><button
                    @click="confirmDeleteStaff(user)"
                    class="text-xs text-red-600 font-bold hover:underline"
                  >
                    Remove
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
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
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
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
              <DialogPanel
                class="w-sm md:w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                <div
                  class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center"
                >
                  <DialogTitle class="text-lg font-semibold text-slate-900">{{
                    storeForm.id ? "Edit Branch Config" : "Add New Branch"
                  }}</DialogTitle>
                </div>

                <div class="p-6 space-y-5">
                  <div>
                    <label
                      class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                      >Branch Name</label
                    >
                    <div class="relative">
                      <Store
                        class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                      /><input
                        v-model="storeForm.name"
                        type="text"
                        placeholder="e.g. Riverside Cafe"
                        :class="inputIconClass"
                      />
                    </div>
                  </div>

                  <div class="border-t border-slate-100 pt-4 w-full">
                    <div class="space-y-4">
                      <div>
                        <label
                          class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                          >Address</label
                        >
                        <div class="relative">
                          <MapPin
                            class="absolute left-3 top-3 size-4 text-slate-400"
                          />
                          <textarea
                            v-model="storeForm.location"
                            rows="2"
                            :placeholder="
                              globalSettings.receipt_address
                                ? `Default: ${globalSettings.receipt_address}`
                                : 'Enter specific address...'
                            "
                            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-all placeholder:text-slate-400 resize-none"
                          ></textarea>
                        </div>
                      </div>

                      <div>
                        <label
                          class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                          >Phone</label
                        >
                        <div class="relative">
                          <Phone
                            class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                          />
                          <input
                            v-model="storeForm.phone"
                            type="text"
                            :placeholder="
                              globalSettings.receipt_phone
                                ? `Default: ${globalSettings.receipt_phone}`
                                : 'Enter contact number...'
                            "
                            :class="inputIconClass"
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div
                  class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3"
                >
                  <button
                    @click="showStoreModal = false"
                    class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    @click="handleSaveStore"
                    :disabled="savingStore"
                    class="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Loader2
                      v-if="savingStore"
                      class="size-4 animate-spin"
                    />{{ savingStore ? "Saving..." : "Save Branch" }}
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
          <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
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
              <DialogPanel
                class="w-sm md:w-xl bg-white rounded-2xl shadow-2xl overflow-hidden"
              >
                <div
                  class="bg-slate-50 px-6 py-4 border-b border-slate-100 flex justify-between items-center"
                >
                  <DialogTitle class="text-lg font-semibold text-slate-900"
                    >Add Account</DialogTitle
                  >
                </div>

                <div class="p-6 space-y-4">
                  <div>
                    <label
                      class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                      >Full Name</label
                    >
                    <div class="relative">
                      <Users
                        class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                      /><input
                        v-model="newStaff.fullName"
                        placeholder="John Doe"
                        :class="inputIconClass"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                      >Email Address</label
                    >
                    <div class="relative">
                      <Mail
                        class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                      /><input
                        v-model="newStaff.email"
                        placeholder="staff@example.com"
                        :class="inputIconClass"
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      class="block text-xs font-semibold text-slate-700 uppercase tracking-wide mb-1.5"
                      >Password</label
                    >
                    <div class="relative">
                      <Lock
                        class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
                      /><input
                        v-model="newStaff.password"
                        type="password"
                        placeholder="••••••••"
                        :class="inputIconClass"
                      />
                    </div>
                  </div>
                </div>

                <div
                  class="px-6 py-4 bg-slate-50 border-t border-slate-100 flex gap-3"
                >
                  <button
                    @click="showStaffModal = false"
                    class="flex-1 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50"
                  >
                    Cancel
                  </button>
                  <button
                    @click="createStaffAccount"
                    :disabled="creatingStaff"
                    class="flex-1 px-4 py-2.5 bg-slate-900 text-white rounded-xl text-sm font-semibold hover:bg-slate-800 disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    <Loader2
                      v-if="creatingStaff"
                      class="size-4 animate-spin"
                    />{{ creatingStaff ? "Creating..." : "Create Account" }}
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
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              class="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            >
              <div class="text-center">
                <h3 class="text-lg font-bold">Delete Branch?</h3>
                <div class="flex gap-3 mt-4">
                  <button
                    @click="showDeleteStoreModal = false"
                    class="flex-1 py-2 border rounded-xl"
                  >
                    Cancel</button
                  ><button
                    @click="handleConfirmDeleteStore"
                    class="flex-1 py-2 bg-red-600 text-white rounded-xl"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
    <TransitionRoot :show="showDeleteStaffModal" as="template">
      <Dialog @close="showDeleteStaffModal = false" class="relative z-50">
        <div class="fixed inset-0 bg-slate-900/40 backdrop-blur-sm" />
        <div class="fixed inset-0 overflow-y-auto z-50">
          <div class="flex min-h-full items-center justify-center p-4">
            <DialogPanel
              class="w-full max-w-sm bg-white rounded-2xl p-6 shadow-2xl"
            >
              <div class="text-center">
                <h3 class="text-lg font-bold">Remove User?</h3>
                <div class="flex gap-3 mt-4">
                  <button
                    @click="showDeleteStaffModal = false"
                    class="flex-1 py-2 border rounded-xl"
                  >
                    Cancel</button
                  ><button
                    @click="handleConfirmDeleteStaff"
                    class="flex-1 py-2 bg-red-600 text-white rounded-xl"
                  >
                    Remove
                  </button>
                </div>
              </div>
            </DialogPanel>
          </div>
        </div>
      </Dialog>
    </TransitionRoot>
  </div>
</template>
