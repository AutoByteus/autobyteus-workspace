<template>
  <button
    type="button"
    class="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-lg text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
    :disabled="disabled"
    :aria-label="$t('settings.components.settings.ProviderAPIKeyManager.toggle_key_visibility')"
    @click="emit('toggle')"
  >
    <svg
      class="h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      stroke-width="1.8"
      aria-hidden="true"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        d="M2.25 12s3.5-6 9.75-6 9.75 6 9.75 6-3.5 6-9.75 6-9.75-6-9.75-6Z"
      />
      <circle cx="12" cy="12" r="2.5" />
      <path
        v-if="showApiKey"
        stroke-linecap="round"
        d="m4 4 16 16"
      />
    </svg>
  </button>
</template>

<script setup lang="ts">
defineProps<{
  showApiKey: boolean
  disabled: boolean
}>()

const emit = defineEmits<{
  (event: 'toggle'): void
}>()
</script>
