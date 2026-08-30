<template>
  <span
    class="inline-flex flex-shrink-0 items-center"
    role="img"
    :aria-label="$t(statusLabelKey)"
    :title="$t(statusLabelKey)"
    data-test="nested-team-aggregate-status-dot"
    :data-status="props.status"
  >
    <StatusDot :status="props.status" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { AgentStatus } from '~/types/agent/AgentStatus';

const props = defineProps<{
  status: AgentStatus;
}>();

const statusLabelKey = computed(() => (
  `workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.nested_team_status_${props.status}`
));
</script>
