<template>
  <div class="py-1">
    <div
      class="group-header flex cursor-pointer select-none items-center justify-between py-1.5 pl-1 pr-2 hover:bg-gray-50"
      @click="toggleExpand"
    >
      <div class="flex items-center text-sm text-gray-700">
        <span
          class="mr-1.5 flex items-center text-gray-500 transition-transform duration-200"
          :class="isExpanded ? 'rotate-0' : '-rotate-90'"
        >
          <Icon icon="heroicons:chevron-down" class="h-3.5 w-3.5" />
        </span>
        <TeamActivityDot
          class="mr-1.5"
          :is-active="hasActiveRuns"
          :label="$t(hasActiveRuns
            ? 'workspace.components.workspace.running.RunningTeamGroup.active_team_runs'
            : 'workspace.components.workspace.running.RunningTeamGroup.no_active_team_runs')"
        />
        <span class="font-medium">{{ definitionName }}</span>
        <span class="ml-1.5 text-xs text-gray-400">({{ runs.length }})</span>
      </div>
      <button
        class="create-btn rounded p-0.5 text-gray-400 opacity-0 transition-colors hover:bg-indigo-50 hover:text-indigo-600 group-header:hover:opacity-100"
        :title="$t('workspace.components.workspace.running.RunningTeamGroup.start_new_team_run')"
        @click.stop="$emit('create', definitionId)"
      >
        <span class="i-heroicons-plus-20-solid h-4 w-4" />
      </button>
    </div>

    <div v-if="isExpanded" class="ml-2">
      <RunningTeamRow
        v-for="teamRun in runs"
        :key="teamRun.view.getRootTeamRunId()"
        :team-run="teamRun"
        :is-selected="teamRun.view.getRootTeamRunId() === selectedRunId"
        @select="$emit('select', $event)"
        @delete="$emit('delete', $event)"
        @select-member="(teamRunId: string, agentRunId: string) => $emit('select-member', teamRunId, agentRunId)"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { Icon } from '@iconify/vue';
import TeamActivityDot from '~/components/workspace/common/TeamActivityDot.vue';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import RunningTeamRow from './RunningTeamRow.vue';

const props = defineProps<{
  definitionName: string;
  definitionId: string;
  runs: AgentTeamContext[];
  selectedRunId: string | null;
}>();

defineEmits<{
  (e: 'create', definitionId: string): void;
  (e: 'select', runId: string): void;
  (e: 'delete', runId: string): void;
  (e: 'select-member', teamRunId: string, agentRunId: string): void;
}>();

const isExpanded = ref(true);
const hasActiveRuns = computed(() => props.runs.some((run) => run.view.isRootTeamActive()));
const toggleExpand = (): void => { isExpanded.value = !isExpanded.value; };
</script>
