import { defineStore } from "pinia";
import { supabase } from "../services/supabase";

export const useCartStore = defineStore("cart", {
  // 1. STATE
  state: () => ({
    items: [], // [{ id, name, price, qty, modifiers }]
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
  },

  // 3. ACTIONS
  actions: {
    addToCart(drink) {
      // Create a unique "Signature" for comparison
      // Example: "123-Normal-Less Ice"
      const sugar = drink.modifiers?.sugar || "Normal";
      const ice = drink.modifiers?.ice || "Normal";
      const signature = `${drink.id}-${sugar}-${ice}`;

      // Find item with same signature
      const existingItem = this.items.find(
        (item) => item.signature === signature
      );

      if (existingItem) {
        existingItem.qty++;
      } else {
        this.items.push({
          id: drink.id,
          signature: signature, // Store signature
          name: drink.name,
          price: drink.price,
          qty: 1,
          modifiers: { sugar, ice }, // Save modifiers to display later
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

    // --- CHECKOUT ACTION (Updated for Printing) ---
    async checkout() {
      if (this.items.length === 0) return null;

      try {
        // 1. Prepare data
        const orderData = {
          drinks: this.items,
          total: this.cartTotal,
          status: "completed", // Mark as done immediately for simple POS
        };

        // 2. Send to Supabase AND return the created row (.select())
        const { data, error } = await supabase
          .from("orders")
          .insert(orderData)
          .select(); // <--- CRITICAL: asks DB to send back the new row

        if (error) throw error;

        // 3. Clear the cart
        this.clearCart();

        // 4. Return the Order Object (contains ID and Date) for the printer
        return data[0];
      } catch (err) {
        console.error("Checkout failed:", err.message);
        alert("Transaction failed: " + err.message);
        return null;
      }
    },
  },
});
