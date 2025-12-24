<script setup>
import { ref, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { supabase } from "../services/supabase";
import { Store, Loader2, CheckCircle, AlertCircle, ArrowRight } from "lucide-vue-next";

const route = useRoute();
const router = useRouter();
const loading = ref(false);
const success = ref(false);
const errorMsg = ref("");

const form = ref({
  email: "",
  password: "",
  fullName: "",
});

const storeName = ref("Verifying Link...");
const storeId = route.query.store_id;

onMounted(async () => {
  // 1. Force Logout to avoid conflicts
  await supabase.auth.signOut();

  // 2. Validate Link
  if (!storeId) {
    errorMsg.value = "Invalid Link: No Store ID found.";
    storeName.value = "Error";
    return;
  }

  // 3. Fetch Store Name
  const { data, error } = await supabase
    .from("stores")
    .select("name")
    .eq("id", storeId)
    .single();

  if (error || !data) {
    errorMsg.value = "Invalid Link: Store not found or expired.";
    storeName.value = "Unknown Store";
  } else {
    storeName.value = data.name;
    form.value.fullName = data.name + " Staff"; // Default name
  }
});

const handleRegister = async () => {
  if (!form.value.email || !form.value.password) return;

  loading.value = true;
  errorMsg.value = "";

  try {
    // A. Verify Store & Get Org ID
    const { data: storeData, error: storeErr } = await supabase
      .from("stores")
      .select("organization_id")
      .eq("id", storeId)
      .single();

    if (storeErr || !storeData) throw new Error("Store ID is invalid.");

    // B. Create Auth User
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: form.value.email,
      password: form.value.password,
    });

    if (authError) throw authError;

    if (authData.user) {
      // C. MANUAL PROFILE CREATION
      const { error: profileError } = await supabase.from("profiles").insert({
        id: authData.user.id,
        email: form.value.email,
        full_name: form.value.fullName,
        organization_id: storeData.organization_id,
        store_id: storeId,
        role: "staff",
      });

      if (profileError) throw new Error("Profile Error: " + profileError.message);

      // D. MANUAL ROLE CREATION
      const { error: roleError } = await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        store_id: storeId,
        role: "staff",
      });
      
      if (roleError) console.warn("Role warning:", roleError);

      // SUCCESS
      success.value = true;
      setTimeout(() => router.push("/login"), 2500);
    }
  } catch (err) {
    console.error(err);
    errorMsg.value = err.message;
  } finally {
    loading.value = false;
  }
};
</script>

<template>
  <div class="min-h-screen bg-slate-50 flex flex-col justify-center items-center p-4">
    <div class="mb-8 text-center">
      <div class="w-12 h-12 bg-black rounded-xl flex items-center justify-center text-white mx-auto mb-3 shadow-lg shadow-slate-200">
        <Store class="w-6 h-6" />
      </div>
      <h1 class="text-xl font-bold text-slate-900 tracking-tight">Staff Onboarding</h1>
      <p class="text-sm text-slate-500 mt-1">Join your team workspace</p>
    </div>

    <div class="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
      
      <div class="bg-slate-900 px-6 py-4 flex items-center gap-3">
        <div class="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white/90">
          <Store class="w-4 h-4" />
        </div>
        <div>
          <div class="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registering for</div>
          <div class="text-white font-bold text-sm">{{ storeName }}</div>
        </div>
      </div>

      <div class="p-6 md:p-8">
        <div v-if="success" class="text-center py-8 animate-in fade-in zoom-in duration-300">
          <div class="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle class="w-8 h-8" />
          </div>
          <h2 class="text-lg font-bold text-slate-900 mb-2">Account Created!</h2>
          <p class="text-slate-500 text-sm mb-6">Redirecting you to the login page...</p>
          <div class="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>

        <form v-else @submit.prevent="handleRegister" class="space-y-5">
          
          <div v-if="errorMsg" class="p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3 text-red-600 text-sm">
            <AlertCircle class="w-5 h-5 shrink-0 mt-0.5" />
            <span>{{ errorMsg }}</span>
          </div>

          <div class="space-y-4">
            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Full Name</label>
              <input 
                v-model="form.fullName"
                type="text" 
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                placeholder="e.g. John Doe"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Work Email</label>
              <input 
                v-model="form.email"
                type="email" 
                required
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                placeholder="name@company.com"
              />
            </div>

            <div>
              <label class="block text-xs font-bold text-slate-700 mb-1.5">Create Password</label>
              <input 
                v-model="form.password"
                type="password" 
                required
                minlength="6"
                class="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-black/5 focus:border-black transition-all"
                placeholder="••••••••"
              />
              <p class="text-[10px] text-slate-400 mt-1.5 text-right">Must be at least 6 characters</p>
            </div>
          </div>

          <button 
            type="submit" 
            :disabled="loading || !!errorMsg"
            class="w-full bg-black text-white h-11 rounded-lg font-bold text-sm hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 mt-2"
          >
            <Loader2 v-if="loading" class="w-4 h-4 animate-spin" />
            <span v-else>Complete Registration</span>
            <ArrowRight v-if="!loading" class="w-4 h-4" />
          </button>
        </form>
      </div>
      
      <div class="bg-slate-50 border-t border-slate-100 p-4 text-center">
        <p class="text-xs text-slate-400">
          Already have an account? <router-link to="/login" class="text-slate-900 font-bold hover:underline">Log in</router-link>
        </p>
      </div>
    </div>
  </div>
</template>