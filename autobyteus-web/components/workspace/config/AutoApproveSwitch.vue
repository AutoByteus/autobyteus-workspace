<template>
  <button
    :id="id"
    type="button"
    role="switch"
    :aria-checked="checked"
    :disabled="disabled"
    class="relative inline-flex h-6 w-11 flex-shrink-0 rounded-full border-2 border-transparent transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    :class="checked ? 'bg-blue-600' : 'bg-gray-200'"
    @click="emit('toggle', !checked)"
  >
    <span class="sr-only">{{ label }}</span>
    <span aria-hidden="true" class="inline-block h-5 w-5 rounded-full bg-white shadow transition" :class="checked ? 'translate-x-5' : 'translate-x-0'" />
  </button>
</template>

<script setup lang="ts">
defineProps<{
  id: string
  checked: boolean
  disabled: boolean
  label: string
}>()
const emit = defineEmits<{ (e: 'toggle', checked: boolean): void }>()
</script>
