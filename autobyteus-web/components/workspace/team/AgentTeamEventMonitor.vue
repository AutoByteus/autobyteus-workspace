<template>
  <div class="relative flex h-full min-h-0 flex-col overflow-hidden" data-testid="agent-team-event-monitor">
    <AgentEventMonitor
      v-if="focusedMember"
      :conversation="focusedMember.state.conversation"
      :run-id="focusedAgentRunId"
      :agent-name="focusedMemberDisplayName"
      :agent-avatar-url="focusedMemberAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      :before-send="beforeSend"
      :presentation-revision="focusedMember.state.eventMonitorPresentationRevision"
      :has-earlier-active-trace-events="focusedMember.state.hasEarlierActiveTraceEvents"
      :browse-subject="focusedBrowseSubject"
      class="min-h-0 flex-1 overflow-hidden"
    >
      <template #composerContext>
        <slot name="composerContext" />
      </template>
    </AgentEventMonitor>
    <div
      v-if="showAuthoritativeTaskEmpty"
      class="pointer-events-none absolute inset-x-4 top-1/2 z-10 -translate-y-1/2 rounded-lg border border-dashed border-slate-300 bg-white/95 px-4 py-5 text-center text-sm text-slate-600 shadow-sm"
      role="status"
      data-test="team-task-authoritative-empty"
    >{{ $t('workspace.task_monitor.empty') }}</div>
    <div v-if="!focusedMember" class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 text-center text-gray-500">
      <p v-if="!activeTeam">
        {{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session') }}
      </p>
      <p v-else>
        {{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import { isTeamMemberProjectionAuthoritative } from '~/services/runHydration/teamMemberProjectionHydrationService';

const teamContextsStore = useAgentTeamContextsStore();
const activityStore = useAgentActivityStore();
const { getInterAgentSenderNameById, getMemberAvatarUrl, getMemberDisplayName } = useTeamMemberPresentation();

defineProps<{
  beforeSend?: () => void | Promise<void>;
}>();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedAgentRunId = computed(() => activeTeam.value?.view.getFocusedAgentRunId() ?? '');
const focusedMemberAddress = computed(() => activeTeam.value?.view.getFocusedMemberAddress() ?? '');
const focusedMember = computed(() => activeTeam.value?.view.getFocusedAgentContext() ?? null);
const focusedNavigationRow = computed(() => activeTeam.value?.view.getFocusedNavigationRow() ?? null);
const showAuthoritativeTaskEmpty = computed(() => {
  const team = activeTeam.value;
  const member = focusedMember.value;
  const runId = focusedAgentRunId.value;
  if (!team || !member || !runId || !focusedNavigationRow.value?.task) return false;
  return isTeamMemberProjectionAuthoritative(team, runId)
    && member.state.conversation.messages.length === 0
    && member.state.hasEarlierActiveTraceEvents !== true
    && activityStore.getActivities(runId).length === 0;
});
const focusedMemberDisplayName = computed(() =>
  getMemberDisplayName(focusedMemberAddress.value, focusedMember.value));
const focusedMemberAvatarUrl = computed(() => {
  if (!focusedMember.value) return null;
  return getMemberAvatarUrl(focusedMemberAddress.value, focusedMember.value) || null;
});
const interAgentSenderNameById = computed<Record<string, string>>(() =>
  getInterAgentSenderNameById(activeTeam.value));
const focusedBrowseSubject = computed(() => ({
  kind: 'teamMember' as const,
  teamRunId: activeTeam.value?.view.getRootTeamRunId() ?? '',
  memberAddress: focusedMemberAddress.value,
  agentRunId: focusedAgentRunId.value,
}));
</script>
