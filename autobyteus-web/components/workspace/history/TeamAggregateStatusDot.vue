<template>
  <span
    class="inline-flex flex-shrink-0 items-center"
    role="img"
    :aria-label="$t(statusLabelKey)"
    :title="$t(statusLabelKey)"
    data-test="team-aggregate-status-dot"
    :data-status="props.status"
  >
    <StatusDot :status="props.status" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import type { TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

const props = defineProps<{
  status: TeamStatus;
}>();

const statusLabelKey = computed(() => (
  `workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_${props.status}`
));
</script>
