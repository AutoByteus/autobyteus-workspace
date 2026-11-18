<template>
  <span
    class="inline-flex flex-shrink-0 items-center"
    role="img"
    :aria-label="label"
    :title="label"
    data-test="team-aggregate-status-dot"
    :data-status="activity.kind === 'background' ? 'background' : props.status"
  >
    <StatusDot :status="activity.status" :background-tasks-running="activity.backgroundTasksRunning ?? 0" />
  </span>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import StatusDot from '~/components/workspace/common/StatusDot.vue';
import { useLocalization } from '~/composables/useLocalization';
import { agentActivityLabel, agentActivityPresentation } from '~/utils/agentActivityPresentation';
import { teamActivityOf, type TeamStatus } from '~/utils/workspaceTeamAggregateStatus';

const props = withDefaults(defineProps<{
  status: TeamStatus;
  /** The sum of the Team's own agents' running background tasks (autobyteus-448). */
  backgroundTasksRunning?: number;
}>(), {
  backgroundTasksRunning: 0,
});

const { t } = useLocalization();
const activity = computed(() => {
  const shown = teamActivityOf(props.status, props.backgroundTasksRunning);
  return { ...shown, kind: agentActivityPresentation(shown).kind };
});
const label = computed(() => agentActivityLabel(activity.value, t,
  () => t(`workspace.components.workspace.history.WorkspaceHistoryWorkspaceSection.team_status_${props.status}`)));
</script>
