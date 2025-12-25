import { ref } from "vue";
import { supabase } from "../services/supabase";

export function useStaff() {
  const staff = ref([]);
  const loading = ref(false);
  const error = ref(null);

  const fetchStaff = async (organizationId) => {
    loading.value = true;
    error.value = null;

    try {
      // Fetch from the SQL View we created
      const { data, error: err } = await supabase
        .from("staff_directory_view")
        .select("*")
        .eq("organization_id", organizationId)
        .order("full_name");

      if (err) throw err;
      staff.value = data || [];
    } catch (e) {
      console.error("Error fetching staff:", e);
      error.value = e.message;
    } finally {
      loading.value = false;
    }
  };

  return { staff, loading, error, fetchStaff };
}
