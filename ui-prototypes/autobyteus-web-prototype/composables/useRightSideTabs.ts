import { ref, computed } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useBrowserShellStore } from '~/stores/browserShellStore';
import {
  getWorkspaceToolOrder,
  type WorkspaceToolName,
} from '~/utils/layout/workspaceSurfaceOrder';

export type TabName = WorkspaceToolName;

interface RightSideTabDefinition {
  name: TabName
  label: string
  requires: 'any' | 'team'
}

// Global state
const activeTab = ref<TabName>('terminal');

export function useRightSideTabs() {
  const selectionStore = useAgentSelectionStore();
  const browserShellStore = useBrowserShellStore();
  const { t, resolvedLocale } = useLocalization();

  const tabLabels = computed<Record<TabName, string>>(() => {
    resolvedLocale.value;

    return {
      files: t('shell.rightTabs.files'),
      teamMembers: t('shell.rightTabs.team'),
      terminal: t('shell.rightTabs.terminal'),
      progress: t('shell.rightTabs.activity'),
      usage: t('shell.rightTabs.usage'),
      artifacts: t('shell.rightTabs.artifacts'),
      browser: t('shell.rightTabs.browser'),
      vnc: t('shell.rightTabs.vncViewer'),
    };
  });

  const allTabs = computed<RightSideTabDefinition[]>(() => {
    return getWorkspaceToolOrder().map((name) => ({
      name,
      label: tabLabels.value[name],
      requires: name === 'teamMembers' ? 'team' : 'any',
    }));
  });

  const visibleTabs = computed(() => {
    return allTabs.value.filter(tab => {
      if (tab.name === 'browser' && !browserShellStore.browserAvailable) return false;
      if (tab.requires === 'any') return true;
      return tab.requires === selectionStore.selectedType;
    });
  });

  const setActiveTab = (tab: TabName) => {
    activeTab.value = tab;
  };

  return {
    activeTab,
    visibleTabs,
    setActiveTab,
    allTabs // Exporting allTabs if needed for icons mapping
  };
}
