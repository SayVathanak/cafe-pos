import { defineStore } from "pinia";
import { supabase } from "../services/supabase";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
    role: null, // 'super_admin', 'admin', 'staff'
    storeId: null,
    storeName: null,
    organizationId: null,
  }),

  getters: {
    // ✅ NEW: Helper to let YOU access Admin features
    isAdminOrSuper: (state) => ["admin", "super_admin"].includes(state.role),
  },

  actions: {
    async fetchUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      // ✅ FIX: We explicitly join 'stores' to get the name
      const { data: profile } = await supabase
        .from("profiles")
        .select("role, store_id, organization_id, stores(name)")
        .eq("id", user.id)
        .single();

      if (profile) {
        this.user = user;
        this.role = profile.role;
        this.storeId = profile.store_id;
        this.organizationId = profile.organization_id;

        // Logic: If Super Admin has no store, show 'Platform'
        if (this.role === "super_admin" && !profile.store_id) {
          this.storeName = "Platform Control";
        } else {
          this.storeName = profile.stores?.name || "Central Office";
        }
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.$reset();
    },
  },
});
