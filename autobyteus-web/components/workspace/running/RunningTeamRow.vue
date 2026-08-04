<template>
  <div>
    <!-- Team Run Header -->
    <div 
      class="flex items-center justify-between py-1.5 pl-2 pr-2 rounded cursor-pointer group transition-colors"
      :class="isSelected 
        ? 'bg-indigo-50 text-indigo-900' 
        : 'hover:bg-gray-50 text-gray-600'"
      @click="handleTeamClick"
    >
      <div class="flex items-center space-x-1.5 min-w-0">
        <!-- Expand/Collapse Chevron -->
        <span 
          class="transition-transform duration-200 flex items-center text-gray-400"
          :class="expanded ? 'rotate-90' : ''"
        >
          <span class="i-heroicons-chevron-right-20-solid w-3 h-3"></span>
        </span>

        <TeamActivityDot
          :is-active="teamRun.isActive"
          :label="$t(teamRun.isActive
            ? 'workspace.components.workspace.running.RunningTeamRow.active_team_run'
            : 'workspace.components.workspace.running.RunningTeamRow.inactive_team_run')"
        />

        <!-- ID -->
        <span class="text-sm text-gray-700 truncate">
          {{ formatId(teamRun.teamRunId) }}
        </span>
      </div>

      <!-- Delete Button -->
      <button
        @click.stop="$emit('delete', teamRun.teamRunId)"
        class="delete-btn inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 hover:text-red-600 hover:bg-red-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 transition-colors"
        :title="$t('workspace.components.workspace.running.RunningTeamRow.stop_and_remove_team')"
        :aria-label="$t('workspace.components.workspace.running.RunningTeamRow.close_team_run')"
      >
        <span class="text-sm leading-none font-semibold" aria-hidden="true">×</span>
      </button>
    </div>

    <!-- Member List (when expanded) -->
    <div v-if="expanded" class="ml-5 mt-0.5">
      <TeamMemberRow
        v-for="member in displayMembers"
        :key="member.node.address"
        :member-name="member.node.displayName"
        :member-address="member.node.address"
        :member-context="member.context"
        :member-status="member.node.kind === 'agent' ? member.node.currentStatus : null"
        :style="{ marginLeft: `${member.depth * 12}px` }"
        :is-focused="sameTeamExecutionAddress(activeExecutionFocusedMemberAddress, executionForNode(member.node))"
        :is-coordinator="member.node.address === coordinatorAddress"
        @select="() => handleMemberSelect(member.node)"
      />
      <div v-if="displayMembers.length === 0" class="text-xs text-gray-400 py-1 px-2">{{ $t('workspace.components.workspace.running.RunningTeamRow.no_members_yet') }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import TeamActivityDot from '~/components/workspace/common/TeamActivityDot.vue';
import type { AgentTeamContext, TeamMemberNode } from '~/types/agent/AgentTeamContext';
import { createTeamExecutionAddress, sameTeamExecutionAddress, serializeTeamExecutionAddress, type TeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import TeamMemberRow from './TeamMemberRow.vue';
import {
  flattenActiveExecutionMemberNodesForDisplay,
  resolveActiveExecutionFocus,
} from '~/utils/teamActiveExecutionMembers';

const props = defineProps<{
  teamRun: AgentTeamContext;
  isSelected?: boolean;
  coordinatorAddress?: string;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'select-member', teamRunId: string, executionAddress: TeamExecutionAddress): void;
}>();

const expanded = ref(false);

// Auto-expand when team becomes selected
watch(() => props.isSelected, (selected) => {
  if (selected) {
    expanded.value = true;
    // Auto-focus coordinator if no member is focused
    if (!props.teamRun.focusedExecutionAddress && props.coordinatorAddress) {
      emit('select-member', props.teamRun.teamRunId, createTeamExecutionAddress({ rootTeamRunId: props.teamRun.teamRunId, memberAddress: props.coordinatorAddress }));
    }
  }
}, { immediate: true });

const displayMembers = computed(() =>
  flattenActiveExecutionMemberNodesForDisplay(props.teamRun).map((entry) => ({
    ...entry,
    context: props.teamRun.agentExecutionsByKey.get(serializeTeamExecutionAddress(executionForNode(entry.node))) || null,
  })),
);

const activeExecutionFocusedMemberAddress = computed(() =>
  resolveActiveExecutionFocus(props.teamRun),
);

const handleTeamClick = () => {
  // Toggle expand/collapse
  expanded.value = !expanded.value;
  // Also select the team
  emit('select', props.teamRun.teamRunId);
};

const executionForNode = (node: TeamMemberNode): TeamExecutionAddress => node.executionAddress ?? createTeamExecutionAddress({ rootTeamRunId: props.teamRun.teamRunId, memberAddress: node.address });

const handleMemberSelect = (node: TeamMemberNode) => {
  emit('select-member', props.teamRun.teamRunId, executionForNode(node));
};

const formatId = (id: string) => {
  if (id.startsWith('temp-')) return id;
  return id.substring(0, 8); 
};

</script>
