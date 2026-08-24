<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden" data-testid="agent-team-event-monitor">
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
    <div v-else class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 text-center text-gray-500">
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

const teamContextsStore = useAgentTeamContextsStore();
const { getInterAgentSenderNameById, getMemberAvatarUrl, getMemberDisplayName } = useTeamMemberPresentation();

defineProps<{
  beforeSend?: () => void | Promise<void>;
}>();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedAgentRunId = computed(() => activeTeam.value?.view.getFocusedAgentRunId() ?? '');
const focusedMemberAddress = computed(() => activeTeam.value?.view.getFocusedMemberAddress() ?? '');
const focusedMember = computed(() => activeTeam.value?.view.getFocusedAgentContext() ?? null);
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
