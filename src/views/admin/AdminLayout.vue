<script setup>
import { ref, computed, onMounted } from "vue";
import { useRouter, useRoute } from "vue-router";
import { supabase } from "../../services/supabase";
import { useUserStore } from "../../stores/userStore";
import { useSubscription } from "../../composables/useSubscription";
import { useToastStore } from "../../stores/toastStore";
import {
  LayoutDashboard,
  Coffee,
  Settings,
  LogOut,
  ArrowLeft,
  ShoppingBag,
  Store,
  Users,
  ShieldCheck,
  Menu as MenuIcon,
  Lock,
  Eye,
  CreditCard,
  FileText,
  Loader2,
  ChevronDown,
  X as XIcon,
} from "lucide-vue-next";

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const toast = useToastStore();
const { checkSubscription, isExpired, loading: subLoading } = useSubscription();

const showMobileMenu = ref(false);
const logoUrl = ref(null);
const isCollapsed = ref(false);

// Payment & Renewal State
const showRenewModal = ref(false);
const paymentFile = ref(null);
const paymentPreview = ref(null);
const uploadingPayment = ref(false);
const currentPlanDetails = ref(null);
const availablePlans = ref([]);
const selectedRenewalPlan = ref(null);

const isImpersonating = computed(
  () => !!sessionStorage.getItem("superAdmin_restore")
);

const exitImpersonation = () => {
  const original = JSON.parse(sessionStorage.getItem("superAdmin_restore"));
  if (original) {
    userStore.role = original.role;
    userStore.organizationId = original.orgId;
    userStore.storeName = original.storeName;
    sessionStorage.removeItem("superAdmin_restore");
    router.push("/super-admin");
  }
};

const fetchPlanDetails = async () => {
  if (!userStore.organizationId) return;
  const { data: org } = await supabase
    .from("organizations")
    .select("plan")
    .eq("id", userStore.organizationId)
    .single();
  const { data: plans } = await supabase
    .from("plan_configs")
    .select("*")
    .order("price");
  availablePlans.value = plans || [];
  if (org && plans) {
    const active = plans.find((p) => p.id === org.plan);
    currentPlanDetails.value = active;
    selectedRenewalPlan.value = active;
  }
};

const handleFileSelect = (e) => {
  const file = e.target.files[0];
  if (!file) return;
  paymentFile.value = file;
  paymentPreview.value = URL.createObjectURL(file);
};

const openRenewalModal = () => {
  if (!selectedRenewalPlan.value) fetchPlanDetails();
  showRenewModal.value = true;
};

const submitRenewal = async () => {
  if (!paymentFile.value)
    return toast.addToast("Please upload a receipt", "error");
  if (!selectedRenewalPlan.value) return;
  uploadingPayment.value = true;
  try {
    const fileName = `${userStore.organizationId}-${Date.now()}`;
    const { error: uploadError } = await supabase.storage
      .from("payment-proofs")
      .upload(fileName, paymentFile.value);
    if (uploadError) throw uploadError;
    const {
      data: { publicUrl },
    } = supabase.storage.from("payment-proofs").getPublicUrl(fileName);
    const { error: dbError } = await supabase.from("payment_requests").insert({
      organization_id: userStore.organizationId,
      plan_id: selectedRenewalPlan.value.id,
      amount: selectedRenewalPlan.value.price,
      proof_url: publicUrl,
      notes: `Renewal from Lock Screen. Switching to ${selectedRenewalPlan.value.name}.`,
    });
    if (dbError) throw dbError;
    toast.addToast(
      "Renewal submitted! Access will be restored upon approval.",
      "success"
    );
    showRenewModal.value = false;
  } catch (e) {
    toast.addToast("Error: " + e.message, "error");
  } finally {
    uploadingPayment.value = false;
  }
};

onMounted(async () => {
  if (!userStore.user) await userStore.fetchUserProfile();
  if (userStore.organizationId) {
    await checkSubscription();
    if (isExpired.value) await fetchPlanDetails();
    else
      await supabase.rpc("check_and_swap_plan", {
        org_id: userStore.organizationId,
      });

    const { data } = await supabase
      .from("settings")
      .select("logo_url")
      .eq("organization_id", userStore.organizationId)
      .single();
    if (data?.logo_url) logoUrl.value = data.logo_url;
  }
});

const handleLogout = async () => {
  if (confirm("Sign out?")) {
    await userStore.logout();
    router.push("/login");
  }
};

router.afterEach(() => {
  showMobileMenu.value = false;
});
const isActive = (path) =>
  path === "/admin" && route.path === "/admin"
    ? true
    : path !== "/admin" && route.path.startsWith(path);

const menuItems = [
  { name: "Overview", path: "/admin", icon: LayoutDashboard },
  { name: "Orders", path: "/admin/orders", icon: ShoppingBag },
  { name: "Menu", path: "/admin/products", icon: Coffee },
  // { name: "Staff", path: "/admin/staff", icon: Users, adminOnly: true },
  { name: "Stores", path: "/admin/stores", icon: Store, adminOnly: true },
  {
    name: "Platform",
    path: "/super-admin",
    icon: ShieldCheck,
    superOnly: true,
  },
  {
    name: "Settings",
    path: "/admin/settings",
    icon: Settings,
    adminOnly: true,
  },
];

const visibleMenuItems = computed(() =>
  menuItems.filter((item) => {
    if (item.superOnly && userStore.role !== "super_admin") return false;
    if (item.adminOnly && !["admin", "super_admin"].includes(userStore.role))
      return false;
    return true;
  })
);
</script>

<template>
  <div
    class="flex h-screen w-full bg-white text-slate-900 font-sans overflow-hidden relative"
  >
    <div
      v-if="isImpersonating"
      class="absolute top-0 inset-x-0 z-50 bg-indigo-600 text-white px-4 py-2 flex items-center justify-between shadow-md"
    >
      <div class="flex items-center gap-2">
        <Eye class="size-4 animate-pulse" />
        <span class="font-bold text-xs"
          >Viewing as: {{ userStore.storeName }}</span
        >
      </div>
      <button
        @click="exitImpersonation"
        class="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-bold transition-colors"
      >
        Exit View
      </button>
    </div>

    <div
      v-if="
        isExpired &&
        !subLoading &&
        userStore.role !== 'super_admin' &&
        !isImpersonating
      "
      class="absolute inset-0 z-100 bg-slate-50/95 backdrop-blur-md flex flex-col items-center justify-center text-center p-6 animate-in fade-in duration-500"
    >
      <div
        class="size-20 bg-white rounded-full shadow-xl flex items-center justify-center mb-6 relative"
      >
        <Lock class="size-8 text-slate-900" />
        <div
          class="absolute -right-1 -bottom-1 size-8 bg-red-500 rounded-full flex items-center justify-center text-white border-4 border-slate-50"
        >
          <span class="text-xl font-bold leading-none">!</span>
        </div>
      </div>
      <h2 class="text-3xl font-bold text-slate-900 mb-2 tracking-tight">
        Subscription Suspended
      </h2>
      <div
        v-if="currentPlanDetails"
        class="bg-white/50 border border-slate-200 rounded-lg px-4 py-2 mb-6 inline-block"
      >
        <span class="text-slate-500 text-sm">Your </span>
        <span class="font-bold text-slate-900 text-sm"
          >{{ currentPlanDetails.name }} Plan</span
        >
        <span class="text-slate-500 text-sm"> has expired.</span>
      </div>
      <p class="text-slate-500 max-w-md mb-8 text-base">
        Please renew your subscription to restore access immediately. Your data
        is safe.
      </p>
      <div class="flex flex-col sm:flex-row gap-3 w-full max-w-sm">
        <button
          @click="openRenewalModal"
          class="flex-1 px-6 py-3.5 bg-slate-900 text-white rounded-xl font-bold hover:shadow-lg hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 text-sm"
        >
          <CreditCard class="size-4" /> Renew Access
        </button>
        <button
          @click="handleLogout"
          class="flex-1 px-6 py-3.5 bg-white border border-slate-200 rounded-xl font-bold text-slate-700 hover:bg-slate-50 transition-colors text-sm"
        >
          Sign Out
        </button>
      </div>
    </div>

    <div
      v-if="showRenewModal"
      class="absolute inset-0 z-110 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in zoom-in-95 duration-200"
    >
      <div
        class="bg-white w-full max-w-sm rounded-2xl p-6 shadow-2xl flex flex-col max-h-[90vh]"
      >
        <div class="flex justify-between items-center mb-1">
          <h2 class="text-lg font-bold">Renew Subscription</h2>
          <button
            @click="showRenewModal = false"
            class="p-1 hover:bg-slate-100 rounded-full"
          >
            <XIcon class="size-5 text-slate-400" />
          </button>
        </div>
        <p class="text-xs text-slate-500 mb-4">
          Select a plan and upload your payment proof.
        </p>
        <div class="mb-4 space-y-2">
          <label class="text-xs font-bold uppercase text-slate-500"
            >Select Plan</label
          >
          <div class="relative">
            <select
              v-model="selectedRenewalPlan"
              class="w-full appearance-none bg-slate-50 border border-slate-200 text-slate-900 text-sm font-bold rounded-lg p-3 pr-8 focus:ring-2 focus:ring-slate-900/10 outline-none"
            >
              <option
                v-for="plan in availablePlans"
                :key="plan.id"
                :value="plan"
                :disabled="plan.price <= 0"
              >
                {{ plan.name }} - ${{ plan.price }}/mo
              </option>
            </select>
            <ChevronDown
              class="absolute right-3 top-3.5 size-4 text-slate-400 pointer-events-none"
            />
          </div>
        </div>
        <div
          class="bg-slate-900 text-white p-4 rounded-xl mb-4 relative overflow-hidden"
        >
          <div
            class="absolute top-0 right-0 size-20 bg-white/5 rounded-full -mr-10 -mt-10"
          ></div>
          <div class="relative z-10">
            <div
              class="text-[0.65rem] text-slate-400 uppercase tracking-widest mb-1"
            >
              Total to Pay
            </div>
            <div class="text-2xl font-bold mb-3">
              ${{ selectedRenewalPlan?.price || 0 }}
            </div>
            <div class="h-px bg-white/10 mb-3"></div>
            <div class="space-y-1">
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Bank</span
                ><span class="font-bold">ABA Bank</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Account</span
                ><span class="font-bold font-mono">000 735 043</span>
              </div>
              <div class="flex justify-between text-xs">
                <span class="text-slate-400">Name</span
                ><span class="font-bold uppercase">Say Saksovathanak</span>
              </div>
            </div>
          </div>
        </div>
        <div class="mb-4">
          <label class="block w-full cursor-pointer group">
            <div
              v-if="!paymentPreview"
              class="border-2 border-dashed border-slate-200 rounded-xl h-24 flex flex-col items-center justify-center gap-1 group-hover:border-slate-400 group-hover:bg-slate-50 transition-colors"
            >
              <FileText class="size-5 text-slate-400" />
              <span class="text-xs font-bold text-slate-500"
                >Tap to upload receipt</span
              >
            </div>
            <img
              v-else
              :src="paymentPreview"
              class="w-full h-24 object-cover rounded-xl border border-slate-200"
            />
            <input
              type="file"
              class="hidden"
              @change="handleFileSelect"
              accept="image/*"
            />
          </label>
        </div>
        <button
          @click="submitRenewal"
          :disabled="uploadingPayment"
          class="w-full py-3 bg-slate-900 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-slate-800 disabled:opacity-70"
        >
          <Loader2 v-if="uploadingPayment" class="size-4 animate-spin" />{{
            uploadingPayment ? "Uploading..." : "Submit Payment"
          }}
        </button>
      </div>
    </div>

    <aside
      class="hidden lg:flex flex-col border-r border-slate-200 bg-white transition-all duration-300 z-40"
      :class="isCollapsed ? 'w-20' : 'w-48'"
    >
      <div
        class="h-20 flex items-center justify-center relative overflow-hidden"
        :class="isImpersonating ? 'mt-8' : ''"
      >
        <div
          v-if="logoUrl && !isCollapsed"
          class="w-full px-6 flex justify-start"
        >
          <img :src="logoUrl" class="h-5 md:h-10 object-contain" />
        </div>
        <div v-else class="flex items-center gap-3 px-4 w-full">
          <div
            class="w-8 h-8 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold shrink-0 font-preah"
          >
            {{ userStore.storeName ? userStore.storeName.charAt(0) : "S" }}
          </div>
          <div
            v-if="!isCollapsed"
            class="flex flex-col whitespace-nowrap overflow-hidden"
          >
            <span class="font-bold text-sm truncate">{{
              userStore.storeName
            }}</span>
            <span class="text-xs text-slate-500 capitalize">{{
              userStore.role
            }}</span>
          </div>
        </div>
      </div>
      <nav class="flex-1 overflow-y-auto py-6 px-3 space-y-2">
        <router-link
          v-for="item in visibleMenuItems"
          :key="item.path"
          :to="item.path"
          class="group flex items-center gap-3 px-3 py-2.5 transition-all text-sm font-medium"
          :class="
            isActive(item.path)
              ? 'text-blue-600'
              : 'text-slate-500 hover:text-slate-900'
          "
        >
          <component :is="item.icon" class="size-5 shrink-0" />
          <span v-if="!isCollapsed">{{ item.name }}</span>
        </router-link>
      </nav>
      <div class="p-4 border-t border-slate-100 space-y-4 mb-6">
        <button
          @click="router.push('/')"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 transition-colors"
        >
          <ArrowLeft class="size-5 shrink-0" /><span v-if="!isCollapsed"
            >POS Terminal</span
          >
        </button>
        <button
          @click="handleLogout"
          class="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut class="size-5 shrink-0" /><span v-if="!isCollapsed"
            >Sign Out</span
          >
        </button>
      </div>
    </aside>

    <nav
      class="lg:hidden fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 pb-6 pt-2 px-6 flex justify-between items-center z-50 h-20"
    >
      <router-link
        @click="router.push('/')"
        to="/"
        class="flex flex-col items-center gap-1 p-1 text-slate-400"
      >
        <ArrowLeft class="size-6" stroke-width="2" /><span
          class="text-[0.6rem] font-bold"
          >POS</span
        >
      </router-link>
      <router-link
        v-for="item in visibleMenuItems.slice(0, 3)"
        :key="item.path"
        :to="item.path"
        class="flex flex-col items-center gap-1 p-1"
        :class="isActive(item.path) ? 'text-slate-900' : 'text-slate-400'"
      >
        <component
          :is="item.icon"
          class="size-6"
        />
        <span class="text-[0.6rem] font-bold">{{ item.name }}</span>
      </router-link>
      <button
        @click="showMobileMenu = true"
        class="flex flex-col items-center gap-1 p-1 text-slate-400"
      >
        <MenuIcon class="size-6" /><span class="text-[0.6rem] font-bold"
          >More</span
        >
      </button>
    </nav>

    <div
      v-if="showMobileMenu"
      class="lg:hidden fixed inset-0 z-60 flex flex-col justify-end"
    >
      <div
        class="absolute inset-0 bg-black/40 backdrop-blur-sm"
        @click="showMobileMenu = false"
      ></div>
      <div
        class="bg-white w-full rounded-t-3xl p-6 relative z-10 pb-10 animate-in slide-in-from-bottom-10 duration-200"
      >
        <div class="flex justify-between items-center mb-6">
          <div class="flex items-center gap-3">
            <div
              class="size-10 bg-slate-900 rounded-lg flex items-center justify-center text-white font-bold"
            >
              {{ userStore.storeName?.charAt(0) }}
            </div>
            <div>
              <h3 class="font-bold text-sm">{{ userStore.storeName }}</h3>
              <p class="text-xs text-slate-500 capitalize">
                {{ userStore.role }}
              </p>
            </div>
          </div>
          <button
            @click="showMobileMenu = false"
            class="p-2 bg-slate-100 rounded-full"
          >
            <XIcon class="size-5" />
          </button>
        </div>
        <div class="grid grid-cols-4 gap-4 mb-6">
          <router-link
            v-for="item in visibleMenuItems"
            :key="item.path"
            :to="item.path"
            @click="showMobileMenu = false"
            class="flex flex-col items-center gap-2"
          >
            <div
              class="size-14 rounded-2xl flex items-center justify-center transition-colors"
              :class="
                isActive(item.path)
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-50 text-slate-600'
              "
            >
              <component :is="item.icon" class="size-6" />
            </div>
            <span class="text-[0.65rem] font-bold text-center">{{
              item.name
            }}</span>
          </router-link>
        </div>
        <button
          @click="handleLogout"
          class="w-full p-3.5 rounded-xl bg-red-50 text-red-600 font-bold flex justify-center gap-2 text-sm"
        >
          <LogOut class="size-5" /> Sign Out
        </button>
      </div>
    </div>

    <div
      class="flex-1 flex flex-col relative h-full overflow-hidden"
      :class="isImpersonating ? 'pt-10' : ''"
    >
      <main
        class="flex-1 overflow-y-auto p-4 lg:p-8 pb-24 lg:pb-8 scroll-smooth"
      >
        <div class="max-w-7xl mx-auto w-full">
          <router-view v-slot="{ Component }">
            <transition name="fade" mode="out-in"
              ><component :is="Component"
            /></transition>
          </router-view>
        </div>
      </main>
    </div>
  </div>
</template>
