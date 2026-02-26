<template>
  <div class="hidden md:flex flex-1 relative space-x-0 min-h-0">
    <!-- Content Area -->
    <div class="bg-white p-0 flex flex-col min-h-0 flex-1 min-w-[200px]">
      <div class="flex-1 overflow-auto">
        <AgentWorkspaceView v-if="isAgentSelected" />
        <TeamWorkspaceView v-else-if="isTeamSelected" />
        <RunConfigPanel v-else-if="hasPendingRunConfig" />
        <div v-else class="flex items-center justify-center h-full text-gray-500">
          <p>Select or run an agent/team to begin.</p>
        </div>
      </div>
    </div>

    <div class="drag-handle" @mousedown="initDragRightPanel"></div>

    <!-- Right Panel -->
    <div
      v-show="isRightPanelVisible"
      :style="{ width: rightPanelWidth + 'px' }"
      class="bg-white p-0 shadow flex flex-col min-h-0 relative"
    >
      <RightSideTabs />
    </div>

    <RightSidebarStrip v-if="!isRightPanelVisible" />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRightPanel } from '~/composables/useRightPanel';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import RightSideTabs from './RightSideTabs.vue';
import RightSidebarStrip from './RightSidebarStrip.vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

const selectionStore = useAgentSelectionStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();

const { isRightPanelVisible, rightPanelWidth, initDragRightPanel } = useRightPanel();

const isAgentSelected = computed(() => selectionStore.selectedType === 'agent');
const isTeamSelected = computed(() => selectionStore.selectedType === 'team');

const hasPendingRunConfig = computed(() => {
  if (isAgentSelected.value || isTeamSelected.value) {
    return false;
  }

  return Boolean(runConfigStore.config?.agentDefinitionId || teamRunConfigStore.config?.teamDefinitionId);
});
</script>

<style scoped>
.drag-handle {
  width: 4px;
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
