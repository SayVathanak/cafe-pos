import { defineStore } from "pinia";
import { supabase } from "../services/supabase";

export const useUserStore = defineStore("user", {
  state: () => ({
    user: null,
    role: null, // 'super_admin', 'admin', 'staff'
    storeId: null,
    storeName: null,
    organizationId: null,
    settings: {}, // <--- NEW: Stores global settings like auto_print_receipt
  }),

  getters: {
    isAdminOrSuper: (state) => ["admin", "super_admin"].includes(state.role),
  },

  actions: {
    async fetchUserProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, store_id, organization_id, stores(name)")
        .eq("id", user.id)
        .maybeSingle();

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

        // --- NEW: Fetch Settings immediately ---
        await this.fetchSettings();
      }
    },

    // --- NEW ACTION: Fetch Settings from DB ---
    async fetchSettings() {
      if (!this.organizationId) return;

      const { data } = await supabase
        .from("settings")
        .select("*")
        .eq("organization_id", this.organizationId)
        .maybeSingle();

      if (data) {
        this.settings = data;
      }
    },

    async logout() {
      await supabase.auth.signOut();
      this.$reset();
    },
  },
});
