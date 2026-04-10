<template>
  <div class="flex flex-col h-full bg-white">
    <div class="flex flex-wrap items-center justify-between gap-3 px-4 py-2 border-b border-gray-200 flex-shrink-0">
      <div class="flex items-center space-x-3 min-w-0 flex-1">
        <div class="h-8 w-8 shrink-0 overflow-hidden rounded-lg bg-slate-100 flex items-center justify-center">
          <img
            v-if="showHeaderAvatarImage"
            :src="headerAvatarUrl"
            :alt="`${headerTitle || 'Team member'} avatar`"
            class="h-full w-full object-cover"
            @error="headerAvatarLoadError = true"
          />
          <span v-else class="text-[10px] font-semibold tracking-wide text-slate-600">
            {{ headerAvatarInitials }}
          </span>
        </div>
        <h4 v-if="activeTeamContext" class="text-base font-medium text-gray-800 truncate" :title="headerTitle">
          {{ headerTitle }}
        </h4>
        <AgentStatusDisplay v-if="activeTeamContext" :status="headerStatus" />
      </div>

      <div class="flex items-center gap-3 flex-wrap justify-end">
        <TeamWorkspaceModeSwitch
          v-if="activeTeamContext"
          :mode="currentMode"
          @update:mode="setCurrentMode"
        />
        <WorkspaceHeaderActions
          @new-agent="createNewTeamRun"
          @edit-config="openSelectedTeamConfig"
        />
      </div>
    </div>

    <div v-if="activeTeamContext" class="flex-grow min-h-0 flex flex-col">
      <div class="flex-grow min-h-0">
        <AgentTeamEventMonitor v-if="currentMode === 'focus'" />
        <TeamGridView
          v-else-if="currentMode === 'grid'"
          :team-context="activeTeamContext"
          :focused-member-name="activeTeamContext.focusedMemberName"
          @select-member="setFocusedMember"
        />
        <TeamSpotlightView
          v-else
          :team-context="activeTeamContext"
          :focused-member-name="activeTeamContext.focusedMemberName"
          @select-member="setFocusedMember"
        />
      </div>

      <div v-if="showSharedComposer" class="border-t border-gray-200 bg-white px-4 py-3">
        <p class="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">{{ $t('workspace.components.workspace.team.TeamWorkspaceView.replying_to') }}<span class="text-gray-800">{{ headerTitle }}</span>
        </p>
        <AgentUserInputForm />
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
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useTeamWorkspaceViewStore, type TeamWorkspaceViewMode } from '~/stores/teamWorkspaceViewStore';
import { useTeamMemberPresentation } from '~/composables/useTeamMemberPresentation';
import { AgentStatus } from '~/types/agent/AgentStatus';
import AgentUserInputForm from '~/components/agentInput/AgentUserInputForm.vue';
import AgentStatusDisplay from '~/components/workspace/agent/AgentStatusDisplay.vue';
import AgentTeamEventMonitor from '~/components/workspace/team/AgentTeamEventMonitor.vue';
import TeamGridView from '~/components/workspace/team/TeamGridView.vue';
import TeamSpotlightView from '~/components/workspace/team/TeamSpotlightView.vue';
import TeamWorkspaceModeSwitch from '~/components/workspace/team/TeamWorkspaceModeSwitch.vue';
import WorkspaceHeaderActions from '~/components/workspace/common/WorkspaceHeaderActions.vue';

const teamContextsStore = useAgentTeamContextsStore();
const agentDefinitionStore = useAgentDefinitionStore();
const teamRunConfigStore = useTeamRunConfigStore();
const agentRunConfigStore = useAgentRunConfigStore();
const selectionStore = useAgentSelectionStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();
const teamWorkspaceViewStore = useTeamWorkspaceViewStore();
const headerAvatarLoadError = ref(false);
const { getMemberAvatarUrl, getMemberDisplayName, getMemberInitials } = useTeamMemberPresentation();

const activeTeamContext = computed(() => teamContextsStore.activeTeamContext);
const focusedMemberContext = computed(() => {
  const team = activeTeamContext.value;
  if (!team?.focusedMemberName) {
    return null;
  }
  return team.members.get(team.focusedMemberName) ?? null;
});

const currentMode = computed<TeamWorkspaceViewMode>(() => {
  return teamWorkspaceViewStore.getMode(activeTeamContext.value?.teamRunId);
});

const showSharedComposer = computed(() => {
  return Boolean(activeTeamContext.value) && currentMode.value !== 'focus';
});

const headerStatus = computed(() => {
  return focusedMemberContext.value?.state.currentStatus
    ?? activeTeamContext.value?.currentStatus
    ?? AgentStatus.Uninitialized;
});

const headerTitle = computed(() => {
  const team = activeTeamContext.value;
  if (!team) {
    return '';
  }

  const focusedMemberRouteKey = team.focusedMemberName?.trim();
  if (!focusedMemberRouteKey) {
    return team.config.teamDefinitionName || 'Team';
  }

  return getMemberDisplayName(focusedMemberRouteKey, focusedMemberContext.value)
    || team.config.teamDefinitionName
    || 'Team';
});

const headerAvatarUrl = computed(() => {
  const team = activeTeamContext.value;
  if (!team?.focusedMemberName) {
    return '';
  }

  return getMemberAvatarUrl(team.focusedMemberName, focusedMemberContext.value);
});

const showHeaderAvatarImage = computed(() => Boolean(headerAvatarUrl.value) && !headerAvatarLoadError.value);
const headerAvatarInitials = computed(() => getMemberInitials(headerTitle.value));

watch(headerAvatarUrl, () => {
  headerAvatarLoadError.value = false;
});

const setCurrentMode = (mode: TeamWorkspaceViewMode) => {
  if (!activeTeamContext.value) {
    return;
  }
  teamWorkspaceViewStore.setMode(activeTeamContext.value.teamRunId, mode);
};

const setFocusedMember = (memberName: string) => {
  teamContextsStore.setFocusedMember(memberName);
};

const createNewTeamRun = () => {
  if (!activeTeamContext.value) return;

  const template = JSON.parse(JSON.stringify(activeTeamContext.value.config));
  template.isLocked = false;
  teamRunConfigStore.setConfig(template);
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
