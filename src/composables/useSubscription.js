import { ref } from "vue";
import { supabase } from "../services/supabase";
import { useUserStore } from "../stores/userStore";

export function useSubscription() {
  const userStore = useUserStore();
  const isExpired = ref(false);
  const loading = ref(true);
  const validUntil = ref(null);

  const checkSubscription = async () => {
    if (!userStore.organizationId) return;
    loading.value = true;

    const { data, error } = await supabase
      .from("organizations")
      .select("valid_until")
      .eq("id", userStore.organizationId)
      .single();

    if (data && data.valid_until) {
      validUntil.value = new Date(data.valid_until);
      const now = new Date();
      // Check if expiry date is in the past
      if (validUntil.value < now) {
        isExpired.value = true;
      } else {
        isExpired.value = false;
      }
    }
    loading.value = false;
  };

  return {
    isExpired,
    validUntil,
    loading,
    checkSubscription,
  };
}
