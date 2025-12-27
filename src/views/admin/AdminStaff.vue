<script setup>
import { ref, onMounted, computed } from "vue";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useStaff } from "../../composables/useStaff";
import { toast } from "vue-sonner";
import {
  Users,
  Search,
  Shield,
  Store,
  Save,
  Loader2,
  UserCog,
  Plus,
  X,
  Trash2,
  ChevronDown,
} from "lucide-vue-next";
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  TransitionRoot,
  TransitionChild,
} from "@headlessui/vue";

const userStore = useUserStore();
const { staff, loading, fetchStaff } = useStaff();
const stores = ref([]);
const searchQuery = ref("");
const showAddModal = ref(false);
const creating = ref(false);
const showDeleteModal = ref(false);
const staffToDelete = ref(null);
const isDeleting = ref(false);
const newStaff = ref({
  email: "",
  password: "",
  fullName: "",
  role: "staff",
  store_id: "",
});

const filteredStaff = computed(() => {
  if (!searchQuery.value) return staff.value;
  const q = searchQuery.value.toLowerCase();
  return staff.value.filter(
    (s) =>
      (s.email?.toLowerCase() || "").includes(q) ||
      (s.full_name?.toLowerCase() || "").includes(q)
  );
});
const loadStores = async () => {
  const { data } = await supabase
    .from("stores")
    .select("id, name")
    .eq("organization_id", userStore.organizationId);
  stores.value = data || [];
  if (stores.value.length) newStaff.value.store_id = stores.value[0].id;
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
  else toast.success("Updated");
};
const createStaffAccount = async () => {
  creating.value = true;
  const { error } = await supabase.rpc("create_staff_user", {
    new_email: newStaff.value.email,
    new_password: newStaff.value.password,
    new_name: newStaff.value.fullName,
    new_role: newStaff.value.role,
    new_store_id: newStaff.value.store_id,
    org_id: userStore.organizationId,
  });
  creating.value = false;
  if (error) toast.error(error.message);
  else {
    toast.success("Created");
    showAddModal.value = false;
    fetchStaff(userStore.organizationId);
  }
};
const confirmDelete = (user) => {
  staffToDelete.value = user;
  showDeleteModal.value = true;
};
const handleConfirmDelete = async () => {
  isDeleting.value = true;
  const { error } = await supabase.rpc("delete_staff_user", {
    target_user_id: staffToDelete.value.id,
  });
  isDeleting.value = false;
  showDeleteModal.value = false;
  if (error) toast.error(error.message);
  else {
    toast.success("Deleted");
    fetchStaff(userStore.organizationId);
  }
};

onMounted(() => {
  if (userStore.organizationId) {
    loadStores();
    fetchStaff(userStore.organizationId);
  }
});
</script>

<template>
  <div class="space-y-6 pb-24">
    <div
      class="flex flex-col md:flex-row md:items-center justify-between gap-4"
    >
      <div>
        <h2 class="text-2xl font-bold tracking-tight text-slate-900">
          Staff Management
        </h2>
        <p class="text-sm text-slate-500 mt-1">Control access levels.</p>
      </div>
      <div class="flex gap-3">
        <div class="relative flex-1 md:w-64">
          <Search
            class="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400"
          /><input
            v-model="searchQuery"
            type="text"
            placeholder="Search..."
            class="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 transition-all"
          />
        </div>
        <button
          @click="showAddModal = true"
          class="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 hover:bg-slate-800 shadow-lg shadow-slate-900/10 transition-all active:scale-95 whitespace-nowrap"
        >
          <Plus class="size-4" />
          <span class="hidden sm:inline">Add Member</span>
        </button>
      </div>
    </div>
    <div v-if="loading" class="py-20 flex justify-center">
      <Loader2 class="size-8 animate-spin text-slate-300" />
    </div>
    <div v-else>
      <div
        class="hidden md:block bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden"
      >
        <table class="w-full text-left">
          <thead class="bg-slate-50 border-b border-slate-200">
            <tr>
              <th
                class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider"
              >
                User
              </th>
              <th
                class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider"
              >
                Role
              </th>
              <th
                class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider"
              >
                Store
              </th>
              <th
                class="px-6 py-4 text-xs font-bold uppercase text-slate-500 tracking-wider text-right"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-100">
            <tr
              v-for="user in filteredStaff"
              :key="user.id"
              class="group hover:bg-slate-50/50 transition-colors"
            >
              <td class="px-6 py-4">
                <div class="flex items-center gap-3">
                  <div
                    class="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 border border-slate-200 font-bold"
                  >
                    {{ user.full_name?.charAt(0) || "U" }}
                  </div>
                  <div>
                    <p class="text-sm font-bold text-slate-900">
                      {{ user.full_name }}
                    </p>
                    <p class="text-xs text-slate-500">{{ user.email }}</p>
                  </div>
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="relative w-32">
                  <select
                    v-model="user.role"
                    class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-slate-900/10 outline-none cursor-pointer"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option></select
                  ><ChevronDown
                    class="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </td>
              <td class="px-6 py-4">
                <div class="relative w-48">
                  <select
                    v-model="user.store_id"
                    class="w-full appearance-none bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg pl-3 pr-8 py-2 focus:ring-2 focus:ring-slate-900/10 outline-none cursor-pointer"
                  >
                    <option
                      v-for="store in stores"
                      :key="store.id"
                      :value="store.id"
                    >
                      {{ store.name }}
                    </option></select
                  ><ChevronDown
                    class="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </td>
              <td class="px-6 py-4 text-right">
                <div
                  class="flex items-center justify-end gap-2"
                >
                  <button
                    @click="updateStaff(user)"
                    :disabled="user.isSaving"
                    class="inline-flex items-center gap-2 px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-xs font-bold hover:bg-slate-50"
                  >
                    <Loader2
                      v-if="user.isSaving"
                      class="size-3 animate-spin"
                    />{{ user.isSaving ? "Saving" : "Save" }}</button
                  ><button
                    @click="confirmDelete(user)"
                    class="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 class="size-4" />
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
      <div class="md:hidden space-y-4">
        <div
          v-for="user in filteredStaff"
          :key="user.id"
          class="bg-white border border-slate-200 rounded-xl p-5 shadow-sm"
        >
          <div class="flex justify-between items-start mb-4">
            <div class="flex items-center gap-3">
              <div
                class="size-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-600 border border-slate-200 font-bold"
              >
                {{ user.full_name?.charAt(0) || "U" }}
              </div>
              <div>
                <p class="text-sm font-bold text-slate-900">
                  {{ user.full_name }}
                </p>
                <p class="text-xs text-slate-500">{{ user.email }}</p>
              </div>
            </div>
            <button
              @click="confirmDelete(user)"
              class="text-slate-300 hover:text-red-600 p-1"
            >
              <Trash2 class="size-4" />
            </button>
          </div>
          <div class="space-y-4">
            <div class="grid grid-cols-2 gap-4">
              <div>
                <label
                  class="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1"
                  >Role</label
                >
                <div class="relative">
                  <select
                    v-model="user.role"
                    class="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-bold focus:bg-white transition-colors"
                  >
                    <option value="staff">Staff</option>
                    <option value="admin">Admin</option></select
                  ><ChevronDown
                    class="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
              <div>
                <label
                  class="text-[0.65rem] font-bold uppercase text-slate-400 block mb-1"
                  >Store</label
                >
                <div class="relative">
                  <select
                    v-model="user.store_id"
                    class="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-8 py-2 text-xs font-bold focus:bg-white transition-colors"
                  >
                    <option
                      v-for="store in stores"
                      :key="store.id"
                      :value="store.id"
                    >
                      {{ store.name }}
                    </option></select
                  ><ChevronDown
                    class="absolute right-2 top-1/2 -translate-y-1/2 size-3 text-slate-400 pointer-events-none"
                  />
                </div>
              </div>
            </div>
            <button
              @click="updateStaff(user)"
              :disabled="user.isSaving"
              class="w-full py-3 bg-slate-900 text-white rounded-xl text-xs font-bold flex justify-center items-center gap-2 active:scale-95 transition-transform"
            >
              <Loader2
                v-if="user.isSaving"
                class="size-3.5 animate-spin"
              /><span v-else>Update Access</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
