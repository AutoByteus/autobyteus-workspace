import { watch } from 'vue';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';

export function installWorkspaceBackendBindingSync(): (() => void) {
  const windowNodeContextStore = useWindowNodeContextStore();
  const workspaceStore = useWorkspaceStore();

  return watch(
    () => windowNodeContextStore.bindingRevision,
    (nextRevision, previousRevision) => {
      if (previousRevision === undefined || nextRevision === previousRevision) {
        return;
      }

      void workspaceStore.resetWorkspaceStateForBackendContextChange({
        reason: `backend_binding_revision_${previousRevision}_to_${nextRevision}`,
        reload: true,
      });
    },
  );
}

export default defineNuxtPlugin(() => {
  if (!process.client) {
    return;
  }

  installWorkspaceBackendBindingSync();
});
