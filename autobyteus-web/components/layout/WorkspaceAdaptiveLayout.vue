<template>
  <div
    ref="workspaceLayoutRef"
    data-test="workspace-adaptive-layout"
    class="flex flex-1 flex-col relative min-h-0 min-w-0 overflow-hidden bg-gray-100"
  >
    <WorkspacePrimarySurfaceControls
      v-if="shouldShowPrimarySurfaceControls"
      :active-surface="activePrimarySurface"
      @select="handlePrimarySurfaceClick"
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
          <div v-else class="flex items-center justify-center h-full px-4 text-center text-gray-500">
            <p>{{ $t('shell.components.layout.WorkspaceAdaptiveLayout.select_or_run_an_agent_team') }}</p>
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
        :style="{ width: workspaceResponsiveState.rightPanelWidth + 'px' }"
        class="bg-white p-0 shadow flex flex-col flex-none min-h-0 min-w-0 overflow-hidden relative"
        data-test="workspace-right-panel"
      >
        <RightSideTabs mode="desktop" />
      </div>

      <RightSidebarStrip
        v-else-if="workspaceResponsiveState.showRightStrip"
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
import { computed, ref, watch } from 'vue';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs, type TabName } from '~/composables/useRightSideTabs';
import { useWorkspaceResponsiveLayout } from '~/composables/layout/useWorkspaceResponsiveLayout';
import { useAppShellResponsiveLayout } from '~/composables/layout/useAppShellResponsiveLayout';
import type { WorkspacePrimarySurfaceName } from '~/utils/layout/workspaceSurfaceOrder';
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

defineProps<{
  showFileContent: boolean
}>();

const { t } = useLocalization();
const appLayoutStore = useAppLayoutStore();
const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const runHistoryStore = useRunHistoryStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const {
  isRightPanelVisible,
  isRightPanelDocked,
  initDragRightPanel,
  setRightPanelVisible,
} = useRightPanel();
const { activeTab, visibleTabs, setActiveTab } = useRightSideTabs();
const workspaceLayoutRef = ref<HTMLElement | null>(null);
const { workspaceResponsiveState } = useWorkspaceResponsiveLayout(workspaceLayoutRef);
const { shellResponsiveState } = useAppShellResponsiveLayout();
const isRightDrawerOpen = ref(false);

const isAgentSelected = computed(() => selectionStore.selectedType === 'agent');
const isTeamSelected = computed(() => selectionStore.selectedType === 'team');
const showSelectedRunConfig = computed(() =>
  Boolean(selectionStore.selectedRunId) && workspaceCenterViewStore.isConfigMode,
);
const isCenterLoading = computed(() => runHistoryStore.openingRun);
const showDockedRightPanel = computed(() => isRightPanelDocked.value);

const hasPendingRunConfig = computed(() => {
  if (isAgentSelected.value || isTeamSelected.value) {
    return false;
  }

  return Boolean(runConfigStore.config?.agentDefinitionId || teamRunConfigStore.config?.teamDefinitionId);
});

const shouldShowPrimarySurfaceControls = computed(() =>
  workspaceResponsiveState.value.showPrimarySurfaceControls ||
  shellResponsiveState.value.leftPanelPresentation !== 'docked',
);

const centerPaneStyle = computed(() => ({
  minWidth: shouldShowPrimarySurfaceControls.value
    ? 'min(100%, 320px)'
    : `${workspaceResponsiveState.value.centerMinWidth}px`,
}));

const rightDrawerWidth = computed(() => Math.min(Math.max(workspaceResponsiveState.value.rightPanelWidth, 400), 520));

const firstNonFileTool = computed<TabName>(() =>
  visibleTabs.value.find((tab) => tab.name !== 'files')?.name ?? 'terminal',
);

const rightDrawerTitle = computed(() => {
  if (activeTab.value === 'files') {
    return t('shell.workspaceSurfaces.files');
  }

  return t('shell.workspaceSurfaces.tools');
});

const activePrimarySurface = computed<WorkspacePrimarySurfaceName>(() => {
  if (appLayoutStore.isMobileMenuOpen) {
    return 'runs';
  }

  if (isRightDrawerOpen.value) {
    return activeTab.value === 'files' ? 'files' : 'tools';
  }

  return 'work';
});

const closeRightDrawer = (): void => {
  isRightDrawerOpen.value = false;
};

const openRightDrawer = (): void => {
  setRightPanelVisible(true);
  appLayoutStore.closeMobileMenu();
  isRightDrawerOpen.value = true;
};

const openFilesSurface = (): void => {
  setActiveTab('files');
  openRightDrawer();
};

const openToolsSurface = (): void => {
  if (activeTab.value === 'files') {
    setActiveTab(firstNonFileTool.value);
  }
  openRightDrawer();
};

const handlePrimarySurfaceClick = (surface: WorkspacePrimarySurfaceName): void => {
  switch (surface) {
    case 'work':
      appLayoutStore.closeMobileMenu();
      closeRightDrawer();
      break;
    case 'runs':
      closeRightDrawer();
      appLayoutStore.openMobileMenu();
      break;
    case 'files':
      openFilesSurface();
      break;
    case 'tools':
      openToolsSurface();
      break;
  }
};

watch(
  () => [workspaceResponsiveState.value.rightPanelPresentation, isRightPanelVisible.value] as const,
  ([presentation, visible]) => {
    if ((presentation === 'docked' && visible) || !visible) {
      closeRightDrawer();
    }
  },
);

watch(
  () => shouldShowPrimarySurfaceControls.value,
  (showControls) => {
    if (!showControls) {
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
