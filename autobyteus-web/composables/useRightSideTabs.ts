import { ref, computed } from 'vue';
import { useBrowserShellStore } from '~/stores/browserShellStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import {
  getWorkspaceToolOrder,
  type WorkspaceToolName,
} from '~/utils/layout/workspaceSurfaceOrder';

export type TabName = WorkspaceToolName;

interface RightSideTabDefinition {
  name: TabName
  label: string
  ariaLabel?: string
  requires: 'any' | 'messages'
}

// Global state
const activeTab = ref<TabName>('terminal');

export function useRightSideTabs() {
  const browserShellStore = useBrowserShellStore();
  const activeContextStore = useActiveContextStore();
  const { t, resolvedLocale } = useLocalization();
  const messages = computed(() => {
    const target = activeContextStore.activeWorkspaceTarget;
    return target && 'collaborationMessages' in target ? target.collaborationMessages : null;
  });

  const tabLabels = computed<Record<TabName, string>>(() => {
    resolvedLocale.value;

    return {
      files: t('shell.rightTabs.files'),
      teamMembers: messages.value?.rootKind === 'agent_org'
        ? t('shell.rightTabs.org')
        : t('shell.rightTabs.team'),
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
      ariaLabel: name === 'teamMembers' && messages.value?.rootKind === 'agent_org'
        ? t('shell.rightTabs.agentOrg')
        : undefined,
      requires: name === 'teamMembers' ? 'messages' : 'any',
    }));
  });

  const visibleTabs = computed(() => {
    return allTabs.value.filter(tab => {
      if (tab.name === 'browser' && !browserShellStore.browserAvailable) return false;
      if (tab.requires === 'any') return true;
      return tab.requires === 'messages' && Boolean(messages.value);
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
