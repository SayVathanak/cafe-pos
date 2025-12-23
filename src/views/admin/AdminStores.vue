<script setup>
import { ref, onMounted } from "vue";
import { supabase } from "../../services/supabase";
import { useToastStore } from "../../stores/toastStore";
import { Store, MapPin, Plus, Loader2, Edit2, X } from "lucide-vue-next";

const toast = useToastStore();
const loading = ref(true);
const stores = ref([]);
const showModal = ref(false);
const saving = ref(false);

// Form Data
const form = ref({
  id: null,
  name: "",
  location: "",
  active: true,
});

// Fetch Stores
const fetchStores = async () => {
  loading.value = true;
  const { data, error } = await supabase
    .from("stores")
    .select("*")
    .order("id", { ascending: true });

  if (error) {
    toast.addToast("Failed to load stores", "error");
  } else {
    stores.value = data;
  }
  loading.value = false;
};

// Open Modal
const openModal = (store = null) => {
  if (store) {
    form.value = { ...store };
  } else {
    form.value = { id: null, name: "", location: "", active: true };
  }
  showModal.value = true;
};

// Save Store
const handleSave = async () => {
  if (!form.value.name)
    return toast.addToast("Store name is required", "error");

  saving.value = true;
  // Prepare payload (excluding ID for insert)
  const payload = { 
    name: form.value.name, 
    location: form.value.location, 
    phone: form.value.phone,         
    wifi_pass: form.value.wifi_pass, 
    active: form.value.active 
  }

  let error;
  if (form.value.id) {
    // Update existing
    ({ error } = await supabase
      .from("stores")
      .update(payload)
      .eq("id", form.value.id));
  } else {
    // Insert new
    ({ error } = await supabase.from("stores").insert(payload));
  }

  saving.value = false;

  if (error) {
    toast.addToast(error.message, "error");
  } else {
    toast.addToast(
      form.value.id ? "Store updated" : "New branch created",
      "success"
    );
    showModal.value = false;
    fetchStores();
  }
};

onMounted(fetchStores);
</script>

<template>
  <div class="space-y-6 pb-20">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-semibold text-slate-900 tracking-tight">
          Store Locations
        </h2>
        <p class="text-xs text-slate-500 mt-1">
          Manage your physical branches.
        </p>
      </div>
      <button
        @click="openModal()"
        class="bg-black text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800 transition-colors shadow-lg shadow-slate-200"
      >
        <Plus class="w-4 h-4" /> Add Branch
      </button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Loader2 class="w-8 h-8 animate-spin text-slate-300" />
    </div>

    <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      <div
        v-for="store in stores"
        :key="store.id"
        class="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition-all relative overflow-hidden group"
      >
        <div class="absolute top-4 right-4">
          <span
            class="inline-flex items-center gap-1.5 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-widest border"
            :class="
              store.active
                ? 'bg-green-50 text-green-700 border-green-200'
                : 'bg-slate-50 text-slate-400 border-slate-200'
            "
          >
            <span
              class="w-1.5 h-1.5 rounded-full"
              :class="store.active ? 'bg-green-500' : 'bg-slate-400'"
            ></span>
            {{ store.active ? "Active" : "Closed" }}
          </span>
        </div>

        <div class="flex items-start gap-4 mb-4">
          <div
            class="w-12 h-12 bg-slate-900 text-white rounded-xl flex items-center justify-center shrink-0 shadow-lg shadow-slate-200"
          >
            <Store class="w-6 h-6" />
          </div>
          <div class="pt-1 pr-16">
            <h3 class="font-bold text-slate-900 text-base truncate">
              {{ store.name }}
            </h3>
            <div class="flex items-center gap-1 text-slate-500 text-xs mt-1">
              <MapPin class="w-3 h-3" />
              {{ store.location || "No location set" }}
            </div>
          </div>
        </div>

        <div
          class="flex items-center justify-between pt-4 border-t border-slate-100 mt-2"
        >
          <div class="text-[10px] font-mono text-slate-400">
            ID: {{ store.id }}
          </div>
          <button
            @click="openModal(store)"
            class="text-xs font-bold uppercase tracking-wide text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition-colors"
          >
            Edit Details <Edit2 class="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>

    <transition name="fade">
      <div
        v-if="showModal"
        class="fixed inset-0 z-50 flex items-center justify-center p-4"
      >
        <div
          class="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          @click="showModal = false"
        ></div>
        <div
          class="relative bg-white w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in zoom-in-95 duration-200"
        >
          <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-bold text-slate-900">
              {{ form.id ? "Edit Branch" : "New Branch" }}
            </h3>
            <button
              @click="showModal = false"
              class="text-slate-400 hover:text-black transition-colors"
            >
              <X class="w-5 h-5" />
            </button>
          </div>

          <div class="space-y-4">
            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5"
                >Branch Name</label
              >
              <input
                v-model="form.name"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5"
                >Location / Address</label
              >
              <input
                v-model="form.location"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5"
                >Phone Number</label
              >
              <input
                v-model="form.phone"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="012 345 678"
              />
            </div>

            <div>
              <label
                class="block text-[10px] font-bold uppercase tracking-widest text-slate-500 mb-1.5"
                >Wifi Password</label
              >
              <input
                v-model="form.wifi_pass"
                type="text"
                class="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:border-black transition-colors"
                placeholder="Password123"
              />
            </div>
          </div>

          <div class="mt-6">
            <button
              @click="handleSave"
              :disabled="saving"
              class="w-full bg-black text-white py-3 rounded-xl text-xs font-bold uppercase tracking-widest hover:bg-slate-800 disabled:opacity-70 flex items-center justify-center gap-2 transition-all"
            >
              <Loader2 v-if="saving" class="w-3 h-3 animate-spin" />
              {{ saving ? "Saving..." : "Save Changes" }}
            </button>
          </div>
        </div>
      </div>
    </transition>
  </div>
</template>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
