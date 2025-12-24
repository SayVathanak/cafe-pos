import { defineStore } from "pinia";
import { supabase } from "../services/supabase";
import { useUserStore } from "./userStore"; // 👈 IMPORT USER STORE

export const useCartStore = defineStore("cart", {
  // 1. STATE
  state: () => ({
    items: [], // Current cart items
    // Load offline queue from LocalStorage on startup
    offlineQueue: JSON.parse(localStorage.getItem("offlineOrders")) || [],
    customerParams: null,
  }),

  // 2. GETTERS
  getters: {
    cartTotal: (state) => {
      return state.items.reduce(
        (total, item) => total + item.price * item.qty,
        0
      );
    },

    totalItems: (state) => {
      return state.items.reduce((count, item) => count + item.qty, 0);
    },

    // Helper to check connection status
    isOffline: () => !navigator.onLine,
  },

  // 3. ACTIONS
  actions: {
    addToCart(drink) {
      // Create a unique "Signature" based on ID and modifiers
      const sugar = drink.modifiers?.sugar || "Normal";
      const ice = drink.modifiers?.ice || "Normal";
      const signature = `${drink.id}-${sugar}-${ice}`;

      // Check if this exact drink combination exists
      const existingItem = this.items.find(
        (item) => item.signature === signature
      );

      if (existingItem) {
        existingItem.qty++;
      } else {
        this.items.push({
          id: drink.id,
          signature: signature,
          name: drink.name,
          price: drink.price,
          image_url: drink.image_url,
          qty: 1,
          modifiers: { sugar, ice },
        });
      }
    },

    removeFromCart(drinkId) {
      const index = this.items.findIndex((item) => item.id === drinkId);
      if (index !== -1) {
        this.items.splice(index, 1);
      }
    },

    increaseQty(drinkId) {
      const item = this.items.find((i) => i.id === drinkId);
      if (item) item.qty++;
    },

    decreaseQty(drinkId) {
      const item = this.items.find((i) => i.id === drinkId);
      if (item && item.qty > 1) {
        item.qty--;
      } else if (item && item.qty === 1) {
        this.removeFromCart(drinkId);
      }
    },

    clearCart() {
      this.items = [];
    },

    // --- OFFLINE SYNC LOGIC ---
    async syncOfflineOrders() {
      if (this.offlineQueue.length === 0) return;

      console.log(
        `Attempting to sync ${this.offlineQueue.length} offline orders...`
      );
      const ordersToSync = [...this.offlineQueue];

      for (const order of ordersToSync) {
        // Remove the temporary ID so Supabase generates a real one
        const { id, ...cleanPayload } = order;

        const { error } = await supabase.from("orders").insert(cleanPayload);

        if (!error) {
          // If successful, remove this specific order from the queue
          this.offlineQueue = this.offlineQueue.filter(
            (o) => o.id !== order.id
          );
        } else {
          console.error("Failed to sync order:", order.id, error.message);
        }
      }

      // Update LocalStorage with whatever is left
      localStorage.setItem("offlineOrders", JSON.stringify(this.offlineQueue));

      if (this.offlineQueue.length === 0) {
        console.log("All offline orders synced!");
      }
    },

    // --- CHECKOUT (Handles Online + Offline + Multi-Store) ---
    async checkout(tempOrder = null) {
      if (this.items.length === 0 && !tempOrder) return null;

      const userStore = useUserStore();
      if (!userStore.storeId) await userStore.fetchUserProfile();

      const payload = {
        id: tempOrder ? tempOrder.id : `OFF-${Date.now()}`,
        store_id: userStore.storeId,
        organization_id: userStore.organizationId, // 🔒 Critical
        drinks: tempOrder ? tempOrder.drinks : this.items,
        total_amount: tempOrder ? tempOrder.total : this.cartTotal,
        status: "completed",
        created_at: new Date().toISOString(),
      };

      // 3. CHECK CONNECTION
      if (!navigator.onLine) {
        console.log("Offline Mode: Saving to queue.");
        this.offlineQueue.push(payload);
        localStorage.setItem(
          "offlineOrders",
          JSON.stringify(this.offlineQueue)
        );

        if (!tempOrder) this.clearCart();
        return payload; // Return payload so Receipt prints!
      }

      // 4. TRY ONLINE INSERT
      try {
        // Remove the temporary ID so Postgres generates a real numeric ID
        const { id, ...cleanPayload } = payload;

        const { data, error } = await supabase
          .from("orders")
          .insert(cleanPayload)
          .select()
          .single();

        if (error) throw error;

        // Success!
        if (!tempOrder) this.clearCart();
        return data;
      } catch (err) {
        console.error("API Error, falling back to offline queue:", err.message);

        // Fallback: If API fails (server error/timeout), save to queue anyway
        this.offlineQueue.push(payload);
        localStorage.setItem(
          "offlineOrders",
          JSON.stringify(this.offlineQueue)
        );

        if (!tempOrder) this.clearCart();
        return payload;
      }
    },
  },
});
