<template>
  <div class="fixed top-5 right-5 z-[100] w-full max-w-sm">
    <transition-group name="toast" tag="div" class="space-y-3">
      <div 
        v-for="toast in toasts" 
        :key="toast.id"
        class="p-4 rounded-md shadow-lg text-white text-sm font-medium flex items-start justify-between w-full"
        :class="toastClasses[toast.type]"
      >
        <div class="flex items-center">
          <span :class="toast.type === 'success' ? 'i-heroicons-check-circle-20-solid' : toast.type === 'error' ? 'i-heroicons-x-circle-20-solid' : 'i-heroicons-information-circle-20-solid'" class="w-5 h-5 mr-3 flex-shrink-0"></span>
          <span>{{ toast.message }}</span>
        </div>
        <button @click="removeToast(toast.id)" class="ml-4 -mr-1 p-1 rounded-full hover:bg-white/20">
            <span class="i-heroicons-x-mark-20-solid w-5 h-5"></span>
        </button>
      </div>
    </transition-group>
  </div>
</template>

<script setup lang="ts">
import { useToasts, type Toast } from '~/composables/useToasts';

const { toasts, removeToast } = useToasts();

const toastClasses = {
  success: 'bg-green-500',
  error: 'bg-red-500',
  info: 'bg-blue-500',
};
</script>

<style scoped>
.toast-enter-active,
.toast-leave-active {
  transition: all 0.5s ease;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
