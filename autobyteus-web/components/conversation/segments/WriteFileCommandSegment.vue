<template>
  <ToolCallIndicator
    :presentation="presentation"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { WriteFileSegment } from '~/types/segments';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import { buildToolCardPresentation } from '~/utils/toolCardPresentation';

const props = defineProps<{
  segment: WriteFileSegment;
  conversationId: string;
}>();

const presentation = computed(() => buildToolCardPresentation(props.segment));
</script>

<style scoped>
/* No styles needed, wrapper only */
</style>
