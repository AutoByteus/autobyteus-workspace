<template>
  <ToolActivityItem
    v-if="dispatchKind === 'tool' && activity.kind === 'tool'"
    :activity="activity"
    :is-highlighted="isHighlighted"
  />
  <CompactionActivityItem
    v-else-if="dispatchKind === 'compaction' && activity.kind === 'compaction'"
    :activity="activity"
    :is-highlighted="isHighlighted"
  />
  <SystemInstructionActivityItem
    v-else-if="dispatchKind === 'system_instruction' && activity.kind === 'system_instruction'"
    :activity="activity"
    :runtime-kind="runtimeKind"
    :is-highlighted="isHighlighted"
  />
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { RunActivity } from '~/types/activity/RunActivity';
import { getRunActivityDispatchKind } from '~/services/activity/runActivityPresentation';
import ToolActivityItem from './ToolActivityItem.vue';
import CompactionActivityItem from './CompactionActivityItem.vue';
import SystemInstructionActivityItem from './SystemInstructionActivityItem.vue';

const props = defineProps<{
  activity: RunActivity;
  runtimeKind?: string | null;
  isHighlighted?: boolean;
}>();

const dispatchKind = computed(() => getRunActivityDispatchKind(props.activity));
</script>
