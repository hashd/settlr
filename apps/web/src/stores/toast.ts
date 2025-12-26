import { defineStore } from "pinia";
import { ref } from "vue";

export type ToastType = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

export const useToastStore = defineStore("toast", () => {
  const toasts = ref<Toast[]>([]);

  function addToast(
    message: string,
    type: ToastType = "info",
    duration = 3000
  ) {
    const id = Math.random().toString(36).substring(2, 9);
    toasts.value.push({ id, message, type, duration });

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }

  function removeToast(id: string) {
    const index = toasts.value.findIndex((t) => t.id === id);
    if (index !== -1) {
      toasts.value.splice(index, 1);
    }
  }

  function success(message: string, duration = 3000) {
    addToast(message, "success", duration);
  }

  function error(message: string, duration = 4000) {
    addToast(message, "error", duration);
  }

  function info(message: string, duration = 3000) {
    addToast(message, "info", duration);
  }

  return {
    toasts,
    addToast,
    removeToast,
    success,
    error,
    info,
  };
});
