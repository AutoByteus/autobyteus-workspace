<template>
  <span class="inline-flex flex-shrink-0 items-center justify-center" aria-hidden="true">
    <Icon icon="svg-spinners:ring-resize" class="h-full w-full motion-reduce:hidden" />
    <!-- Reduced motion: the spinner's SVG animation cannot be paused by CSS, so a still ring stands in. -->
    <span class="hidden h-3/4 w-3/4 rounded-full border-2 border-current motion-reduce:block" data-test="memory-spinner-still" />
  </span>
</template>

<script setup lang="ts">
import { Icon } from '@iconify/vue';
</script>
