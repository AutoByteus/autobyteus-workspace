import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppUpdateStore } from '../appUpdateStore';
import type { AppUpdateState } from '~/shared/appUpdateTypes';

// autobyteus-356: the app's "Update automatically" switch in the window (the shell keeps it).
const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));
vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({ addToast: addToastMock, toasts: { value: [] }, removeToast: vi.fn() }),
}));

const setElectronApiMock = (mock: Partial<Window['electronAPI']> | null): void => {
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: mock });
};
const shellState = (overrides: Partial<AppUpdateState> = {}): AppUpdateState => ({
  status: 'idle', currentVersion: '1.5.6', currentVersionIsPrerelease: false, updateChannel: 'stable', updateStaged: false,
  availableVersion: null, downloadPercent: null, downloadTransferredBytes: null, downloadTotalBytes: null, releaseNotes: null,
  message: '', errorKind: null, errorOperation: null, checkedAt: null, notification: null, autoCheck: null, automaticUpdate: false,
  ...overrides,
});

describe('appUpdateStore automatic update', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    setElectronApiMock(null);
  });

  it('is off by default and follows the shell state', () => {
    const store = useAppUpdateStore();
    expect(store.automaticUpdate).toBe(false);
    store.applyRemoteState({ automaticUpdate: true });
    expect(store.automaticUpdate).toBe(true);
    store.applyRemoteState({ status: 'checking' });
    expect(store.automaticUpdate).toBe(true);
  });

  it('saves through the shell and applies its state', async () => {
    const setAppUpdateAutomatic = vi.fn().mockResolvedValue({ accepted: true, persisted: true, state: shellState({ automaticUpdate: true }) });
    setElectronApiMock({ setAppUpdateAutomatic });
    const store = useAppUpdateStore();
    expect(await store.setAutomaticUpdate(true)).toBe(true);
    expect(setAppUpdateAutomatic).toHaveBeenCalledWith(true);
    expect(store.automaticUpdate).toBe(true);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it('says so when the switch applies for this session only', async () => {
    setElectronApiMock({ setAppUpdateAutomatic: vi.fn().mockResolvedValue({ accepted: true, persisted: false, state: shellState({ automaticUpdate: true }) }) });
    const store = useAppUpdateStore();
    expect(await store.setAutomaticUpdate(true)).toBe(true);
    expect(store.automaticUpdate).toBe(true);
    expect(addToastMock).toHaveBeenCalledWith(expect.stringContaining('Update automatically'), 'error');
  });

  it('a refused change leaves the switch as it was', async () => {
    setElectronApiMock({ setAppUpdateAutomatic: vi.fn().mockResolvedValue({ accepted: false, persisted: false, state: shellState({ automaticUpdate: true }) }) });
    const store = useAppUpdateStore();
    expect(await store.setAutomaticUpdate(true)).toBe(false);
    expect(store.automaticUpdate).toBe(false);
  });

  it('does nothing when this launch never updates the app', async () => {
    const setAppUpdateAutomatic = vi.fn();
    setElectronApiMock({ setAppUpdateAutomatic });
    const store = useAppUpdateStore();
    store.applyRemoteState({ status: 'disabled' });
    expect(await store.setAutomaticUpdate(true)).toBe(false);
    expect(setAppUpdateAutomatic).not.toHaveBeenCalled();
  });

  it('with the switch on, a finished download does not say "restart to install" (it installs at once)', () => {
    const store = useAppUpdateStore();
    store.applyRemoteState({ automaticUpdate: true, status: 'downloading' });
    store.applyRemoteState({ status: 'downloaded' });
    expect(addToastMock).not.toHaveBeenCalled();
    store.applyRemoteState({ automaticUpdate: false, status: 'available' });
    store.applyRemoteState({ status: 'downloaded' });
    expect(addToastMock).toHaveBeenCalledOnce();
  });
});
