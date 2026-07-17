<template>
  <div
    data-test="workspace-adaptive-layout"
    class="flex flex-1 flex-col relative min-h-0 min-w-0 overflow-hidden bg-gray-100"
  >
    <div
      ref="workspaceFlowRef"
      class="flex flex-1 min-h-0 min-w-0 overflow-hidden"
      data-test="workspace-center-right-flow"
    >
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
        v-else-if="!isRightDrawerOpen && responsiveWorkspaceShellState.showRightStrip"
        data-test="workspace-right-tool-strip"
        :strip-behavior="responsiveWorkspaceShellState.rightPanel.stripBehavior ?? 'consuming'"
        :strip-activation="responsiveWorkspaceShellState.rightPanel.stripActivation!"
        @request-open="openRightDrawer"
        @request-redock="redockRightPanel"
      />
    </div>

    <WorkspaceRightToolDrawer
      v-if="isRightDrawerOpen"
      :title="rightDrawerTitle"
      :width="rightDrawerWidth"
      :backdrop-style="rightDrawerBackdropStyle"
      :return-focus-target="getRightStripFocusTarget"
      @close="closeRightDrawer"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import { useAppLayoutStore } from '~/stores/appLayoutStore';
import { useLeftPanel } from '~/composables/useLeftPanel';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useResponsiveWorkspaceShellState } from '~/composables/layout/useResponsiveWorkspaceShell';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue';
import RightSideTabs from './RightSideTabs.vue';
import RightSidebarStrip from './RightSidebarStrip.vue';
import WorkspaceRightToolDrawer from './WorkspaceRightToolDrawer.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';
import { useShellPrimaryNavigation } from '~/composables/useShellPrimaryNavigation';
import { LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX } from '~/utils/layout/responsiveLayoutPolicy';

defineProps<{
  showFileContent: boolean
}>();

const { t } = useLocalization();
const appLayoutStore = useAppLayoutStore();
const router = useRouter();
const { resolvePrimaryRoute } = useShellPrimaryNavigation();
const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const runHistoryStore = useRunHistoryStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const {
  isRightPanelVisible,
  initDragRightPanel,
  setRightPanelVisible,
  setRightPanelWorkspaceWidth,
} = useRightPanel();
const { setLeftPanelVisible } = useLeftPanel();
const { activeTab } = useRightSideTabs();
const responsiveWorkspaceShellState = useResponsiveWorkspaceShellState();
const isRightDrawerOpen = ref(false);
const workspaceFlowRef = ref<HTMLElement | null>(null);
let workspaceFlowResizeObserver: ResizeObserver | null = null;

const registerWorkspaceFlowWidth = (width: number): void => {
  const effectiveLeftHandleOverlap = LEFT_PANEL_RESIZE_HANDLE_WIDTH_PX / 2;
  if (width > effectiveLeftHandleOverlap) {
    // The shell's 6px left handle overlaps the row by 3px (`margin-left: -3px`).
    // Compensate before handing the capacity boundary to the resolver, which
    // accounts for the full logical left resize handle in viewport space.
    setRightPanelWorkspaceWidth(width - effectiveLeftHandleOverlap);
  }
};

onMounted(() => {
  const workspaceFlow = workspaceFlowRef.value;
  if (!workspaceFlow) {
    return;
  }

  registerWorkspaceFlowWidth(workspaceFlow.getBoundingClientRect().width);

  if (typeof ResizeObserver !== 'undefined') {
    workspaceFlowResizeObserver = new ResizeObserver(([entry]) => {
      registerWorkspaceFlowWidth(entry?.contentRect.width ?? workspaceFlow.getBoundingClientRect().width);
    });
    workspaceFlowResizeObserver.observe(workspaceFlow);
  }
});

onBeforeUnmount(() => {
  workspaceFlowResizeObserver?.disconnect();
  workspaceFlowResizeObserver = null;
  setRightPanelWorkspaceWidth(null);
});

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

const centerPaneStyle = computed(() => ({
  minWidth: responsiveWorkspaceShellState.value.isNarrow
    ? `min(100%, ${responsiveWorkspaceShellState.value.rightPanel.effectiveCenterMinWidth}px)`
    : `${responsiveWorkspaceShellState.value.rightPanel.effectiveCenterMinWidth}px`,
}));

const rightDrawerWidth = computed(() => Math.min(
  Math.max(responsiveWorkspaceShellState.value.rightPanel.preferredWidth, 400),
  520,
));

const rightDrawerTitle = computed(() => {
  if (activeTab.value === 'files') {
    return t('shell.workspaceSurfaces.files');
  }

  return t('shell.workspaceSurfaces.tools');
});

const rightDrawerBackdropStyle = computed(() => ({
  // The left strip remains a normal 50px flow item while right tools are
  // transient. Keep it outside the right drawer backdrop's hit-test region
  // so the opposite side can be opened with a real pointer interaction.
  ...(responsiveWorkspaceShellState.value.showLeftStrip
    ? { left: `${responsiveWorkspaceShellState.value.leftPanel.consumedWidth}px` }
    : {}),
}));

const closeRightDrawer = (): void => {
  isRightDrawerOpen.value = false;
};

const getRightStripFocusTarget = (origin?: HTMLElement | null): HTMLElement | null => {
  const tabName = origin?.dataset.tabName;
  if (!tabName) {
    return null;
  }

  const buttons = Array.from(document.querySelectorAll<HTMLElement>('[data-test="workspace-right-tool-strip"] button'));
  return buttons.find((button) => button.dataset.tabName === tabName) ?? null;
};

const openRightDrawer = (): void => {
  if (isRightDrawerOpen.value) {
    closeRightDrawer();
    return;
  }

  isRightDrawerOpen.value = true;
};

const redockRightPanel = (): void => {
  setRightPanelVisible(true);
  closeRightDrawer();
};

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

watch(
  () => responsiveWorkspaceShellState.value.rightPanel.presentation,
  (presentation) => {
    if (presentation === 'docked') {
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
