<template>
  <div v-if="show" class="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50" @click.self="$emit('cancel')">
    <div class="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
      <!-- Header -->
      <div class="p-6 border-b">
        <h2 class="text-xl font-bold text-gray-900">{{ title }}</h2>
      </div>

      <!-- Content -->
      <div class="p-6">
        <p class="text-base text-gray-600" v-html="message"></p>
      </div>
      
      <!-- Footer -->
      <div class="px-6 py-4 bg-gray-50 border-t flex justify-end space-x-3">
        <button @click="$emit('cancel')" class="px-4 py-2 bg-white border border-gray-300 rounded-md hover:bg-gray-50 text-base font-medium">
          {{ cancelButtonText }}
        </button>
        <button @click="$emit('confirm')" class="px-4 py-2 rounded-md text-white text-base font-medium" :class="confirmButtonClass">
          {{ confirmButtonText }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

type ButtonVariant = 'danger' | 'primary';

const props = withDefaults(defineProps<{
  show: boolean;
  title?: string;
  message?: string;
  confirmButtonText?: string;
  cancelButtonText?: string;
  variant?: ButtonVariant;
}>(), {
  title: 'Confirm Action',
  message: 'Are you sure you want to proceed?',
  confirmButtonText: 'Confirm',
  cancelButtonText: 'Cancel',
  variant: 'primary',
});

defineEmits(['confirm', 'cancel']);

const confirmButtonClass = computed(() => {
  return {
    'danger': 'bg-red-600 hover:bg-red-700',
    'primary': 'bg-indigo-600 hover:bg-indigo-700',
  }[props.variant];
});
</script>
