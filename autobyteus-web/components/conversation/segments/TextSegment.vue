<template>
  <div class="mb-4">
    <MarkdownRenderer :content="content" />
  </div>
</template>

<script setup lang="ts">
import MarkdownRenderer from '~/components/conversation/segments/renderer/MarkdownRenderer.vue';

defineProps<{
  content: string;
}>();
</script>