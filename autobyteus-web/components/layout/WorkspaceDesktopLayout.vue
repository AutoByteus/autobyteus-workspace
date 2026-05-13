<template>
  <div
    ref="workspaceLayoutRef"
    data-test="workspace-desktop-layout"
    class="hidden md:flex flex-1 relative space-x-0 min-h-0 min-w-0 overflow-hidden"
  >
    <!-- Content Area -->
    <div class="bg-white p-0 flex flex-col min-h-0 flex-1 min-w-[200px]">
      <div data-test="workspace-center-content-shell" class="relative flex-1 min-h-0 overflow-hidden">
        <RunConfigPanel v-if="showSelectedRunConfig" />
        <AgentWorkspaceView v-else-if="isAgentSelected" />
        <TeamWorkspaceView v-else-if="isTeamSelected" />
        <RunConfigPanel v-else-if="hasPendingRunConfig" />
        <div v-else class="flex items-center justify-center h-full text-gray-500">
          <p>{{ $t('shell.components.layout.WorkspaceDesktopLayout.select_or_run_an_agent_team') }}</p>
        </div>
        <WorkspaceCenterLoadingOverlay v-if="isCenterLoading" />
      </div>
    </div>

    <div
      class="drag-handle"
      data-test="workspace-right-resize-handle"
      @mousedown="initDragRightPanel"
    ></div>

    <!-- Right Panel -->
    <div
      v-show="isRightPanelVisible"
      :style="{ width: rightPanelWidth + 'px' }"
      class="bg-white p-0 shadow flex flex-col flex-none min-h-0 min-w-0 overflow-hidden relative"
      data-test="workspace-right-panel"
    >
      <RightSideTabs />
    </div>

    <RightSidebarStrip v-if="!isRightPanelVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue';
import { useRightPanel } from '~/composables/useRightPanel';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue';
import RightSideTabs from './RightSideTabs.vue';
import RightSidebarStrip from './RightSidebarStrip.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceCenterViewStore } from '~/stores/workspaceCenterViewStore';

const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const runHistoryStore = useRunHistoryStore();
const workspaceCenterViewStore = useWorkspaceCenterViewStore();

const {
  isRightPanelVisible,
  rightPanelWidth,
  initDragRightPanel,
  setRightPanelWorkspaceWidth,
} = useRightPanel();
const workspaceLayoutRef = ref<HTMLElement | null>(null);
let resizeObserver: ResizeObserver | null = null;

const isAgentSelected = computed(() => selectionStore.selectedType === 'agent');
const isTeamSelected = computed(() => selectionStore.selectedType === 'team');
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

const syncWorkspacePanelWidth = (): void => {
  const width = workspaceLayoutRef.value?.clientWidth ?? null;
  setRightPanelWorkspaceWidth(width && width > 0 ? width : null);
};

onMounted(() => {
  syncWorkspacePanelWidth();

  if (typeof ResizeObserver !== 'undefined' && workspaceLayoutRef.value) {
    resizeObserver = new ResizeObserver(syncWorkspacePanelWidth);
    resizeObserver.observe(workspaceLayoutRef.value);
  }

  window.addEventListener('resize', syncWorkspacePanelWidth);
});

onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  resizeObserver = null;
  window.removeEventListener('resize', syncWorkspacePanelWidth);
  setRightPanelWorkspaceWidth(null);
});
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
