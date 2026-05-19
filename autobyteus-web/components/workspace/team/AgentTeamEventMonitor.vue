<template>
  <div class="h-full">
    <AgentEventMonitor
      v-if="conversationOfFocusedMember"
      :conversation="conversationOfFocusedMember"
      :compaction-status="focusedMember?.state.compactionStatus ?? null"
      :agent-name="focusedMemberDisplayName"
      :agent-avatar-url="focusedMemberAvatarUrl"
      :inter-agent-sender-name-by-id="interAgentSenderNameById"
      class="h-full"
    >
      <template #composerContext>
        <slot name="composerContext" />
      </template>
    </AgentEventMonitor>
    <div
      v-else-if="focusedMemberNode?.memberKind === 'agent_team'"
      class="h-full overflow-y-auto p-6"
    >
      <div class="rounded-xl border border-slate-200 bg-slate-50 p-5">
        <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">
          {{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.focused_subteam') }}
        </p>
        <h3 class="mt-1 text-lg font-semibold text-slate-900">{{ focusedMemberNode.displayName }}</h3>
        <p class="mt-1 text-sm text-slate-500">{{ focusedMemberNode.memberRouteKey }}</p>
        <div class="mt-4 grid gap-3 md:grid-cols-2">
          <button
            v-for="child in focusedMemberNode.children"
            :key="child.memberRouteKey"
            type="button"
            class="rounded-lg border border-slate-200 bg-white p-3 text-left transition hover:border-indigo-200 hover:bg-indigo-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"
            @click="focusMemberRouteKey(child.memberRouteKey)"
          >
            <p class="truncate text-sm font-medium text-slate-900">{{ child.displayName || child.memberName }}</p>
            <p class="mt-0.5 truncate text-xs text-slate-500">{{ child.memberRouteKey }}</p>
          </button>
        </div>
      </div>
    </div>
    <div v-else class="p-8 text-center text-gray-500 h-full flex items-center justify-center">
      <div v-if="!activeTeam">
        <p>{{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.no_active_team_session') }}</p>
      </div>
      <div v-else-if="!focusedMember">
         <p>{{ $t('workspace.components.workspace.team.AgentTeamEventMonitor.select_a_team_member_from_the') }}</p>
      </div>
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

const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const focusedMember = computed(() => teamContextsStore.focusedMemberContext);
const focusedMemberNode = computed(() => teamContextsStore.focusedMemberNode);
const conversationOfFocusedMember = computed(() => focusedMember.value?.state.conversation);

const focusedMemberDisplayName = computed(() => {
  const team = activeTeam.value;
  if (!team?.focusedMemberRouteKey) {
    return '';
  }
  return focusedMemberNode.value?.displayName
    || getMemberDisplayName(team.focusedMemberRouteKey, focusedMember.value);
});

const focusedMemberAvatarUrl = computed(() => {
  const team = activeTeam.value;
  if (!team?.focusedMemberRouteKey || !focusedMember.value) {
    return null;
  }
  return getMemberAvatarUrl(team.focusedMemberRouteKey, focusedMember.value) || null;
});

const interAgentSenderNameById = computed<Record<string, string>>(() => {
  return getInterAgentSenderNameById(activeTeam.value);
});

const focusMemberRouteKey = (memberRouteKey: string) => {
  const teamRunId = activeTeam.value?.teamRunId;
  if (!teamRunId) {
    return;
  }
  void teamContextsStore.focusMemberAndEnsureHydrated?.(teamRunId, memberRouteKey);
};
</script>
