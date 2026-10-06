<template>
  <!-- REQ-020: opens the right tools on a start surface (New chat, the Org launch page); the same
       icon, in the same corner, as the panel's own close button. -->
  <button
    type="button"
    class="absolute right-3 top-2.5 z-10 rounded-md p-1.5 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500/40"
    :title="$t('shell.startTools.show')"
    :aria-label="$t('shell.startTools.show')"
    data-test="start-surface-tools-toggle"
    @click="emit('open')"
  >
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M15 3v18" />
    </svg>
  </button>
</template>

<script setup lang="ts">
const emit = defineEmits<{ (event: 'open'): void }>()
</script>
