<template>
  <div
    v-if="status"
    class="rounded-xl border px-4 py-3 text-sm"
    :class="bannerClass"
    data-testid="compaction-status-banner"
  >
    <div class="font-medium">{{ status.message }}</div>
    <div v-if="status.turnId" class="mt-1 text-xs opacity-80">Turn: {{ status.turnId }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { AgentCompactionStatus } from '~/types/agent/AgentRunState';

const props = defineProps<{
  status: AgentCompactionStatus | null;
}>();

const bannerClass = computed(() => {
  switch (props.status?.phase) {
    case 'failed':
      return 'border-red-200 bg-red-50 text-red-800';
    case 'completed':
      return 'border-emerald-200 bg-emerald-50 text-emerald-800';
    case 'started':
      return 'border-blue-200 bg-blue-50 text-blue-800';
    case 'requested':
    default:
      return 'border-amber-200 bg-amber-50 text-amber-800';
  }
});
</script>
