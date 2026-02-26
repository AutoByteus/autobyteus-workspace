<template>
  <div class="p-4">
    <strong>Agent:</strong>
    <div>
      <template v-for="(segment, segmentIndex) in message.segments" :key="segmentIndex">
        <TextSegment
          v-if="segment.type === 'text'"
          :content="segment.content"
        />
        <!-- Other segments are intentionally ignored as per requirement -->
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { AIMessage } from '~/types/conversation';
import TextSegment from '~/components/conversation/segments/TextSegment.vue';

defineProps<{
  message: AIMessage;
}>();
</script>
