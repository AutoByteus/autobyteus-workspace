<template>
  <div
    data-test="workspace-adaptive-layout"
    class="flex flex-1 flex-col relative min-h-0 min-w-0 overflow-hidden bg-gray-100"
  >
    <WorkspacePrimarySurfaceControls
      v-if="shouldShowSemanticSurfaceTriggers"
      :show-navigation-trigger="showNavigationTrigger"
      :show-tools-trigger="showToolsTrigger"
      @open-navigation="openLeftNavigation"
      @open-tools="openToolsSurface"
    />

    <div class="flex flex-1 min-h-0 min-w-0 overflow-hidden">
      <!-- Content Area -->
      <div
        data-test="workspace-center-pane"
        class="bg-white p-0 flex flex-col min-h-0 flex-1 min-w-0"
        :style="centerPaneStyle"
      >
        <div data-test="workspace-center-content-shell" class="relative flex-1 min-h-0 overflow-hidden">
          <RunConfigPanel v-if="showSelectedRunConfig" />
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
      </div>

      <div
        v-if="showDockedRightPanel"
        class="drag-handle"
        data-test="workspace-right-resize-handle"
        @mousedown="initDragRightPanel"
      ></div>

      <!-- Right Panel -->
      <div
        v-if="showDockedRightPanel"
        :style="{ width: responsiveWorkspaceShellState.rightPanel.preferredWidth + 'px' }"
        class="bg-white p-0 shadow flex flex-col flex-none min-h-0 min-w-0 overflow-hidden relative"
        data-test="workspace-right-panel"
      >
        <RightSideTabs mode="desktop" />
      </div>

      <RightSidebarStrip
        v-else-if="responsiveWorkspaceShellState.showRightStrip"
        data-test="workspace-right-tool-strip"
        open-as-drawer
        @request-open="openRightDrawer"
      />
    </div>

    <WorkspaceRightToolDrawer
      v-if="isRightDrawerOpen"
      :title="rightDrawerTitle"
      :width="rightDrawerWidth"
      @close="closeRightDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs, type TabName } from '~/composables/useRightSideTabs';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue';
import RightSideTabs from './RightSideTabs.vue';
import RightSidebarStrip from './RightSidebarStrip.vue';
import WorkspacePrimarySurfaceControls from './WorkspacePrimarySurfaceControls.vue';
import WorkspaceRightToolDrawer from './WorkspaceRightToolDrawer.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useLeftPanel } from '~/composables/useLeftPanel';
import { useShellPrimaryNavigation } from '~/composables/useShellPrimaryNavigation';

defineProps<{
  showFileContent: boolean
}>();

const { t } = useLocalization();
const appLayoutStore = useAppLayoutStore();
const router = useRouter();
const { resolvePrimaryRoute } = useShellPrimaryNavigation();
const { isLeftPanelVisible, toggleLeftPanel } = useLeftPanel();
const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const runHistoryStore = useRunHistoryStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const {
  isRightPanelVisible,
  initDragRightPanel,
  setRightPanelVisible,
} = useRightPanel();
const { activeTab, visibleTabs, setActiveTab } = useRightSideTabs();
const responsiveWorkspaceShellState = useResponsiveWorkspaceShellState();
const isRightDrawerOpen = ref(false);

const isAgentSelected = computed(() => selectionStore.selectedType === 'agent');
const isTeamSelected = computed(() => selectionStore.selectedType === 'team');
const showSelectedRunConfig = computed(() =>
  Boolean(selectionStore.selectedRunId) && workspaceCenterViewStore.isConfigMode,
);
const isCenterLoading = computed(() => runHistoryStore.openingRun);
const showDockedRightPanel = computed(() =>
  isRightPanelVisible.value && responsiveWorkspaceShellState.value.rightPanel.presentation === 'docked',
);

const hasPendingRunConfig = computed(() => {
  if (isAgentSelected.value || isTeamSelected.value) {
    return false;
  }

  return Boolean(runConfigStore.config?.agentDefinitionId || teamRunConfigStore.config?.teamDefinitionId);
});

const showNavigationTrigger = computed(() =>
  responsiveWorkspaceShellState.value.leftPanel.presentation !== 'docked' &&
  responsiveWorkspaceShellState.value.leftPanel.presentationSource === 'responsive',
);
const showToolsTrigger = computed(() =>
  responsiveWorkspaceShellState.value.rightPanel.presentation === 'drawer',
);
const shouldShowSemanticSurfaceTriggers = computed(() =>
  showNavigationTrigger.value || showToolsTrigger.value,
);

const centerPaneStyle = computed(() => ({
  minWidth: responsiveWorkspaceShellState.value.isNarrow
    ? `min(100%, ${responsiveWorkspaceShellState.value.centerMinWidth}px)`
    : `${responsiveWorkspaceShellState.value.centerMinWidth}px`,
}));

const rightDrawerWidth = computed(() => Math.min(
  Math.max(responsiveWorkspaceShellState.value.rightPanel.preferredWidth, 400),
  520,
));

const firstNonFileTool = computed<TabName>(() =>
  visibleTabs.value.find((tab) => tab.name !== 'files')?.name ?? 'terminal',
);

const rightDrawerTitle = computed(() => {
  if (activeTab.value === 'files') {
    return t('shell.workspaceSurfaces.files');
  }

  return t('shell.workspaceSurfaces.tools');
});

const closeRightDrawer = (): void => {
  isRightDrawerOpen.value = false;
};

const openRightDrawer = (): void => {
  setRightPanelVisible(true);
  appLayoutStore.closeMobileMenu();
  isRightDrawerOpen.value = true;
};

const openLeftNavigation = (): void => {
  closeRightDrawer();

  if (!isLeftPanelVisible.value) {
    toggleLeftPanel();
  }

  if (responsiveWorkspaceShellState.value.canOpenLeftDrawer) {
    appLayoutStore.openMobileMenu();
    return;
  }

  void router.push(resolvePrimaryRoute('agents'));
};

const openRunHistory = (): void => {
  closeRightDrawer();

  if (!isLeftPanelVisible.value) {
    toggleLeftPanel();
  }
  if (responsiveWorkspaceShellState.value.canOpenLeftDrawer) {
    appLayoutStore.openMobileMenu();
  }

  void nextTick(() => {
    const historySurface = document.querySelector<HTMLElement>('[data-test="app-left-panel-run-history"]');
    historySurface?.focus({ preventScroll: true });
  });
};

const openToolsSurface = (): void => {
  if (activeTab.value === 'files') {
    setActiveTab(firstNonFileTool.value);
  }
  openRightDrawer();
};

watch(
  () => [responsiveWorkspaceShellState.value.rightPanel.presentation, isRightPanelVisible.value] as const,
  ([presentation, visible]) => {
    if ((presentation === 'docked' && visible) || !visible) {
      closeRightDrawer();
    }
  },
);

watch(
  shouldShowSemanticSurfaceTriggers,
  (showTriggers) => {
    if (!showTriggers) {
      closeRightDrawer();
    }
  },
);
</script>

<style scoped>
.drag-handle {
  width: 4px;
  flex: 0 0 4px;
  background-color: transparent;
  cursor: col-resize;
  transition: background-color 0.2s ease;
  position: relative;
  z-index: 10;
  margin-left: -2px;
}

.drag-handle:hover {
  background-color: #9ca3af;
}

.drag-handle:active {
  background-color: #6b7280;
}
</style>
