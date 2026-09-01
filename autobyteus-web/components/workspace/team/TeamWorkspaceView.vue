<template>
  <div class="flex flex-col h-full bg-white">
    <div class="flex flex-wrap items-center justify-between gap-2 px-3 py-2 border-b border-gray-200 flex-shrink-0 sm:px-4">
      <div class="flex items-center space-x-3 min-w-0 flex-1">
        <div class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
          <img
            v-if="showHeaderAvatarImage"
            :src="headerAvatarUrl"
            :alt="`${headerTitle || 'Team member'} avatar`"
            class="h-full w-full object-cover"
            @error="headerAvatarLoadError = true"
          />
          <span v-else class="text-[0.625rem] font-semibold tracking-wide text-slate-600">
            {{ headerAvatarInitials }}
          </span>
        </div>
        <div v-if="activeTeamContext" class="min-w-0 flex-1">
          <div class="flex min-w-0 items-center gap-2">
            <h4 class="truncate text-base font-medium text-gray-800" :title="headerTitle">
              {{ headerTitle }}
            </h4>
            <span
              v-if="focusedTask"
              class="shrink-0 rounded-full bg-indigo-100 px-2 py-0.5 text-[0.6875rem] font-semibold text-indigo-700"
            >{{ $t('workspace.task_monitor.task') }}</span>
            <AgentStatusDisplay v-if="headerStatus" :status="headerStatus" variant="compact" />
          </div>
          <p
            v-if="focusedTask"
            class="truncate text-xs text-slate-500"
            :title="focusedTask.description"
          >{{ focusedTask.description }}</p>
          <p
            v-if="focusedTaskStatus"
            class="text-xs font-medium text-slate-600"
            data-test="team-workspace-task-status"
          >{{ focusedTaskStatus }}</p>
        </div>
      </div>

      <div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <WorkspaceHeaderActions
          @new-agent="createNewTeamRun"
          @edit-config="openSelectedTeamConfig"
        />
      </div>
    </div>

    <div
      v-if="streamRecoveryNotice"
      role="alert"
      class="mx-3 mt-3 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-sm leading-5 text-amber-900 sm:mx-4"
    >
      {{ $t('workspace.components.workspace.team.TeamWorkspaceView.stream_recovery_required') }}
    </div>

    <div v-if="activeTeamContext" class="flex min-h-0 flex-grow flex-col">
      <div class="min-h-0 flex-grow">
        <AgentTeamEventMonitor>
          <template #composerContext>
            <SkillImprovementComposerCta :target="teamMemberSkillImprovementTarget" />
          </template>
        </AgentTeamEventMonitor>
      </div>
    </div>

    <div v-else class="flex-grow flex items-center justify-center p-8 text-center text-gray-500 bg-gray-50">
      <div>
        <h3 class="text-lg font-medium text-gray-900">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.no_active_team_runs') }}</h3>
        <p class="mt-2 max-w-md mx-auto">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.this_team_profile_has_no_running') }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { useAgentTeamContextsStore } from '~/stores/agentTeamContextsStore';
import { useAgentDefinitionStore } from '~/stores/agentDefinitionStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentTeamEventMonitor from '~/components/workspace/team/AgentTeamEventMonitor.vue';
import SkillImprovementComposerCta from '~/components/workspace/skill-improvement/SkillImprovementComposerCta.vue';
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import { useLocalization } from '~/composables/useLocalization';

const teamContextsStore = useAgentTeamContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const teamRunConfigStore = useTeamRunConfigStore();
const agentTeamRunStore = useAgentTeamRunStore();
const agentRunConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();
const headerAvatarLoadError = ref(false);
const { t } = useLocalization();
const { getMemberAvatarUrl, getMemberDisplayName, getMemberInitials } = useTeamMemberPresentation();
const RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID = 'autobyteus-retrospective-skill-improver';

const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const streamRecoveryNotice = computed(() => {
  const rootTeamRunId = activeTeamContext.value?.view.getRootTeamRunId();
  return rootTeamRunId ? agentTeamRunStore.getTeamStreamRecoveryNotice(rootTeamRunId) : null;
});
const focusedMemberContext = computed(() => activeTeamContext.value?.view.getFocusedAgentContext() ?? null);
const focusedMemberAddress = computed(() => activeTeamContext.value?.view.getFocusedMemberAddress() ?? '');
const headerStatus = computed(() => focusedMemberContext.value?.state.currentStatus ?? null);
const focusedNavigationRow = computed(() => activeTeamContext.value?.view.getFocusedNavigationRow() ?? null);
const focusedTask = computed(() => focusedNavigationRow.value?.task ?? null);
const focusedTaskStatus = computed(() => focusedTask.value && headerStatus.value
  ? t('workspace.task_monitor.combined_status', {
    lifecycle: t(`workspace.task_monitor.lifecycle.${focusedTask.value.displayStatus}`),
    execution: t(`workspace.task_monitor.execution.${headerStatus.value}`),
  })
  : '');

const headerTitle = computed(() => {
  const team = activeTeamContext.value;
  if (!team) {
    return '';
  }

  if (!focusedMemberAddress.value) {
    return team.view.getTeamDefinitionName() || 'Team';
  }
  return getMemberDisplayName(focusedMemberAddress.value, focusedMemberContext.value)
    || team.view.getTeamDefinitionName()
    || 'Team';
});

const teamMemberSkillImprovementTarget = computed<SkillImprovementComposerCtaTarget | null>(() => {
  const team = activeTeamContext.value;
  const member = focusedMemberContext.value;
  if (!team || !member) {
    return null;
  }
  return {
    kind: 'team-member',
    teamRunId: team.view.getRootTeamRunId(),
    agentRunId: member.state.runId,
    isHelperRun:
      member.config.agentDefinitionId === RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID ||
      member.config.agentDefinitionName === 'Retrospective Skill Improver',
  };
});

const headerAvatarUrl = computed(() => {
  if (!activeTeamContext.value || !focusedMemberAddress.value || !focusedMemberContext.value) {
    return '';
  }
  return getMemberAvatarUrl(focusedMemberAddress.value, focusedMemberContext.value);
});

const showHeaderAvatarImage = computed(() => Boolean(headerAvatarUrl.value) && !headerAvatarLoadError.value);
const headerAvatarInitials = computed(() => getMemberInitials(headerTitle.value));

watch(headerAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const createNewTeamRun = () => {
  if (!activeTeamContext.value) return;
  teamRunConfigStore.setConfig(buildEditableTeamRunSeed(activeTeamContext.value.view.getConfigurationView()));
  agentRunConfigStore.clearConfig();
  selectionStore.clearSelection();
};

const openSelectedTeamConfig = () => {
  if (!activeTeamContext.value) {
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
