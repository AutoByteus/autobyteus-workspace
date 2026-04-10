<template>
  <slot v-if="isReadyForProductUi" />
  <div
    v-else
    aria-hidden="true"
    class="flex min-h-screen w-full items-center justify-center bg-slate-50"
    data-testid="app-localization-gate"
  >
    <div class="h-10 w-10 animate-pulse rounded-full bg-slate-200" />
  </div>
</template>

<script setup lang="ts">
const { isReadyForProductUi } = useLocalization();
</script>
