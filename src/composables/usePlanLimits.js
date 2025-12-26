import { ref, computed } from "vue";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";

// Default fallback in case DB fetch fails (prevents crash)
const DEFAULT_CONFIG = {
  starter: {
    name: "Starter",
    price: 0,
    max_branches: 1,
    max_items: 15,
    max_orders: 300,
    allow_custom_logo: false,
  },
  standard: {
    name: "Standard",
    price: 15,
    max_branches: 1,
    max_items: Infinity,
    max_orders: Infinity,
    allow_custom_logo: true,
  },
  business: {
    name: "Business",
    price: 35,
    max_branches: Infinity,
    max_items: Infinity,
    max_orders: Infinity,
    allow_custom_logo: true,
  },
};

export function usePlanLimits() {
  const userStore = useUserStore();
  const loading = ref(false);

  // Reactive state for the plan configuration
  const planConfigs = ref({ ...DEFAULT_CONFIG });
  const realTimePlan = ref(userStore.organization?.plan || "starter");

  const usage = ref({
    branches: 0,
    items: 0,
    orders_month: 0,
  });

  // Helper to convert DB "null" to JS "Infinity"
  const parseLimit = (val) => (val === null ? Infinity : val);

  const limits = computed(() => {
    const plan =
      planConfigs.value[realTimePlan.value] || planConfigs.value.starter;
    return plan;
  });

  const fetchUsage = async () => {
    if (!userStore.organizationId) return;
    loading.value = true;

    try {
      // 1. Fetch Plan Configuration from DB
      const { data: configData } = await supabase
        .from("plan_configs")
        .select("*");

      if (configData && configData.length > 0) {
        const newConfigs = {};
        configData.forEach((row) => {
          newConfigs[row.id] = {
            name: row.name,
            price: row.price,
            max_branches: parseLimit(row.max_branches),
            max_items: parseLimit(row.max_items),
            max_orders: parseLimit(row.max_orders),
            allow_custom_logo: row.allow_custom_logo,
          };
        });
        planConfigs.value = newConfigs;
      }

      // 2. Get Organization's Current Plan
      const { data: orgData } = await supabase
        .from("organizations")
        .select("plan")
        .eq("id", userStore.organizationId)
        .single();

      if (orgData) realTimePlan.value = orgData.plan;

      // 3. Count Branches
      const { count: storeCount } = await supabase
        .from("stores")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", userStore.organizationId);

      // 4. Count Items (IGNORING ARCHIVED)
      const { count: drinkCount } = await supabase
        .from("drinks")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", userStore.organizationId)
        .neq("is_archived", true); // <--- CRITICAL FILTER

      // 5. Count Orders (This Month)
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { count: orderCount } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", userStore.organizationId)
        .gte("created_at", startOfMonth.toISOString());

      usage.value = {
        branches: storeCount || 0,
        items: drinkCount || 0,
        orders_month: orderCount || 0,
      };
    } catch (e) {
      console.error("Failed to fetch limits", e);
    } finally {
      loading.value = false;
    }
  };

  const checkLimit = (feature) => {
    const currentLimits = limits.value;
    if (feature === "add_branch")
      return usage.value.branches < currentLimits.max_branches;
    if (feature === "add_item")
      return usage.value.items < currentLimits.max_items;
    if (feature === "create_order")
      return usage.value.orders_month < currentLimits.max_orders;
    if (feature === "custom_logo") return currentLimits.allow_custom_logo;
    return true;
  };

  return {
    fetchUsage,
    checkLimit,
    usage,
    currentPlan: realTimePlan,
    limits,
    loading,
    planConfigs,
  };
}
