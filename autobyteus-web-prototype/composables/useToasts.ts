import { ref, readonly } from 'vue';

export type ToastType = 'success' | 'error' | 'info';

export interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

const toasts = ref<Toast[]>([]);

let toastCounter = 0;

export function useToasts() {
  const addToast = (message: string, type: ToastType = 'info', duration: number = 4000) => {
    const id = toastCounter++;
    toasts.value.push({ id, message, type });

    setTimeout(() => {
      removeToast(id);
    }, duration);
  };

  const removeToast = (id: number) => {
    toasts.value = toasts.value.filter(toast => toast.id !== id);
  };

  return {
    toasts: readonly(toasts),
    addToast,
    removeToast,
  };
}
