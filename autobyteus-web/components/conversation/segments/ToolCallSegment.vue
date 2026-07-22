<template>
  <ToolCallIndicator
    :presentation="presentation"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ToolCallSegment } from '~/types/segments';
import ToolCallIndicator from '~/components/conversation/ToolCallIndicator.vue';
import { buildToolCardPresentation } from '~/utils/toolCardPresentation';

const props = defineProps<{
  segment: ToolCallSegment;
  conversationId: string; // This is the runId
}>();

const presentation = computed(() => buildToolCardPresentation(props.segment));
</script>

<style scoped>
/* No style needed, wrapper only */
</style>
