<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header Bar -->
    <div v-if="selectedAgent" class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-100 flex-shrink-0 sm:px-4">
      <div class="flex min-w-0 flex-1 items-center space-x-3">
        <div class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
          <img
            v-if="showHeaderAvatarImage"
            :src="selectedAgentAvatarUrl"
            :alt="`${selectedAgent?.config.agentDefinitionName || 'Agent'} avatar`"
            class="h-full w-full object-cover"
            @error="headerAvatarLoadError = true"
          />
          <span v-else class="text-[0.625rem] font-semibold tracking-wide text-slate-600">
            {{ headerAvatarInitials }}
          </span>
        </div>
        <h4 class="text-base font-medium text-gray-800 truncate" :title="headerTitle">{{ headerTitle }}</h4>
        <AgentStatusDisplay v-if="selectedAgent" :status="selectedAgent.state.currentStatus" />
      </div>
      
      <div class="flex flex-shrink-0 items-center gap-1 sm:gap-2">
        <WorkspaceHeaderActions
          @new-agent="createNewAgent"
          @edit-config="openSelectedRunConfig"
        />
      </div>
    </div>
    
    <!-- Active Agent Content -->
    <div class="flex-grow min-h-0">
      <AgentEventMonitor
        v-if="selectedAgent"
        :conversation="selectedAgent.state.conversation"
        :run-id="selectedAgent.state.runId"
        :agent-name="selectedAgent.config.agentDefinitionName"
        :agent-avatar-url="selectedAgent.config.agentAvatarUrl"
        :presentation-revision="selectedAgent.state.eventMonitorPresentationRevision"
        :has-earlier-active-trace-events="selectedAgent.state.hasEarlierActiveTraceEvents"
        :browse-subject="{ kind: 'run', runId: selectedAgent.state.runId }"
        class="h-full"
      >
        <template #composerContext>
          <SkillImprovementComposerCta :target="skillImprovementTarget" />
        </template>
      </AgentEventMonitor>
      <div v-else class="p-4 text-center text-gray-500">{{ $t('workspace.components.workspace.agent.AgentWorkspaceView.select_an_agent_or_start_a') }}</div>
    </div>

  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import AgentEventMonitor from '~/components/workspace/agent/AgentEventMonitor.vue';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import SkillImprovementComposerCta from '~/components/workspace/skill-improvement/SkillImprovementComposerCta.vue';
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget';
import { useAgentContextsStore } from '~/stores/agentContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { buildEditableAgentRunSeed } from '~/composables/useDefinitionLaunchDefaults';

const agentContextsStore = useAgentContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const selectionStore = useAgentSelectionStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const selectedAgent = computed(() => agentContextsStore.activeRun);
const headerAvatarLoadError = ref(false);
const RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID = 'autobyteus-retrospective-skill-improver';

const headerTitle = computed(() => {
  if (selectedAgent.value) {
    const agentState = selectedAgent.value.state;
    const name = selectedAgent.value.config.agentDefinitionName || 'Agent';
    if (agentState.runId.startsWith('temp-')) {
      return `New - ${name}`;
    }
    const idSuffix = agentState.runId.slice(-4).toUpperCase();
    return `${name} - ${idSuffix}`;
  }
  return 'Workspace'; // A generic fallback
});

const selectedAgentAvatarUrl = computed(() => {
  const fromContext = selectedAgent.value?.config.agentAvatarUrl?.trim();
  if (fromContext) {
    return fromContext;
  }

  const definitionId = selectedAgent.value?.config.agentDefinitionId?.trim();
  if (!definitionId) {
    return '';
  }

  return agentDefinitionStore.getAgentDefinitionById(definitionId)?.avatarUrl?.trim() || '';
});
const showHeaderAvatarImage = computed(
  () => Boolean(selectedAgentAvatarUrl.value) && !headerAvatarLoadError.value
);
const headerAvatarInitials = computed(() => {
  const name = selectedAgent.value?.config.agentDefinitionName?.trim() ?? '';
  if (!name) {
    return 'AI';
  }

  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('') || 'AI'
  );
});

const skillImprovementTarget = computed<SkillImprovementComposerCtaTarget | null>(() => {
  const run = selectedAgent.value;
  if (!run) {
    return null;
  }
  return {
    kind: 'agent',
    runId: run.state.runId,
    isHelperRun:
      run.config.agentDefinitionId === RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID ||
      run.config.agentDefinitionName === 'Retrospective Skill Improver',
  };
});

watch(selectedAgentAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const createNewAgent = () => {
  if (!selectedAgent.value) return;

  runConfigStore.setAgentConfig(buildEditableAgentRunSeed(selectedAgent.value.config));
  teamRunConfigStore.clearConfig();
  selectionStore.clearSelection();
};

const openSelectedRunConfig = () => {
  if (!selectedAgent.value) {
    return;
  }
  workspaceCenterViewStore.showConfig();
};

onMounted(async () => {
  if (agentDefinitionStore.agentDefinitions.length === 0) {
    await agentDefinitionStore.fetchAllAgentDefinitions().catch(() => undefined);
  }
});
</script>
