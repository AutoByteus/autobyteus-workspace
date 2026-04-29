<template>
  <div class="flex flex-col h-full bg-white">
    <div class="flex-1 overflow-y-auto border-t border-gray-200">
      <div v-if="agentGroups.length === 0 && teamGroups.length === 0" class="p-6 text-center text-sm text-gray-500">{{ $t('workspace.components.workspace.running.RunningAgentsPanel.no_agents_or_teams_running') }}</div>

      <div v-if="agentGroups.length > 0">
        <div>
          <RunningAgentGroup
            v-for="group in agentGroups"
            :key="group.definitionId"
            :definition-id="group.definitionId"
            :definition-name="group.definitionName"
            :runs="group.runs"
            :selected-run-id="selectedAgentRunId"
            @create="createAgentRun"
            @select="selectAgentRun"
            @delete="deleteAgentRun"
          />
        </div>
      </div>

      <div v-if="teamGroups.length > 0">
        <div v-if="agentGroups.length > 0" class="mx-3 border-t border-gray-100"></div>
        <div>
          <RunningTeamGroup
            v-for="group in teamGroups"
            :key="group.definitionId"
            :definition-id="group.definitionId"
            :definition-name="group.definitionName"
            :runs="group.runs"
            :selected-run-id="selectedTeamRunId"
            :coordinator-name="getCoordinatorName(group.definitionId)"
            @create="createTeamRun"
            @select="selectTeamRun"
            @delete="deleteTeamRun"
            @select-member="selectTeamMember"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunStore } from '~/stores/agentRunStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { buildEditableAgentRunSeed, buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import type { AgentContext } from '~/types/agent/AgentContext';
import type { AgentTeamContext } from '~/types/agent/AgentTeamContext';
import RunningAgentGroup from './RunningAgentGroup.vue';
import RunningTeamGroup from './RunningTeamGroup.vue';

const emit = defineEmits<{
  (e: 'run-selected', payload: { type: 'agent' | 'team'; runId: string }): void;
  (e: 'run-created', payload: { type: 'agent' | 'team'; definitionId: string }): void;
}>();

const agentContextsStore = useAgentContextsStore();
const teamContextsStore = useAgentTeamContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const teamDefinitionStore = useAgentTeamDefinitionStore();
const agentRunConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const selectionStore = useAgentSelectionStore();
const agentRunStore = useAgentRunStore();
const teamRunStore = useAgentTeamRunStore();

const selectedAgentRunId = computed(() => selectionStore.selectedType === 'agent' ? selectionStore.selectedRunId : null);
const selectedTeamRunId = computed(() => selectionStore.selectedType === 'team' ? selectionStore.selectedRunId : null);

const agentGroups = computed(() => {
  return Array.from(agentContextsStore.runsByDefinition.entries()).map(([definitionId, runs]) => ({
    definitionId,
    definitionName: runs[0]?.config.agentDefinitionName || 'Agent',
    runs: runs,
  }));
});



const teamGroups = computed(() => {
  const grouped = new Map<string, AgentTeamContext[]>();
  for (const team of teamContextsStore.allTeamRuns) {
    const defId = team.config.teamDefinitionId;
    if (!grouped.has(defId)) grouped.set(defId, []);
    grouped.get(defId)!.push(team);
  }
  return Array.from(grouped.entries()).map(([definitionId, runs]) => ({
    definitionId,
    definitionName: runs[0]?.config.teamDefinitionName || 'Team',
    runs,
  }));
});

onMounted(() => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    agentDefinitionStore.fetchAllAgentDefinitions();
  }
  if (teamDefinitionStore.agentTeamDefinitions.length === 0) {
    teamDefinitionStore.fetchAllAgentTeamDefinitions();
  }
});

const toTimestamp = (isoTime: string | null | undefined): number => {
  if (!isoTime) {
    return 0;
  }

  const timestamp = Date.parse(isoTime);
  return Number.isFinite(timestamp) ? timestamp : 0;
};

const pickMostRecentRun = <T>(runs: T[], getUpdatedAt: (run: T) => string | null | undefined): T | null => {
  return runs
    .map((run, index) => ({
      run,
      index,
      timestamp: toTimestamp(getUpdatedAt(run)),
    }))
    .sort((left, right) =>
      right.timestamp - left.timestamp || left.index - right.index,
    )[0]?.run ?? null;
};

const getSelectedAgentSourceForDefinition = (definitionId: string): AgentContext | null => {
  if (selectionStore.selectedType !== 'agent' || !selectionStore.selectedRunId) {
    return null;
  }

  const selectedRun = agentContextsStore.runs.get(selectionStore.selectedRunId);
  return selectedRun?.config.agentDefinitionId === definitionId ? selectedRun : null;
};

const getSelectedTeamSourceForDefinition = (definitionId: string): AgentTeamContext | null => {
  if (selectionStore.selectedType !== 'team' || !selectionStore.selectedRunId) {
    return null;
  }

  const selectedTeam = teamContextsStore.getTeamContextById(selectionStore.selectedRunId);
  return selectedTeam?.config.teamDefinitionId === definitionId ? selectedTeam : null;
};

const getTeamUpdatedAt = (team: AgentTeamContext): string | null | undefined => {
  if (team.historicalHydration?.updatedAt) {
    return team.historicalHydration.updatedAt;
  }

  return Array.from(team.members.values())
    .map((member) => member.state.conversation?.updatedAt)
    .sort((left, right) => toTimestamp(right) - toTimestamp(left))[0] ?? null;
};

const createAgentRun = (definitionId: string) => {
  const definition = agentDefinitionStore.getAgentDefinitionById(definitionId);
  if (!definition) return;

  const group = agentGroups.value.find(g => g.definitionId === definitionId);
  const sourceRun = getSelectedAgentSourceForDefinition(definitionId)
    ?? (group?.runs.length
      ? pickMostRecentRun(group.runs, (run) => run.state.conversation?.updatedAt)
      : null);

  if (sourceRun) {
    agentRunConfigStore.setAgentConfig(buildEditableAgentRunSeed(sourceRun.config));
  } else {
    agentRunConfigStore.setTemplate(definition);
  }

  teamRunConfigStore.clearConfig();
  selectionStore.clearSelection();
  emit('run-created', { type: 'agent', definitionId });
};

const createTeamRun = (definitionId: string) => {
  const definition = teamDefinitionStore.getAgentTeamDefinitionById(definitionId);
  if (!definition) return;

  const group = teamGroups.value.find(g => g.definitionId === definitionId);
  const sourceTeam = getSelectedTeamSourceForDefinition(definitionId)
    ?? (group?.runs.length
      ? pickMostRecentRun(group.runs, getTeamUpdatedAt)
      : null);

  if (sourceTeam) {
    teamRunConfigStore.setConfig(buildEditableTeamRunSeed(sourceTeam.config));
  } else {
    teamRunConfigStore.setTemplate(definition);
  }

  agentRunConfigStore.clearConfig();
  selectionStore.clearSelection();
  emit('run-created', { type: 'team', definitionId });
};

const selectAgentRun = (runId: string) => {
  selectionStore.selectRun(runId, 'agent');
  emit('run-selected', { type: 'agent', runId });
};

const selectTeamRun = (runId: string) => {
  selectionStore.selectRun(runId, 'team');
  emit('run-selected', { type: 'team', runId });
};

const selectTeamMember = (teamRunId: string, memberName: string) => {
  // First ensure the team is selected
  selectionStore.selectRun(teamRunId, 'team');
  // Then focus the member
  teamContextsStore.setFocusedMember(memberName);
  emit('run-selected', { type: 'team', runId: teamRunId });
};

const getCoordinatorName = (definitionId: string): string | undefined => {
  return teamDefinitionStore.getAgentTeamDefinitionById(definitionId)?.coordinatorMemberName;
};

const deleteAgentRun = async (runId: string) => {
  await agentRunStore.closeAgent(runId, { terminate: true });
};

const deleteTeamRun = async (runId: string) => {
  await teamRunStore.terminateTeamRun(runId);
};
</script>
