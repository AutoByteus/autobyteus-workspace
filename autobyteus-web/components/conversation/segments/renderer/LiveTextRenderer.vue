<template>
  <div
    class="live-text-renderer whitespace-pre-wrap break-words [overflow-wrap:anywhere]"
    data-testid="live-text-renderer"
  >{{ content }}</div>
</template>

<script setup lang="ts">
defineProps<{
  content: string;
}>();
</script>

<style scoped>
.live-text-renderer {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
}
</style>
