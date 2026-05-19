<template>
  <form class="space-y-4 rounded-3xl border border-blue-200 bg-blue-50 p-4" data-testid="mobile-run-setup" @submit.prevent="launch">
    <div class="flex items-start justify-between gap-3">
      <div>
        <p class="text-sm font-bold text-blue-950">Start new work</p>
        <p class="mt-1 text-sm text-blue-800">{{ setupHelpText }}</p>
      </div>
      <button type="button" class="rounded-lg border border-blue-200 px-3 py-1.5 text-xs font-semibold text-blue-700" @click="$emit('cancel')">
        Hide
      </button>
    </div>

    <div class="grid grid-cols-2 gap-2">
      <button
        type="button"
        class="rounded-2xl px-3 py-2 text-sm font-semibold"
        :class="mode === 'agent' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800'"
        data-testid="mobile-run-setup-agent-mode"
        @click="mode = 'agent'"
      >
        Agent
      </button>
      <button
        type="button"
        class="rounded-2xl px-3 py-2 text-sm font-semibold"
        :class="mode === 'team' ? 'bg-blue-600 text-white' : 'bg-white text-blue-800'"
        data-testid="mobile-run-setup-team-mode"
        @click="mode = 'team'"
      >
        Team
      </button>
    </div>

    <MobileLaunchTargetPicker
      v-if="mode === 'agent'"
      v-model="selectedAgentId"
      label="Agent"
      placeholder="Choose an agent intentionally"
      :items="agentChoices"
      test-id="mobile-run-agent-select"
    />
    <MobileLaunchTargetPicker
      v-else
      v-model="selectedTeamId"
      label="Team"
      placeholder="Choose a team intentionally"
      :items="teamChoices"
      test-id="mobile-run-team-select"
    />

    <MobileLaunchTargetPicker
      v-model="selectedWorkspaceId"
      label="Workspace"
      placeholder="Choose a workspace intentionally"
      :items="workspaceChoices"
      test-id="mobile-run-workspace-select"
    />

    <MobileLaunchRuntimeModelCard
      v-if="mode === 'agent' && agentConfigForSelectedTarget"
      variant="agent"
      :runtime-kind="agentConfigForSelectedTarget.runtimeKind"
      :llm-model-identifier="agentConfigForSelectedTarget.llmModelIdentifier"
      :llm-config="agentConfigForSelectedTarget.llmConfig"
      @update:runtime-kind="agentRunConfigStore.updateAgentConfig({ runtimeKind: $event })"
      @update:llm-model-identifier="agentRunConfigStore.updateAgentConfig({ llmModelIdentifier: $event })"
      @update:llm-config="agentRunConfigStore.updateAgentConfig({ llmConfig: $event })"
    />
    <MobileLaunchRuntimeModelCard
      v-else-if="mode === 'team' && teamConfigForSelectedTarget"
      variant="team"
      :runtime-kind="teamConfigForSelectedTarget.runtimeKind"
      :llm-model-identifier="teamConfigForSelectedTarget.llmModelIdentifier"
      :llm-config="teamConfigForSelectedTarget.llmConfig"
      @update:runtime-kind="teamRunConfigStore.updateConfig({ runtimeKind: $event })"
      @update:llm-model-identifier="teamRunConfigStore.updateConfig({ llmModelIdentifier: $event })"
      @update:llm-config="teamRunConfigStore.updateConfig({ llmConfig: $event })"
    />

    <MobileTeamLaunchFocusPicker
      v-if="mode === 'team' && selectedTeamId"
      v-model="selectedTeamFocusRouteKey"
      :team-definition-id="selectedTeamId"
    />

    <label class="block text-sm font-semibold text-blue-950">
      First message
      <textarea
        v-model="prompt"
        rows="4"
        class="mt-1 w-full rounded-2xl border border-blue-200 bg-white px-3 py-3 text-sm"
        placeholder="Tell AutoByteus what to do first…"
        data-testid="mobile-run-prompt"
      />
    </label>

    <MobileLaunchSummary
      :target-label="selectedTargetLabel"
      :workspace-label="selectedWorkspaceLabel"
      :model-label="selectedModelLabel"
      :first-message-target-label="selectedFirstMessageTargetLabel"
      :blocking-issue="blockingIssue"
      :ready="canLaunch"
    />

    <p v-if="error" class="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700" data-testid="mobile-run-setup-error">
      {{ error }}
    </p>

    <button
      type="submit"
      class="w-full rounded-2xl bg-blue-600 px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"
      :disabled="!canLaunch || launching"
      data-testid="mobile-run-launch"
    >
      {{ launching ? 'Launching…' : 'Launch run' }}
    </button>
  </form>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import MobileLaunchRuntimeModelCard from '~/components/mobile/MobileLaunchRuntimeModelCard.vue';
import MobileLaunchSummary from '~/components/mobile/MobileLaunchSummary.vue';
import MobileLaunchTargetPicker from '~/components/mobile/MobileLaunchTargetPicker.vue';
import MobileTeamLaunchFocusPicker from '~/components/mobile/MobileTeamLaunchFocusPicker.vue';
import { buildMobileTeamMemberFocusRows } from '~/composables/mobile/useMobileTeamMemberFocusCoordinator';
import { useMobileRunLaunchCoordinator } from '~/composables/mobile/useMobileRunLaunchCoordinator';
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog';
import { useTeamRunRuntimeCatalogSync } from '~/composables/useTeamRunRuntimeCatalogSync';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamDefinitionStore } from '~/stores/agentTeamDefinitionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { runtimeKindToLabel } from '~/types/agent/AgentRunConfig';
import type { AgentRunConfig } from '~/types/agent/AgentRunConfig';
import type { TeamRunConfig } from '~/types/agent/TeamRunConfig';
import type { MobileWorkContext, MobileWorkListItem } from '~/types/mobileWork';
import {
  buildTeamMemberTreeFromDefinition,
  flattenLeafAgentMemberNodes,
} from '~/utils/teamDefinitionMembers';

type MobileLaunchPickerItem = {
  id: string;
  label: string;
  detail?: string;
  group?: string;
};

const props = defineProps<{
  context: MobileWorkContext | null;
}>();

const emit = defineEmits<{
  cancel: [];
  launched: [context: MobileWorkContext];
}>();

const agentDefinitionStore = useAgentDefinitionStore();
const agentRunConfigStore = useAgentRunConfigStore();
const teamDefinitionStore = useAgentTeamDefinitionStore();
const teamRunConfigStore = useTeamRunConfigStore();
const { agentItems, teamItems, workspaceItems } = useMobileWorkCatalog();
const { launchMobileRun } = useMobileRunLaunchCoordinator();
const mode = ref<'agent' | 'team'>('agent');
const selectedAgentId = ref('');
const selectedTeamId = ref('');
const selectedWorkspaceId = ref('');
const selectedTeamFocusRouteKey = ref('');
const prompt = ref('');
const launching = ref(false);
const error = ref<string | null>(null);
const setupHelpText = computed(() => mode.value === 'team'
  ? 'Choose a team, workspace, runtime/model, first message target, and first message.'
  : 'Choose an agent, workspace, runtime/model, and first message.');

const workspaceIdByRootPath = computed(() => new Map(workspaceItems.value.flatMap((item) => item.context.kind === 'workspace'
  ? [[item.context.rootPath, item.context.workspaceId] as const]
  : [])));
const agentChoices = computed<MobileLaunchPickerItem[]>(() => agentItems.value.flatMap((item) => item.context.kind === 'agent-definition'
  ? [{ id: item.context.agentDefinitionId, label: item.label, detail: item.detail, group: choiceGroupForAgent(item) }]
  : []));
const teamChoices = computed<MobileLaunchPickerItem[]>(() => teamItems.value.flatMap((item) => item.context.kind === 'team-definition'
  ? [{ id: item.context.teamDefinitionId, label: item.label, detail: item.detail, group: choiceGroupForTeam(item) }]
  : []));
const workspaceChoices = computed<MobileLaunchPickerItem[]>(() => workspaceItems.value.flatMap((item) => item.context.kind === 'workspace'
  ? [{ id: item.context.workspaceId, label: item.label, detail: item.detail, group: choiceGroupForWorkspace(item) }]
  : []));
const selectedTargetLabel = computed(() => {
  const choices = mode.value === 'agent' ? agentChoices.value : teamChoices.value;
  const selectedId = mode.value === 'agent' ? selectedAgentId.value : selectedTeamId.value;
  return choices.find((item) => item.id === selectedId)?.label || '';
});
const selectedWorkspaceLabel = computed(() => workspaceChoices.value.find((item) => item.id === selectedWorkspaceId.value)?.label || '');
const agentConfigForSelectedTarget = computed<AgentRunConfig | null>(() => {
  const config = agentRunConfigStore.config;
  return mode.value === 'agent' && config?.agentDefinitionId === selectedAgentId.value ? config : null;
});
const teamConfigForSelectedTarget = computed<TeamRunConfig | null>(() => {
  const config = teamRunConfigStore.config;
  return mode.value === 'team' && config?.teamDefinitionId === selectedTeamId.value ? config : null;
});
const activeTeamConfigForCatalogSync = computed(() => teamConfigForSelectedTarget.value);
useTeamRunRuntimeCatalogSync(activeTeamConfigForCatalogSync);

const selectedTeamDefinition = computed(() => selectedTeamId.value
  ? teamDefinitionStore.getAgentTeamDefinitionById(selectedTeamId.value)
  : null);
const teamFocusRows = computed(() => {
  const definition = selectedTeamDefinition.value;
  if (!definition) {
    return [];
  }
  try {
    const tree = buildTeamMemberTreeFromDefinition(definition, {
      getTeamDefinitionById: (teamDefinitionId: string) =>
        teamDefinitionStore.getAgentTeamDefinitionById(teamDefinitionId),
    });
    return buildMobileTeamMemberFocusRows(
      flattenLeafAgentMemberNodes(tree),
      (agentDefinitionId) => agentDefinitionStore.getAgentDefinitionById(agentDefinitionId)?.name || null,
    );
  } catch (cause) {
    console.error('[MobileRunSetup] Failed to build team member focus choices.', cause);
    return [];
  }
});
const selectedFirstMessageTargetLabel = computed(() => mode.value === 'team'
  ? teamFocusRows.value.find((row) => row.routeKey === selectedTeamFocusRouteKey.value)?.label || ''
  : '');
const selectedModelLabel = computed(() => {
  const config = mode.value === 'agent' ? agentConfigForSelectedTarget.value : teamConfigForSelectedTarget.value;
  if (!config) {
    return '';
  }
  const runtimeLabel = runtimeKindToLabel(config.runtimeKind);
  const model = config.llmModelIdentifier?.trim();
  return model ? `${runtimeLabel} · ${model}` : `${runtimeLabel} · Choose model`;
});
const teamReadiness = computed(() => teamRunConfigStore.launchReadiness);
const blockingIssue = computed(() => {
  const targetSelected = mode.value === 'agent' ? selectedAgentId.value : selectedTeamId.value;
  if (!targetSelected) {
    return mode.value === 'agent' ? 'Choose an agent before launching.' : 'Choose a team before launching.';
  }
  if (!selectedWorkspaceId.value) {
    return 'Choose a workspace before launching.';
  }
  if (mode.value === 'agent') {
    if (!agentConfigForSelectedTarget.value) {
      return 'Agent launch configuration is still loading.';
    }
    if (!agentRunConfigStore.isConfigured) {
      return 'Choose a model before launching.';
    }
  } else {
    if (!teamConfigForSelectedTarget.value) {
      return 'Team launch configuration is still loading.';
    }
    if (!selectedTeamFocusRouteKey.value || !teamFocusRows.value.some((row) => row.routeKey === selectedTeamFocusRouteKey.value)) {
      return 'Choose a focused team member before launching.';
    }
    if (!teamReadiness.value.canLaunch) {
      return teamReadiness.value.blockingIssues[0]?.message || 'Team configuration is not launch-ready.';
    }
  }
  if (!prompt.value.trim()) {
    return 'Enter the first message before launching.';
  }
  return '';
});
const canLaunch = computed(() => !blockingIssue.value);

function choiceGroupForAgent(item: MobileWorkListItem): string {
  const context = props.context;
  if ((context?.kind === 'agent-definition' || context?.kind === 'agent-run') && item.context.kind === 'agent-definition' && item.context.agentDefinitionId === context.agentDefinitionId) {
    return 'Current context';
  }
  return 'All agents';
}

function choiceGroupForTeam(item: MobileWorkListItem): string {
  const context = props.context;
  if ((context?.kind === 'team-definition' || context?.kind === 'team-run') && item.context.kind === 'team-definition' && item.context.teamDefinitionId === context.teamDefinitionId) {
    return 'Current context';
  }
  return 'All teams';
}

function choiceGroupForWorkspace(item: MobileWorkListItem): string {
  if (item.context.kind !== 'workspace') {
    return 'All workspaces';
  }
  const context = props.context;
  if (context?.kind === 'workspace' && item.context.workspaceId === context.workspaceId) {
    return 'Current context';
  }
  if ((context?.kind === 'agent-run' || context?.kind === 'team-run') && item.context.rootPath === context.workspaceRootPath) {
    return 'Current run workspace';
  }
  return 'All workspaces';
}

function applyContextDefaults(): void {
  if (props.context?.kind === 'agent-definition' && !selectedAgentId.value) {
    mode.value = 'agent';
    selectedAgentId.value = props.context.agentDefinitionId;
  }
  if (props.context?.kind === 'team-definition' && !selectedTeamId.value) {
    mode.value = 'team';
    selectedTeamId.value = props.context.teamDefinitionId;
  }
  if (props.context?.kind === 'agent-run') {
    mode.value = 'agent';
    if (!selectedAgentId.value) {
      selectedAgentId.value = props.context.agentDefinitionId;
    }
    if (!selectedWorkspaceId.value) {
      selectedWorkspaceId.value = workspaceIdByRootPath.value.get(props.context.workspaceRootPath) || '';
    }
  }
  if (props.context?.kind === 'team-run') {
    mode.value = 'team';
    if (!selectedTeamId.value) {
      selectedTeamId.value = props.context.teamDefinitionId;
    }
    if (!selectedWorkspaceId.value) {
      selectedWorkspaceId.value = workspaceIdByRootPath.value.get(props.context.workspaceRootPath) || '';
    }
    if (!selectedTeamFocusRouteKey.value) {
      selectedTeamFocusRouteKey.value = props.context.focusedMemberRouteKey;
    }
  }
  if (props.context?.kind === 'workspace' && !selectedWorkspaceId.value) {
    selectedWorkspaceId.value = props.context.workspaceId;
  }
}

function clearInvalidSelections(): void {
  if (selectedAgentId.value && !agentChoices.value.some((item) => item.id === selectedAgentId.value)) selectedAgentId.value = '';
  if (selectedTeamId.value && !teamChoices.value.some((item) => item.id === selectedTeamId.value)) selectedTeamId.value = '';
  if (selectedWorkspaceId.value && !workspaceChoices.value.some((item) => item.id === selectedWorkspaceId.value)) selectedWorkspaceId.value = '';
}

function syncSelectedConfig(): void {
  if (mode.value === 'agent') {
    teamRunConfigStore.clearConfig();
    if (!selectedAgentId.value) {
      agentRunConfigStore.clearConfig();
      return;
    }
    const definition = agentDefinitionStore.getAgentDefinitionById(selectedAgentId.value);
    if (!definition) {
      return;
    }
    if (agentRunConfigStore.config?.agentDefinitionId !== selectedAgentId.value) {
      agentRunConfigStore.setTemplate(definition);
    }
    if (selectedWorkspaceId.value) {
      agentRunConfigStore.updateAgentConfig({ workspaceId: selectedWorkspaceId.value });
    }
    return;
  }

  agentRunConfigStore.clearConfig();
  if (!selectedTeamId.value) {
    teamRunConfigStore.clearConfig();
    return;
  }
  const definition = teamDefinitionStore.getAgentTeamDefinitionById(selectedTeamId.value);
  if (!definition) {
    return;
  }
  if (teamRunConfigStore.config?.teamDefinitionId !== selectedTeamId.value) {
    teamRunConfigStore.setTemplate(definition);
  }
  if (selectedWorkspaceId.value) {
    teamRunConfigStore.updateConfig({ workspaceId: selectedWorkspaceId.value });
  }
}

async function launch(): Promise<void> {
  error.value = null;
  if (!canLaunch.value) {
    error.value = blockingIssue.value || 'Choose a target, workspace, model, and first message.';
    return;
  }
  launching.value = true;
  try {
    const result = await launchMobileRun(
      mode.value === 'agent'
        ? {
            kind: 'agent',
            agentDefinitionId: selectedAgentId.value,
            workspaceId: selectedWorkspaceId.value,
            prompt: prompt.value,
          }
        : {
            kind: 'team',
            teamDefinitionId: selectedTeamId.value,
            workspaceId: selectedWorkspaceId.value,
            focusedMemberRouteKey: selectedTeamFocusRouteKey.value,
            prompt: prompt.value,
          },
    );
    prompt.value = '';
    emit('launched', result.context);
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Failed to launch mobile run.';
  } finally {
    launching.value = false;
  }
}

watch(() => props.context, () => {
  selectedAgentId.value = '';
  selectedTeamId.value = '';
  selectedWorkspaceId.value = '';
  selectedTeamFocusRouteKey.value = '';
  applyContextDefaults();
}, { immediate: true });
watch([agentItems, teamItems, workspaceItems], () => {
  clearInvalidSelections();
  applyContextDefaults();
});
watch([mode, selectedAgentId, selectedTeamId, selectedWorkspaceId, agentChoices, teamChoices], syncSelectedConfig, { immediate: true });
watch(teamFocusRows, (rows) => {
  if (mode.value !== 'team') {
    selectedTeamFocusRouteKey.value = '';
    return;
  }
  if (rows.length === 0) {
    selectedTeamFocusRouteKey.value = '';
    return;
  }
  if (!rows.some((row) => row.routeKey === selectedTeamFocusRouteKey.value)) {
    selectedTeamFocusRouteKey.value = rows[0].routeKey;
  }
}, { immediate: true });
</script>
