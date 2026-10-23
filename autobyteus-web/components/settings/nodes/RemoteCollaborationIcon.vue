<template>
  <!-- Two nodes exchanging work: the one icon of remote collaboration (the section on "This node" and every row's switch). -->
  <svg :class="sizeClass" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    <rect x="2.5" y="2.5" width="7" height="7" rx="1.8" />
    <rect x="14.5" y="14.5" width="7" height="7" rx="1.8" />
    <path d="M9.5 6H14a4 4 0 0 1 4 4v1.6" />
    <path d="m15.6 9.8 2.4 2.4 2.4-2.4" />
    <path d="M14.5 18H10a4 4 0 0 1-4-4v-1.6" />
    <path d="m3.6 14.2 2.4-2.4 2.4 2.4" />
  </svg>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ sizeClass?: string }>(), { sizeClass: 'h-5 w-5' })
</script>
