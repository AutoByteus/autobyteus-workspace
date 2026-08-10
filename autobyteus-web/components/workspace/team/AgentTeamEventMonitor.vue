<template>
  <div class="flex h-full min-h-0 flex-col overflow-hidden" data-testid="agent-team-event-monitor">
    <AgentEventMonitor
      v-if="conversationOfFocusedMember"
      :conversation="conversationOfFocusedMember"
      :run-id="focusedMember?.state.runId"
      :agent-name="focusedMemberDisplayName"
      :agent-avatar-url="focusedMemberAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      :before-send="beforeSend"
      :presentation-revision="focusedMember?.state.eventMonitorPresentationRevision"
      :has-earlier-active-trace-events="focusedMember?.state.hasEarlierActiveTraceEvents"
      :browse-subject="focusedBrowseSubject"
      class="min-h-0 flex-1 overflow-hidden"
    >
      <template #composerContext>
        <slot name="composerContext" />
      </template>
    </AgentEventMonitor>
    <div
      v-else-if="focusedMemberNode?.kind === 'agent_team'"
      class="min-h-0 flex-1 overflow-y-auto p-6"
    >
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam') }}
        </p>
        <h3 class="mt-1 text-lg font-semibold text-slate-900">{{ focusedMemberNode.displayName }}</h3>
        <p class="mt-1 text-sm text-slate-500">{{ focusedMemberNode.address }}</p>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <button
            v-for="child in focusedMemberNode.children"
            :key="serializeTeamExecutionAddress(executionForNode(child))"
            type="button"
            class="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="focusMember(child)"
          >
            <p class="truncate text-sm font-medium text-slate-900">{{ child.displayName }}</p>
            <p class="mt-0.5 truncate text-xs text-slate-500">{{ child.address }}</p>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="flex min-h-0 flex-1 items-center justify-center overflow-y-auto p-8 text-center text-gray-500">
      <div v-if="!activeTeam">
        <p>{{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session') }}</p>
      </div>
      <div v-else-if="!focusedMember">
         <p>{{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the') }}</p>
      </div>
      <div v-else>
        <p>{{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.no_activity_yet') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import { shouldShowMemberConversation } from '~/utils/teamActiveExecutionMembers';
import { serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { findTeamExecutionNode, executionAddressForTeamNode } from '~/services/agentStreaming/teamTaskExecutionTree';
import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';

const teamContextsStore = useAgentTeamContextsStore();
const { getInterAgentSenderNameById, getMemberAvatarUrl, getMemberDisplayName } = useTeamMemberPresentation();

defineProps<{
  beforeSend?: () => void | Promise<void>;
}>();

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedExecutionAddress = computed(() => activeTeam.value?.focusedExecutionAddress ?? null);
const focusedMember = computed(() => {
  const team = activeTeam.value;
  const address = focusedExecutionAddress.value;
  return team && address
    ? team.agentExecutionsByKey.get(serializeTeamExecutionAddress(address)) ?? null
    : null;
});
const focusedMemberNode = computed(() => {
  const team = activeTeam.value;
  return team ? findTeamExecutionNode(team, team.focusedExecutionAddress) : null;
});
const conversationOfFocusedMember = computed(() => (
  shouldShowMemberConversation(focusedMemberNode.value, focusedMember.value)
    ? focusedMember.value?.state.conversation
    : null
));

const focusedMemberDisplayName = computed(() => {
  const routeKey = focusedExecutionAddress.value?.memberAddress ?? '';
  if (!routeKey) {
    return '';
  }
  return focusedMemberNode.value?.displayName
    || getMemberDisplayName(routeKey, focusedMember.value);
});

const focusedMemberAvatarUrl = computed(() => {
  const routeKey = focusedExecutionAddress.value?.memberAddress ?? '';
  if (!routeKey || !focusedMember.value) {
    return null;
  }
  return getMemberAvatarUrl(routeKey, focusedMember.value) || null;
});

const interAgentSenderNameById = computed<Record<string, string>>(() => {
  return getInterAgentSenderNameById(activeTeam.value);
});

const focusedBrowseSubject = computed(() => ({
  kind: 'teamMember' as const,
  teamRunId: activeTeam.value?.teamRunId || '',
  memberAddress: focusedExecutionAddress.value?.memberAddress ?? '',
  agentRunId: focusedMember.value?.state.runId || '',
}));

const executionForNode = (node: TeamMemberNode) => executionAddressForTeamNode(activeTeam.value!, node);

const focusMember = (child: TeamMemberNode) => {
  const team = activeTeam.value;
  if (!team || focusedMemberNode.value?.kind !== 'agent_team' || !focusedMemberNode.value.children.includes(child)) return;
  teamContextsStore.setFocusedExecutionAddress(executionAddressForTeamNode(team, child));
};
</script>
