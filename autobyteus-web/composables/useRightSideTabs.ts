
import { ref, computed } from 'vue';
import { useAgentSelectionStore } from '~/stores/agentSelectionStore';
import { useBrowserShellStore } from '~/stores/browserShellStore';

export type TabName = 'files' | 'teamMembers' | 'terminal' | 'vnc' | 'progress' | 'artifacts' | 'browser';

// Global state
const activeTab = ref<TabName>('terminal');

export function useRightSideTabs() {
  const selectionStore = useAgentSelectionStore();
  const browserShellStore = useBrowserShellStore();
  const { t, resolvedLocale } = useLocalization();

  const allTabs = computed(() => {
    resolvedLocale.value;

    return [
      { name: 'files' as TabName, label: t('shell.rightTabs.files'), requires: 'any' },
      { name: 'teamMembers' as TabName, label: t('shell.rightTabs.team'), requires: 'team' },
      { name: 'terminal' as TabName, label: t('shell.rightTabs.terminal'), requires: 'any' },
      { name: 'progress' as TabName, label: t('shell.rightTabs.activity'), requires: 'any' },
      { name: 'artifacts' as TabName, label: t('shell.rightTabs.artifacts'), requires: 'any' },
      { name: 'browser' as TabName, label: t('shell.rightTabs.browser'), requires: 'any' },
      { name: 'vnc' as TabName, label: t('shell.rightTabs.vncViewer'), requires: 'any' },
    ];
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
