<template>
  <div class="md:hidden flex flex-1 flex-col min-h-0">
    <!-- Mobile Navigation -->
    <div class="flex bg-white shadow p-2 gap-2 overflow-x-auto">
      <button 
        v-for="(tab, index) in availableTabs"
        :key="index"
        @click="handleTabClick(tab.id)"
        :class="[
          'flex-shrink-0 py-2 px-4 rounded-md transition-colors whitespace-nowrap',
          activeMobilePanel === tab.id ? 'bg-blue-500 text-white' : 'bg-gray-100'
        ]"
      >
        {{ tab.label }}
      </button>
    </div>

    <!-- Mobile Panels -->
    <div class="flex-1 bg-white shadow overflow-hidden relative mt-2"> 
      <!-- File Explorer -->
      <div v-if="hasActiveWorkspace" v-show="activeMobilePanel === 'explorer'" class="h-full p-0 overflow-auto">
        <FileExplorer />
      </div>

      <!-- Content Viewer -->
      <div v-show="activeMobilePanel === 'content'" class="h-full p-0 overflow-auto">
        <FileExplorerTabs :expandedMode="true" />
      </div>

      <!-- Running Panel -->
      <div v-show="activeMobilePanel === 'running'" class="h-full p-0 overflow-auto flex flex-col">
          <!-- View Toggle -->
          <div class="flex-shrink-0 p-2 border-b border-gray-200 bg-gray-50 flex gap-2">
            <button 
                @click="runningViewMode = 'list'"
                class="flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors border"
                :class="runningViewMode === 'list' 
                    ? 'bg-white text-blue-600 border-gray-300 shadow-sm' 
                    : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-200'"
            >{{ $t('shell.components.layout.WorkspaceMobileLayout.running_list') }}</button>
            <button 
                @click="runningViewMode = 'config'"
                class="flex-1 py-1.5 px-3 rounded-md text-sm font-medium transition-colors border"
                :class="runningViewMode === 'config' 
                    ? 'bg-white text-blue-600 border-gray-300 shadow-sm' 
                    : 'bg-transparent text-gray-500 border-transparent hover:bg-gray-200'"
            >
                {{ $t('shell.mobile.configuration') }}
            </button>
          </div>

          <!-- Content -->
          <div class="flex-1 overflow-auto bg-white">
            <RunningAgentsPanel v-show="runningViewMode === 'list'" />
            <RunConfigPanel v-show="runningViewMode === 'config'" />
          </div>
      </div>

      <!-- Main Interaction View (Agent or Team) -->
      <div v-show="activeMobilePanel === 'main'" class="relative h-full p-0 overflow-auto">
        <AgentWorkspaceView v-if="selectionStore.selectedType === 'agent'" />
        <TeamWorkspaceView v-else-if="selectionStore.selectedType === 'team'" />
        <div v-else class="flex items-center justify-center h-full text-gray-500">
          <p>{{ $t('shell.components.layout.WorkspaceMobileLayout.select_or_run_an_agent_team') }}</p>
        </div>
        <WorkspaceCenterLoadingOverlay v-if="isCenterLoading" />
      </div>

      <!-- Right Side Tools (Terminal, VNC etc) -->
      <div v-show="activeMobilePanel === 'tools'" class="h-full p-0 overflow-auto">
        <RightSideTabs />
      </div>
    </div>

    <!-- Floating action buttons -->
    <div class="fixed bottom-4 right-4 flex flex-col gap-2">
      <!-- Content editor button -->
      <button
        v-if="showFileContent && activeMobilePanel !== 'content'"
        @click="activeMobilePanel = 'content'"
        class="px-4 py-2 bg-blue-500 text-white rounded shadow-lg z-20 text-sm"
      >{{ $t('shell.components.layout.WorkspaceMobileLayout.open_editor') }}</button>

      <!-- Agent profile button -->
      <button
        v-if="activeMobilePanel === 'main' && !selectionStore.selectedRunId"
        @click="activeMobilePanel = 'running'"
        class="px-4 py-2 bg-blue-500 text-white rounded shadow-lg z-20 text-sm"
      >{{ $t('shell.components.layout.WorkspaceMobileLayout.open_running') }}</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { storeToRefs } from 'pinia';
import FileExplorer from '~/components/fileExplorer/FileExplorer.vue';
import FileExplorerTabs from '~/components/fileExplorer/FileExplorerTabs.vue';
import RunningAgentsPanel from '~/components/workspace/running/RunningAgentsPanel.vue';
import RunConfigPanel from '~/components/workspace/config/RunConfigPanel.vue';
import AgentWorkspaceView from '~/components/workspace/agent/AgentWorkspaceView.vue';
import TeamWorkspaceView from '~/components/workspace/team/TeamWorkspaceView.vue'; // Import Team View
import WorkspaceCenterLoadingOverlay from '~/components/layout/WorkspaceCenterLoadingOverlay.vue';
import RightSideTabs from './RightSideTabs.vue';
import { useMobilePanels } from '~/composables/useMobilePanels';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useRunHistoryStore } from '~/stores/runHistoryStore';
import { useWorkspaceStore } from '~/stores/workspace';
import { useAgentRunConfigStore } from '~/stores/agentRunConfigStore';
import { useTeamRunConfigStore } from '~/stores/teamRunConfigStore';

const props = defineProps<{  
  showFileContent: boolean
}>();

const selectionStore = useAgentSelectionStore();
const runHistoryStore = useRunHistoryStore();
const workspaceStore = useWorkspaceStore();
const runConfigStore = useAgentRunConfigStore();
const teamRunConfigStore = useTeamRunConfigStore();
const { activeMobilePanel } = useMobilePanels();
const { t } = useLocalization();

const hasActiveWorkspace = computed(() => !!workspaceStore.activeWorkspace);
const isCenterLoading = computed(() => runHistoryStore.openingRun);

// --- Mobile Running Tab Logic ---
const runningViewMode = ref<'list' | 'config'>('list');

// Watch for new run configuration to switch to config view
watch(
  [() => runConfigStore.config, () => teamRunConfigStore.config],
  ([newAgentConfig, newTeamConfig]) => {
    // Only switch if we are NOT in selection mode (meaning we are setting up a NEW run)
    // and a config just appeared.
    if (!selectionStore.selectedRunId) {
      if ((newAgentConfig?.agentDefinitionId || newTeamConfig?.teamDefinitionId)) {
        runningViewMode.value = 'config';
        // Ensure we are on the running panel
        if (activeMobilePanel.value !== 'running') {
            activeMobilePanel.value = 'running';
        }
      }
    }
  },
  { deep: true }
);

const availableTabs = computed(() => {
  const mainTabLabel = selectionStore.selectedType === 'team'
    ? t('shell.mobile.team')
    : t('shell.mobile.agent');

  const tabs = [
    { id: 'running', label: t('shell.mobile.running') },
    ...(hasActiveWorkspace.value ? [{ id: 'explorer', label: t('shell.mobile.files') }] : []),
    { id: 'main', label: mainTabLabel },
    { id: 'tools', label: t('shell.mobile.tools') }
  ];

  if (props.showFileContent && hasActiveWorkspace.value) {
    const explorerIndex = tabs.findIndex(t => t.id === 'explorer');
    if (explorerIndex !== -1) {
      tabs.splice(explorerIndex + 1, 0, { id: 'content', label: t('shell.mobile.content') });
    }
  }

  return tabs;
});

const handleTabClick = (tabId: string) => {
  if (tabId === 'main' && !selectionStore.selectedRunId) {
    activeMobilePanel.value = 'running';
  } else {
    activeMobilePanel.value = tabId;
  }
}
</script>

<style scoped>
.h-full {
  transition: all 0.3s ease-in-out;
}

.fixed {
  position: fixed;
}

.overflow-x-auto {
  -webkit-overflow-scrolling: touch;
}
</style>
