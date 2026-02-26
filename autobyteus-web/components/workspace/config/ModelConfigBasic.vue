<template>
  <div class="flex items-center justify-between gap-4 py-2">
    <div>
      <label :class="labelClass">{{ label }}</label>
      <p v-if="description" :class="descriptionClass">{{ description }}</p>
    </div>
    <div class="flex items-center">
      <button 
        type="button" 
        class="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        :class="enabled ? 'bg-blue-600' : 'bg-gray-200'"
        @click="emitEnabled(!enabled)"
        :disabled="disabled"
      >
        <span class="sr-only">Use setting</span>
        <span 
          aria-hidden="true" 
          class="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out"
          :class="enabled ? 'translate-x-5' : 'translate-x-0'"
        />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = defineProps<{
  enabled: boolean;
  disabled?: boolean;
  label?: string;
  description?: string;
  compact?: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:enabled', value: boolean): void;
}>();

const labelClass = computed(() =>
  props.compact
    ? 'block text-sm text-gray-900' // Increased size slightly for better readability
    : 'block text-base text-gray-900'
);

const descriptionClass = computed(() =>
  props.compact
    ? 'text-[10px] text-gray-500'
    : 'text-xs text-gray-500'
);

const emitEnabled = (value: boolean) => {
  if (props.disabled) return;
  emit('update:enabled', value);
};
</script>
