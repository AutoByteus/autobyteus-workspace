<template>
  <div class="h-full overflow-auto bg-white p-4">
    <MarkdownRenderer :content="content" />
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue'

defineProps<{
  content: string
  path?: string
}>()
</script>

<style scoped>
.h-full {
  height: 100%;
}
</style>
