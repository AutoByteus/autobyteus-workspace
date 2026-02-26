import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { nextTick } from 'vue';
import { installWorkspaceBackendBindingSync } from '../21.workspaceBackendBindingSync.client';
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore';
import { useWorkspaceStore } from '~/stores/workspace';

describe('workspaceBackendBindingSync plugin installer', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.restoreAllMocks();
  });

  it('resets workspace state when binding revision changes', async () => {
    const windowNodeContextStore = useWindowNodeContextStore();
    const workspaceStore = useWorkspaceStore();
    const resetSpy = vi
      .spyOn(workspaceStore, 'resetWorkspaceStateForBackendContextChange')
      .mockResolvedValue(undefined);

    const stop = installWorkspaceBackendBindingSync();

    windowNodeContextStore.bindingRevision += 1;
    await nextTick();

    expect(resetSpy).toHaveBeenCalledTimes(1);
    expect(resetSpy).toHaveBeenCalledWith({
      reason: 'backend_binding_revision_0_to_1',
      reload: true,
    });

    stop();
  });

  it('stops reacting after unsubscribe', async () => {
    const windowNodeContextStore = useWindowNodeContextStore();
    const workspaceStore = useWorkspaceStore();
    const resetSpy = vi
      .spyOn(workspaceStore, 'resetWorkspaceStateForBackendContextChange')
      .mockResolvedValue(undefined);

    const stop = installWorkspaceBackendBindingSync();
    stop();

    windowNodeContextStore.bindingRevision += 1;
    await nextTick();

    expect(resetSpy).not.toHaveBeenCalled();
  });
});
