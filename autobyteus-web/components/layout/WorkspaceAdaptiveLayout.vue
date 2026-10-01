<template>
  <WorkspaceToolShell data-test="workspace-adaptive-layout">
    <div data-test="workspace-center-content-shell" class="relative flex-1 min-h-0 overflow-hidden">
      <AgentOrgRunConfigPanel v-if="showAgentOrgRunConfig" />
      <AgentOrgWorkspaceView v-else-if="showAgentOrgActive" />
      <RunConfigPanel v-else-if="showSelectedRunConfig" />
      <AgentWorkspaceView v-else-if="isAgentSelected" />
      <TeamWorkspaceView v-else-if="isTeamSelected" />
      <RunConfigPanel v-else-if="hasPendingRunConfig" />
      <div
        v-else
        data-test="workspace-empty-state"
        class="flex h-full items-center justify-center px-4 text-center text-gray-500"
      >
        <div class="max-w-md space-y-4">
          <div class="space-y-1">
            <h2 class="text-lg font-semibold text-gray-700">
              {{ $t('shell.workspaceSurfaces.emptyStateTitle') }}
            </h2>
            <p>{{ $t('shell.workspaceSurfaces.emptyStateDescription') }}</p>
          </div>
          <div class="flex flex-wrap justify-center gap-2">
            <button
              type="button"
              data-test="workspace-empty-state-choose"
              class="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              @click="openLeftNavigation"
            >
              {{ $t('shell.workspaceSurfaces.chooseAgentOrTeam') }}
            </button>
            <button
              type="button"
              data-test="workspace-empty-state-runs"
              class="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
              @click="openRunHistory"
            >
              {{ $t('shell.workspaceSurfaces.openRunsHistory') }}
            </button>
          </div>
        </div>
      </div>
      <WorkspaceCenterLoadingOverlay v-if="isCenterLoading" />
    </div>
  </WorkspaceToolShell>
</template>

<script setup lang="ts">
import { computed, nextTick } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useLeftPanel } from '~/composables/useLeftPanel';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import AgentOrgRunConfigPanel from '~/components/workspace/config/AgentOrgRunConfigPanel.vue';
import AgentOrgWorkspaceView from '~/components/workspace/org/AgentOrgWorkspaceView.vue';
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue';
import WorkspaceToolShell from './WorkspaceToolShell.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useShellPrimaryNavigation } from '~/composables/useShellPrimaryNavigation';

defineProps<{
  showFileContent: boolean
}>();

const appLayoutStore = useAppLayoutStore();
const route = useRoute();
const router = useRouter();
const { resolvePrimaryRoute } = useShellPrimaryNavigation();
const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const runHistoryStore = useRunHistoryStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const { setLeftPanelVisible } = useLeftPanel();
const responsiveWorkspaceShellState = useResponsiveWorkspaceShellState();

const isAgentSelected = computed(() => selectionStore.selectedType === 'agent');
const isTeamSelected = computed(() => selectionStore.selectedType === 'team');
const showAgentOrgRunConfig = computed(() => route.query?.rootSubjectKind === 'agent_org' && route.query.mode === 'configuration');
const showAgentOrgActive = computed(() => route.query?.rootSubjectKind === 'agent_org'
  && (route.query.mode === 'active' || route.query.mode === 'history')
  && Boolean(route.query.orgRunId));
const showSelectedRunConfig = computed(() =>
  Boolean(selectionStore.selectedRunId) && workspaceCenterViewStore.isConfigMode,
);
const isCenterLoading = computed(() => runHistoryStore.openingRun);

const hasPendingRunConfig = computed(() => {
  if (isAgentSelected.value || isTeamSelected.value) {
    return false;
  }

  return Boolean(runConfigStore.config?.agentDefinitionId || teamRunConfigStore.config?.teamDefinitionId);
});

const openLeftNavigation = (): void => {
  if (responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'open-drawer') {
    appLayoutStore.openMobileMenu();
    return;
  }

  if (responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'redock-panel') {
    setLeftPanelVisible(true);
  }

  void router.push(resolvePrimaryRoute('agents'));
};

const openRunHistory = (): void => {
  if (responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'open-drawer') {
    appLayoutStore.openMobileMenu();
  } else if (responsiveWorkspaceShellState.value.leftPanel.stripActivation === 'redock-panel') {
    setLeftPanelVisible(true);
  }

  void nextTick(() => {
    const historySurface = document.querySelector<HTMLElement>('[data-test="app-left-panel-run-history"]');
    historySurface?.focus({ preventScroll: true });
  });
};
</script>
