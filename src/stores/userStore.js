import { defineStore } from "pinia";
import { supabase } from "../services/supabase";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
    role: null, // 'admin' or 'staff'
    storeId: null,
    storeName: null,
  }),

  actions: {
    async fetchUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;

      // Fetch the role and store link we created in SQL
      const { data: roleData } = await supabase
        .from("user_roles")
        .select("role, store_id, stores(name)")
        .eq("user_id", user.id)
        .single();

      this.user = user;
      this.role = roleData?.role || "staff";
      this.storeId = roleData?.store_id;
      this.storeName = roleData?.stores?.name;

      return this.role;
    },

    async logout() {
      await supabase.auth.signOut();
      this.user = null;
      this.role = null;
      this.storeId = null;
    },
  },
});
