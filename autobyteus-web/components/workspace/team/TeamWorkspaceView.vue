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
        <h4 v-if="activeTeamContext" class="text-base font-medium text-gray-800 truncate" :title="headerTitle">
          {{ headerTitle }}
        </h4>
        <AgentStatusDisplay v-if="activeTeamContext && headerStatus" :status="headerStatus" />
      </div>

      <div class="flex flex-shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-3">
        <WorkspaceHeaderActions
          @new-agent="createNewTeamRun"
          @edit-config="openSelectedTeamConfig"
        />
      </div>
    </div>

    <div v-if="activeTeamContext" class="flex-grow min-h-0 flex flex-col">
      <div class="flex-grow min-h-0">
        <AgentTeamEventMonitor>
          <template #composerContext>
            <SkillImprovementComposerCta :target="teamMemberSkillImprovementTarget" />
          </template>
        </AgentTeamEventMonitor>
      </div>

      <div v-if="showSharedComposer" class="border-t border-gray-200 bg-white px-4 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.replying_to') }}<span class="text-gray-800">{{ composerTargetTitle }}</span>
        </p>
        <SkillImprovementComposerCta :target="teamMemberSkillImprovementTarget" />
        <AgentUserInputForm v-if="focusedMemberContext" />
        <form v-else class="space-y-2" @submit.prevent="sendSubteamMessage">
          <textarea
            v-model="subteamDraft"
            class="min-h-[88px] w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            :placeholder="$t('workspace.components.workspace.team.TeamWorkspaceView.send_subteam_placeholder')"
          />
          <div class="flex justify-end">
            <button
              type="submit"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="!subteamDraft.trim() || isSendingSubteamDraft"
            >
              {{ $t('workspace.components.workspace.team.TeamWorkspaceView.send_to_subteam') }}
            </button>
          </div>
        </form>
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
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useAgentTeamRunStore } from '~/stores/agentTeamRunStore';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentTeamEventMonitor from '~/components/workspace/team/AgentTeamEventMonitor.vue';
import SkillImprovementComposerCta from '~/components/workspace/skill-improvement/SkillImprovementComposerCta.vue';
import type { SkillImprovementComposerCtaTarget } from '~/components/workspace/skill-improvement/skillImprovementComposerCtaTarget';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';
import { buildEditableTeamRunSeed } from '~/composables/useDefinitionLaunchDefaults';
import { serializeTeamExecutionAddress } from '~/types/agent/TeamExecutionAddress';
import { findTeamExecutionNode } from '~/services/agentStreaming/teamTaskExecutionTree';

const teamContextsStore = useAgentTeamContextsStore();
const teamRunStore = useAgentTeamRunStore();
const agentDefinitionStore = useAgentDefinitionStore();
const teamRunConfigStore = useTeamRunConfigStore();
const agentRunConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();
const headerAvatarLoadError = ref(false);
const subteamDraft = ref('');
const isSendingSubteamDraft = ref(false);
const { getMemberAvatarUrl, getMemberDisplayName, getMemberInitials } = useTeamMemberPresentation();
const RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID = 'autobyteus-retrospective-skill-improver';

const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedExecutionAddress = computed(() => activeTeamContext.value?.focusedExecutionAddress ?? null);
const focusedMemberContext = computed(() => {
  const team = activeTeamContext.value;
  const address = focusedExecutionAddress.value;
  return team && address ? team.agentExecutionsByKey.get(serializeTeamExecutionAddress(address)) ?? null : null;
});
const focusedMemberNode = computed(() => {
  const team = activeTeamContext.value;
  return team ? findTeamExecutionNode(team, team.focusedExecutionAddress) : null;
});
const rosterFocusedMemberContext = focusedMemberContext;
const rosterFocusedMemberNode = focusedMemberNode;

const showSharedComposer = computed(() => focusedMemberNode.value?.kind === 'agent_team');

const headerStatus = computed(() => {
  return rosterFocusedMemberContext.value?.state.currentStatus
    ?? (rosterFocusedMemberNode.value?.kind === 'agent'
      ? rosterFocusedMemberNode.value.currentStatus
      : null);
});

const headerTitle = computed(() => {
  const team = activeTeamContext.value;
  if (!team) {
    return '';
  }

  const focusedMemberAddress = focusedExecutionAddress.value?.memberAddress ?? '';
  if (!focusedMemberAddress) {
    return team.config.teamDefinitionName || 'Team';
  }

  return rosterFocusedMemberNode.value?.displayName
    || getMemberDisplayName(focusedMemberAddress, rosterFocusedMemberContext.value)
    || team.config.teamDefinitionName
    || 'Team';
});

const composerTargetTitle = computed(() => {
  const team = activeTeamContext.value;
  const target = focusedMemberNode.value;
  if (!team || !target) {
    return headerTitle.value;
  }

  return target.displayName
    || getMemberDisplayName(target.address, focusedMemberContext.value)
    || team.config.teamDefinitionName
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
    teamRunId: team.teamRunId,
    agentRunId: member.state.runId,
    isHelperRun:
      member.config.agentDefinitionId === RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID ||
      member.config.agentDefinitionName === 'Retrospective Skill Improver',
  };
});

const headerAvatarUrl = computed(() => {
  const team = activeTeamContext.value;
  const focusedMemberAddress = focusedExecutionAddress.value?.memberAddress ?? '';
  if (!team || !focusedMemberAddress || rosterFocusedMemberNode.value?.kind === 'agent_team') {
    return '';
  }

  return getMemberAvatarUrl(focusedMemberAddress, rosterFocusedMemberContext.value);
});

const showHeaderAvatarImage = computed(() => Boolean(headerAvatarUrl.value) && !headerAvatarLoadError.value);
const headerAvatarInitials = computed(() => getMemberInitials(headerTitle.value));

watch(headerAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const sendSubteamMessage = async () => {
  const text = subteamDraft.value.trim();
  if (!text) {
    return;
  }
  isSendingSubteamDraft.value = true;
  try {
    await teamRunStore.sendMessageToFocusedMember(text, []);
    subteamDraft.value = '';
  } finally {
    isSendingSubteamDraft.value = false;
  }
};

const createNewTeamRun = () => {
  if (!activeTeamContext.value) return;

  teamRunConfigStore.setConfig(buildEditableTeamRunSeed(activeTeamContext.value.config));
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
