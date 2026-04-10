<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header with Tabs and Toggle -->
    <div class="flex items-center justify-between bg-white pt-2 pr-1 border-b border-gray-200">
      <TabList
        class="flex-1 min-w-0"
        :tabs="visibleTabs"
        :selected-tab="activeTab"
        @select="handleTabSelect"
      />
      <button 
        @click="toggleRightPanel"
        class="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors mr-2 flex-shrink-0"
        :title="$t('shell.components.layout.RightSideTabs.toggle_sidebar')"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <rect width="18" height="18" x="3" y="3" rx="2"/>
          <path d="M15 3v18"/>
        </svg>
      </button>
    </div>

    <!-- Tab Content -->
    <div data-test="right-side-tab-content-shell" class="flex-1 min-h-0 overflow-hidden relative">
      <div v-if="activeTab === 'files'" class="h-full min-h-0">
        <FileExplorerLayout />
      </div>
      <div v-if="activeTab === 'teamMembers'" class="h-full min-h-0">
        <TeamOverviewPanel />
      </div>
      <div v-if="activeTab === 'terminal'" class="h-full min-h-0">
        <Terminal />
      </div>
      <div v-if="activeTab === 'vnc'" class="h-full min-h-0">
        <VncViewer />
      </div>
      <div v-if="activeTab === 'artifacts'" class="h-full min-h-0">
        <ArtifactsTab />
      </div>
      <div v-if="activeTab === 'browser'" class="h-full min-h-0">
        <BrowserPanel />
      </div>
      <div v-if="activeTab === 'progress'" class="h-full min-h-0">
        <ProgressPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, watch } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTodoStore } from '~/stores/agentTodoStore';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useAgentArtifactsStore } from '~/stores/agentArtifactsStore';
import { useRunFileChangesStore } from '~/stores/runFileChangesStore';
import { useAgentActivityStore } from '~/stores/agentActivityStore';
import TabList from '~/components/tabs/TabList.vue';
import TeamOverviewPanel from '~/components/workspace/team/TeamOverviewPanel.vue';
import Terminal from '~/components/workspace/tools/Terminal.vue';
import VncViewer from '~/components/workspace/tools/VncViewer.vue';
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue';
import ArtifactsTab from '~/components/workspace/agent/ArtifactsTab.vue';
import ProgressPanel from '~/components/progress/ProgressPanel.vue';
import BrowserPanel from '~/components/workspace/tools/BrowserPanel.vue';
import { useWorkspaceStore } from '~/stores/workspace';

const selectionStore = useAgentSelectionStore();
const activeContextStore = useActiveContextStore();
const fileExplorerStore = useFileExplorerStore();
const artifactsStore = useAgentArtifactsStore();
const runFileChangesStore = useRunFileChangesStore();
const todoStore = useAgentTodoStore();
const activityStore = useAgentActivityStore();
const workspaceStore = useWorkspaceStore();

const { activeTab, visibleTabs, setActiveTab } = useRightSideTabs();
const { toggleRightPanel } = useRightPanel();

const currentAgentRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? '');
const latestVisibleArtifactSignal = computed(() =>
  `${runFileChangesStore.getLatestVisibleArtifactSignalForRun(currentAgentRunId.value) ?? ''}|${artifactsStore.getLatestVisibleArtifactSignalForRun(currentAgentRunId.value) ?? ''}`,
);

const handleTabSelect = (tabName: string) => {
  setActiveTab(tabName as any);
};

// Watch for changes in the selected profile type to adjust the active tab via the composable logic
watch(() => selectionStore.selectedType, (newType) => {
  if (newType === 'team') {
    setActiveTab('teamMembers');
  } else if (newType === 'agent') {
    setActiveTab('progress');
  }
}, { immediate: true });

// Watch for changes in visible tabs to ensure the active tab is always valid
watch(visibleTabs, (newVisibleTabs) => {
  const isCurrentTabVisible = newVisibleTabs.some(tab => tab.name === activeTab.value);
  if (!isCurrentTabVisible && newVisibleTabs.length > 0) {
    setActiveTab(newVisibleTabs[0].name);
  }
});

// Watch the ToDo list for the active agent. If it becomes populated, switch to the To-Do tab.
// Watch the ToDo list for the active agent. If it becomes populated, switch to the To-Do tab.
watch(() => currentAgentRunId.value ? todoStore.getTodos(currentAgentRunId.value) : [], (newTodoList) => {
  if (selectionStore.selectedType === 'agent' && newTodoList.length > 0 && activeTab.value !== 'progress') {
    setActiveTab('progress');
  }
});

// Auto-switch to Files tab when a file is opened
watch(() => {
    const wsId = activeContextStore.activeConfig?.workspaceId || (selectionStore.selectedType === 'team' ? workspaceStore.activeWorkspace?.workspaceId : null);
    const targetId = wsId || workspaceStore.activeWorkspace?.workspaceId || '';
    if (!targetId) return [];
    return fileExplorerStore.getOpenFiles(targetId);
}, (openFiles) => {
  if (openFiles.length > 0 && activeTab.value !== 'files') {
    setActiveTab('files');
  }
}, { deep: true });

// Auto-switch to Artifacts tab when a touched file becomes newly visible
watch(latestVisibleArtifactSignal, (newSignal) => {
  if (newSignal !== '|' && activeTab.value !== 'artifacts') {
    setActiveTab('artifacts');
  }
});

// Auto-switch to Activity tab on approval request
const hasAwaitingApproval = computed(() => {
  if (!currentAgentRunId.value) return false;
  return activityStore.hasAwaitingApproval(currentAgentRunId.value);
});

watch(hasAwaitingApproval, (newVal) => {
  if (newVal && activeTab.value !== 'progress') {
    setActiveTab('progress');
  }
});

// Auto-switch to Progress tab when an activity is highlighted (e.g. running tool)
const highlightedActivityId = computed(() => {
  if (!currentAgentRunId.value) return null;
  return activityStore.getHighlightedActivityId(currentAgentRunId.value);
});

watch(highlightedActivityId, (newVal) => {
  if (newVal && activeTab.value !== 'progress') {
    setActiveTab('progress');
  }
});

</script>

<style scoped>
/* Ensure content fills available space */
.flex-grow {
  display: flex;
  flex-direction: column;
}

.h-full {
  height: 100%;
}
</style>
