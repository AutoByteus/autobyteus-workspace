import { ref, computed, onBeforeUnmount, watch } from 'vue';
import { useBrowserShellStore } from '~/stores/browserShellStore';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { isFeatureAvailableInRuntime } from '~/utils/mobileFeatureGates';
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

/*
 * Contextual default tab (D-17, AR-010): Team members for a collaboration scope, Activity for a
 * standalone run. It is applied when a tabs host mounts or the scope changes, and only when the
 * scope differs from the last one it was applied for, so reopening the same run keeps its tab.
 * A tab chosen explicitly (strip or tab bar) while no host is mounted wins at the next mount.
 */
const lastAppliedScopeKey = ref<string | null | undefined>(undefined);
const pendingExplicitTab = ref<TabName | null>(null);
let mountedTabHosts = 0;

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
      projects: t('shell.rightTabs.projects'),
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
    // Projects is on desktop only; the mobile runtime has no Projects (mobileFeatureGates).
    return getWorkspaceToolOrder({ includeProjects: isFeatureAvailableInRuntime('projects') }).map((name) => ({
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

  /** The collaboration scope key, else `standalone:<runId>` for a standalone run, else null. */
  const contextualScopeKey = computed<string | null>(() => {
    const target = activeContextStore.activeWorkspaceTarget;
    if (messages.value) return `${messages.value.rootKind}:${messages.value.rootRunId}`;
    return target?.kind === 'standalone_agent' ? `standalone:${target.context.state.runId}` : null;
  });

  /** A user's tab choice (strip or tab bar); it is not overridden by a contextual default. */
  const selectTabExplicitly = (tab: TabName) => {
    activeTab.value = tab;
    if (mountedTabHosts === 0) {
      pendingExplicitTab.value = tab;
    } else {
      lastAppliedScopeKey.value = contextualScopeKey.value;
    }
  };

  const applyContextualDefault = () => {
    const scopeKey = contextualScopeKey.value;
    if (pendingExplicitTab.value) {
      activeTab.value = pendingExplicitTab.value;
      pendingExplicitTab.value = null;
      lastAppliedScopeKey.value = scopeKey;
      return;
    }
    if (scopeKey === lastAppliedScopeKey.value) return;
    lastAppliedScopeKey.value = scopeKey;
    // Projects is not tied to a conversation scope: opening a worker from it keeps it (REQ-009).
    if (activeTab.value === 'projects') return;
    if (!scopeKey) return;
    activeTab.value = messages.value ? 'teamMembers' : 'progress';
  };

  /**
   * Registers the calling component as a mounted tabs host: applies the contextual default now
   * (consuming a pending explicit choice) and whenever the scope changes.
   */
  const useContextualDefaultTab = () => {
    applyContextualDefault();
    mountedTabHosts += 1;
    watch(contextualScopeKey, applyContextualDefault);
    onBeforeUnmount(() => { mountedTabHosts -= 1; });
  };

  return {
    activeTab,
    visibleTabs,
    setActiveTab,
    selectTabExplicitly,
    contextualScopeKey,
    useContextualDefaultTab,
    allTabs // Exporting allTabs if needed for icons mapping
  };
}
