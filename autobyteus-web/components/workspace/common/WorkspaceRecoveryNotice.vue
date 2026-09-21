<template>
  <div role="alert" class="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900 sm:mx-4">
    <span>{{ message }}</span>
  </div>
</template>

<script setup lang="ts">
defineProps<{ message: string }>()
</script>
