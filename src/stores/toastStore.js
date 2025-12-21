import { defineStore } from "pinia";
import { ref } from "vue";

export const useToastStore = defineStore("toast", () => {
  const toasts = ref([]);

  const addToast = (message, type = "success") => {
    const id = Date.now();
    toasts.value.push({ id, message, type });
    // Auto remove after 3 seconds
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id);
    }, 3000);
  };

  const removeToast = (id) => {
    toasts.value = toasts.value.filter((t) => t.id !== id);
  };

  return { toasts, addToast, removeToast };
});
