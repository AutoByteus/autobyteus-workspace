<template>
  <div class="flex flex-col h-full bg-white">
    <!-- Header with Tabs and Toggle -->
    <div class="flex items-center justify-between bg-white pt-2 pr-1 border-b border-gray-200">
      <TabList
        class="flex-1 min-w-0"
        data-test="right-side-tab-list"
        :tabs="visibleTabs"
        :selected-tab="effectiveActiveTab"
        :aria-label="$t('shell.rightTabs.ariaLabel')"
        @select="handleTabSelect"
      />
      <button 
        v-if="showPanelToggle"
        data-test="right-side-panel-toggle"
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
      <div
        v-if="shouldMountFilesPanel"
        v-show="isFilesTabActive"
        class="h-full min-h-0"
        data-test="right-side-files-panel"
      >
        <FileExplorerLayout :active="isFilesTabActive" :layout="fileExplorerLayout" />
      </div>
      <div v-if="effectiveActiveTab === 'teamMembers'" class="h-full min-h-0">
        <TeamOverviewPanel />
      </div>
      <div
        v-if="shouldMountTerminalPanel"
        v-show="isTerminalTabActive"
        class="h-full min-h-0"
        data-test="right-side-terminal-panel"
      >
        <TerminalPanel :active="isTerminalTabActive" />
      </div>
      <div v-if="effectiveActiveTab === 'vnc'" class="h-full min-h-0">
        <VncViewer />
      </div>
      <div v-if="effectiveActiveTab === 'artifacts'" class="h-full min-h-0">
        <ArtifactsTab />
      </div>
      <div v-if="effectiveActiveTab === 'browser'" class="h-full min-h-0">
        <BrowserPanel />
      </div>
      <div v-if="effectiveActiveTab === 'progress'" class="h-full min-h-0">
        <ProgressPanel />
      </div>
      <div v-if="effectiveActiveTab === 'usage'" class="h-full min-h-0">
        <TokenUsageMeterPanel />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useAgentTodoStore } from '~/stores/agentTodoStore';
import { useRightPanel } from '~/composables/useRightPanel';
import { useRightPanelOpenFileAutoSwitch } from '~/composables/useRightPanelOpenFileAutoSwitch';
import { useRightSideTabs } from '~/composables/useRightSideTabs';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import TabList from '~/components/tabs/TabList.vue';
import TeamOverviewPanel from '~/components/workspace/team/TeamOverviewPanel.vue';
import TerminalPanel from '~/components/workspace/tools/TerminalPanel.vue';
import VncViewer from '~/components/workspace/tools/VncViewer.vue';
import FileExplorerLayout from '~/components/fileExplorer/FileExplorerLayout.vue';
import ArtifactsTab from '~/components/workspace/agent/ArtifactsTab.vue';
import ProgressPanel from '~/components/progress/ProgressPanel.vue';
import BrowserPanel from '~/components/workspace/tools/BrowserPanel.vue';
import TokenUsageMeterPanel from '~/components/workspace/usage/TokenUsageMeterPanel.vue';

const props = withDefaults(defineProps<{
  mode?: 'desktop' | 'drawer' | 'mobile-tools'
}>(), {
  mode: 'desktop',
});

const selectionStore = useAgentSelectionStore();
const activeContextStore = useActiveContextStore();
const todoStore = useAgentTodoStore();

const { activeTab, visibleTabs: baseVisibleTabs, setActiveTab } = useRightSideTabs();
const { toggleRightPanel } = useRightPanel();

const currentAgentRunId = computed(() => activeContextStore.activeAgentContext?.state.runId ?? '');
const filesTabEnabled = computed(() => props.mode !== 'mobile-tools');
const fileExplorerLayout = computed(() => props.mode === 'desktop' ? 'split' : 'stacked');
const showPanelToggle = computed(() => props.mode === 'desktop');
const visibleTabs = computed(() =>
  filesTabEnabled.value
    ? baseVisibleTabs.value
    : baseVisibleTabs.value.filter((tab) => tab.name !== 'files'),
);
const effectiveActiveTab = computed(() => {
  if (filesTabEnabled.value || activeTab.value !== 'files') {
    return activeTab.value;
  }
  return visibleTabs.value[0]?.name ?? 'terminal';
});
const hasOpenedFilesTab = ref(false);
const hasOpenedTerminalTab = ref(false);
const isFilesTabActive = computed(() => filesTabEnabled.value && effectiveActiveTab.value === 'files');
const isTerminalTabActive = computed(() => effectiveActiveTab.value === 'terminal');
const shouldMountFilesPanel = computed(() => filesTabEnabled.value && hasOpenedFilesTab.value);
const shouldMountTerminalPanel = computed(() => hasOpenedTerminalTab.value);

const handleTabSelect = (tabName: string) => {
  if (!filesTabEnabled.value && tabName === 'files') {
    return;
  }
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

watch(isFilesTabActive, (isActive) => {
  if (isActive) {
    hasOpenedFilesTab.value = true;
  }
}, { immediate: true });

watch(isTerminalTabActive, (isActive) => {
  if (isActive) {
    hasOpenedTerminalTab.value = true;
  }
}, { immediate: true });

// Watch the ToDo list for the active agent. If it becomes populated, switch to the To-Do tab.
watch(() => currentAgentRunId.value ? todoStore.getTodos(currentAgentRunId.value) : [], (newTodoList) => {
  if (selectionStore.selectedType === 'agent' && newTodoList.length > 0 && activeTab.value !== 'progress') {
    setActiveTab('progress');
  }
});

useRightPanelOpenFileAutoSwitch({ filesTabEnabled });

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
