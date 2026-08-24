import { computed, watch, type Ref } from 'vue';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useFileExplorerStore } from '~/stores/fileExplorer';
import { useWorkspaceStore } from '~/stores/workspace';
import { useRightSideTabs } from '~/composables/useRightSideTabs';

type RightPanelOpenFileAutoSwitchOptions = {
  filesTabEnabled: Ref<boolean>;
};

export function useRightPanelOpenFileAutoSwitch({
  filesTabEnabled,
}: RightPanelOpenFileAutoSwitchOptions) {
  const activeContextStore = useActiveContextStore();
  const fileExplorerStore = useFileExplorerStore();
  const workspaceStore = useWorkspaceStore();
  const { activeTab, setActiveTab } = useRightSideTabs();

  const targetWorkspaceId = computed(() => {
    const configWorkspaceId =
      activeContextStore.activeConfig?.workspaceMetadata?.workspaceId ||
      activeContextStore.activeConfig?.workspaceId ||
      null;
    if (configWorkspaceId) return configWorkspaceId;

    return workspaceStore.activeWorkspaceMetadata?.workspaceId ||
      workspaceStore.activeWorkspace?.workspaceId ||
      '';
  });

  const openFilesForTarget = computed(() => {
    const workspaceId = targetWorkspaceId.value;
    if (!workspaceId) return [];
    return fileExplorerStore.getOpenFiles(workspaceId);
  });

  watch(openFilesForTarget, (openFiles) => {
    if (filesTabEnabled.value && openFiles.length > 0 && activeTab.value !== 'files') {
      setActiveTab('files');
    }
  }, { deep: true });

  return {
    targetWorkspaceId,
    openFilesForTarget,
  };
}
