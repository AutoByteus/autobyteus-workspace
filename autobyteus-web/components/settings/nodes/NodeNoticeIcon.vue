<template>
  <svg class="h-4 w-4 flex-shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <template v-if="tone === 'warn'"><path d="M10 3.4 17.6 16.6H2.4L10 3.4Z" /><path d="M10 8.4v3.6M10 14.4h.01" /></template>
    <template v-else>
      <circle cx="10" cy="10" r="7.4" />
      <path v-if="tone === 'error'" d="m7.6 7.6 4.8 4.8m0-4.8-4.8 4.8" />
      <path v-else-if="tone === 'ok'" d="m6.9 10.2 2.2 2.2 4-4.4" />
      <path v-else d="M10 9.2v4.2M10 6.6h.01" />
    </template>
  </svg>
</template>

<script setup lang="ts">
/** One 16 px mark per notice tone (info, warn, error, ok); decorative: the words carry the meaning. */
defineProps<{ tone: 'info' | 'warn' | 'error' | 'ok' }>()
</script>
