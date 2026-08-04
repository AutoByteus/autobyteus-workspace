<template>
  <div class="flex flex-col bg-gray-50 text-gray-800 h-full">
    <!-- Header -->
    <div class="p-4 flex-shrink-0 flex items-center justify-between">
      <div>
        <h3 class="text-base font-semibold text-gray-900">{{ $t('workspace.components.workspace.team.TeamMembersPanel.team_members') }}</h3>
        <p v-if="teamName" class="text-sm text-gray-500 truncate" :title="teamName">{{ teamName }}</p>
        <p class="mt-1 text-xs text-gray-500">
          {{ $t('workspace.components.workspace.team.TeamMembersPanel.roster_non_execution_note') }}
        </p>
      </div>
      <button
        @click="promptTerminateTeam"
        :disabled="!activeTeam?.isActive || isStopPending"
        class="px-4 py-2 bg-red-100 text-red-700 font-semibold text-sm rounded-md border border-red-200 shadow-sm hover:bg-red-600 hover:text-white hover:border-red-600 hover:shadow transform transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed"
        :title="$t('workspace.components.workspace.team.TeamMembersPanel.terminate_team')"
      >
        Terminate
      </button>
    </div>

    <!-- Member List -->
    <div class="flex-1 overflow-y-auto p-2 space-y-1">
      <div v-if="teamMembers.length === 0" class="text-center text-sm text-gray-500 pt-8">{{ $t('workspace.components.workspace.team.TeamMembersPanel.no_active_team_members') }}</div>
      <div
        v-for="member in teamMembers"
        :key="member.node.address"
        @click="selectMember(member.node)"
        class="p-3 rounded-lg cursor-pointer transition-colors duration-150 border"
        :style="{ marginLeft: `${member.depth * 16}px` }"
        :class="focusedExecutionAddress && sameTeamExecutionAddress(focusedExecutionAddress, executionForNode(member.node))
          ? 'bg-indigo-100 border-indigo-300 shadow-sm'
          : 'bg-white border-gray-200 hover:bg-gray-100 hover:border-gray-300'"
      >
        <div class="flex justify-between items-center">
          <div class="min-w-0">
            <p class="font-medium text-sm truncate" :title="member.node.address">
              {{ member.node.displayName || member.node.displayName }}
            </p>
            <p v-if="member.node.kind === 'agent_team'" class="mt-0.5 text-xs text-slate-500">Subteam</p>
          </div>
          <span v-if="isCoordinator(member.node.address)" class="text-xs font-bold text-yellow-800 bg-yellow-200 px-2 py-0.5 rounded-full">
            Coord
          </span>
        </div>
        <div v-if="member.node.kind === 'agent' && (member.context || member.node.currentStatus)" class="mt-2">
          <AgentStatusDisplay :status="member.context?.state.currentStatus ?? member.node.currentStatus ?? 'offline'" />
        </div>
      </div>
    </div>
    
    <!-- Delete Confirmation Dialog -->
    <AgentDeleteConfirmDialog
      :show="showTerminateConfirm"
      :item-name="teamName"
      item-type="Team Run"
      :title="$t('workspace.components.workspace.team.TeamMembersPanel.terminate_team_run')"
      :confirm-text="$t('workspace.components.workspace.team.TeamMembersPanel.terminate')"
      @confirm="onTerminateConfirmed"
      @cancel="onTerminateCanceled"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentDeleteConfirmDialog from '~/components/agents/AgentDeleteConfirmDialog.vue';
import { flattenTeamMemberNodesForDisplay } from '~/utils/teamDefinitionMembers';
import { createTeamExecutionAddress, sameTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import type { TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { contextForTeamNode } from '~/utils/teamActiveExecutionMembers';

const teamContextsStore = useAgentTeamContextsStore();
const teamRunStore = useAgentTeamRunStore();

const showTerminateConfirm = ref(false);

const teamMembers = computed(() => {
  const team = teamContextsStore.activeTeamContext;
  if (!team) {
    return [];
  }
  return flattenTeamMemberNodesForDisplay(team.rootTeam.children).map((entry) => ({
    ...entry,
    context: contextForTeamNode(team, entry.node),
  }));
});
const focusedExecutionAddress = computed(() => teamContextsStore.activeTeamContext?.focusedExecutionAddress ?? null);
const activeTeam = computed(() => teamContextsStore.activeTeamContext);
const teamName = computed(() => activeTeam.value?.config.teamDefinitionName || 'this team');
const coordinatorName = computed(() => {
  const teamDefId = activeTeam.value?.config.teamDefinitionId;
  if (!teamDefId) return null;
  return teamContextsStore.activeTeamContext?.rootTeam.coordinatorAddress || null;
});

const isStopPending = computed(() => {
  const teamRunId = activeTeam.value?.teamRunId;
  return teamRunId ? Boolean(teamRunStore.stopPendingTeamIds[teamRunId]) : false;
});

const isCoordinator = (memberAddress: string) => {
  return memberAddress === coordinatorName.value;
};

const executionForNode = (node: TeamMemberNode): TeamExecutionAddress => node.executionAddress ?? createTeamExecutionAddress({ rootTeamRunId: activeTeam.value!.teamRunId, memberAddress: node.address });

const selectMember = (node: TeamMemberNode) => {
  teamContextsStore.setFocusedExecutionAddress(executionForNode(node));
};

const promptTerminateTeam = () => {
  showTerminateConfirm.value = true;
};

const onTerminateConfirmed = () => {
  teamRunStore.terminateActiveTeam();
  showTerminateConfirm.value = false;
};

const onTerminateCanceled = () => {
  showTerminateConfirm.value = false;
};
</script>
