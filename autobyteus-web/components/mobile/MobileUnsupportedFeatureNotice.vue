<template>
  <div class="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900" data-testid="mobile-unsupported-feature">
    <p class="font-semibold">Unsupported on phone</p>
    <p class="mt-1">{{ message }}</p>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  message: string;
}>();
</script>
