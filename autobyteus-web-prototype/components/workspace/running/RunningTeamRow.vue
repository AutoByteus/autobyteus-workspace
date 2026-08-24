<template>
  <div>
    <div
      class="group flex cursor-pointer items-center justify-between rounded py-1.5 pl-2 pr-2 transition-colors"
      :class="isSelected ? 'bg-indigo-50 text-indigo-900' : 'text-gray-600 hover:bg-gray-50'"
      @click="handleTeamClick"
    >
      <div class="flex min-w-0 items-center space-x-1.5">
        <span
          class="flex items-center text-gray-400 transition-transform duration-200"
          :class="expanded ? 'rotate-90' : ''"
        >
          <span class="i-heroicons-chevron-right-20-solid h-3 w-3" />
        </span>
        <TeamActivityDot
          :is-active="teamRun.view.isRootTeamActive()"
          :label="$t(teamRun.view.isRootTeamActive()
            ? 'workspace.components.workspace.running.RunningTeamRow.active_team_run'
            : 'workspace.components.workspace.running.RunningTeamRow.inactive_team_run')"
        />
        <span class="truncate text-sm text-gray-700">
          {{ formatId(teamRun.view.getRootTeamRunId()) }}
        </span>
      </div>
      <button
        class="delete-btn inline-flex h-6 w-6 items-center justify-center rounded-md text-gray-500 transition-colors hover:bg-red-50 hover:text-red-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
        :title="$t('workspace.components.workspace.running.RunningTeamRow.stop_and_remove_team')"
        :aria-label="$t('workspace.components.workspace.running.RunningTeamRow.close_team_run')"
        @click.stop="$emit('delete', teamRun.view.getRootTeamRunId())"
      >
        <span class="text-sm font-semibold leading-none" aria-hidden="true">×</span>
      </button>
    </div>

    <div v-if="expanded" class="ml-5 mt-0.5">
      <TeamMemberRow
        v-for="member in displayMembers"
        :key="member.agentRunId"
        :member-name="member.displayName"
        :member-address="member.address"
        :member-context="member.context"
        :member-status="member.currentStatus"
        :style="{ marginLeft: `${Math.max(0, member.depth - 1) * 12}px` }"
        :is-focused="focusedAgentRunId === member.agentRunId"
        :is-coordinator="member.coordinator"
        @select="handleMemberSelect(member.agentRunId)"
      />
      <div v-if="displayMembers.length === 0" class="px-2 py-1 text-xs text-gray-400">
        {{ $t('workspace.components.workspace.running.RunningTeamRow.no_members_yet') }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import TeamActivityDot from '~/components/workspace/common/TeamActivityDot.vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import TeamMemberRow from './TeamMemberRow.vue';

const props = defineProps<{
  teamRun: AgentTeamContext;
  isSelected?: boolean;
}>();

const emit = defineEmits<{
  (e: 'select', id: string): void;
  (e: 'delete', id: string): void;
  (e: 'select-member', teamRunId: string, agentRunId: string): void;
}>();

const expanded = ref(false);

watch(() => props.isSelected, (selected) => {
  if (selected) expanded.value = true;
}, { immediate: true });

const displayMembers = computed(() => props.teamRun.view.listNavigationRows()
  .filter((row) => row.focusable && row.agentRunId)
  .map((row) => ({
    ...row,
    agentRunId: row.agentRunId!,
    context: props.teamRun.view.getAgentContext(row.agentRunId!),
  })));

const focusedAgentRunId = computed(() => props.teamRun.view.getFocusedAgentRunId());

const handleTeamClick = (): void => {
  expanded.value = !expanded.value;
  emit('select', props.teamRun.view.getRootTeamRunId());
};

const handleMemberSelect = (agentRunId: string): void => {
  emit('select-member', props.teamRun.view.getRootTeamRunId(), agentRunId);
};

const formatId = (id: string): string => id.substring(0, 8);
</script>
