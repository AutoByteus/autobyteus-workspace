<template>
  <!-- A small segmented control (the pattern of Token Statistics' Tokens / Cost). -->
  <div class="flex flex-shrink-0 rounded-lg bg-slate-100 p-0.5" role="radiogroup" :aria-label="label">
    <button
      v-for="option in options"
      :key="option.value"
      type="button"
      role="radio"
      :aria-checked="modelValue === option.value"
      class="whitespace-nowrap rounded-md px-3 py-1 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      :class="modelValue === option.value ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'"
      :data-testid="`${testid}-${option.value || 'all'}`"
      @click="emit('update:modelValue', option.value)"
    >{{ option.label }}</button>
  </div>
</template>

<script setup lang="ts">
defineProps<{ modelValue: string; options: ReadonlyArray<{ value: string; label: string }>; label: string; testid: string }>()
const emit = defineEmits<{ (event: 'update:modelValue', value: string): void }>()
</script>
