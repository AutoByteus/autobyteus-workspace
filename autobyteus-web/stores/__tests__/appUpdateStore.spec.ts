import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppUpdateStore } from '../appUpdateStore';

const { addToastMock } = vi.hoisted(() => ({
  addToastMock: vi.fn(),
}));

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
    toasts: { value: [] },
    removeToast: vi.fn(),
  }),
}));

function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', {
    configurable: true,
    writable: true,
    value: mock,
  });
}

describe('appUpdateStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    setElectronApiMock(null);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('initializes safely when Electron bridge is unavailable', async () => {
    const store = useAppUpdateStore();

    await store.initialize();

    expect(store.initialized).toBe(true);
    expect(store.isElectron).toBe(false);
    expect(store.shouldShow).toBe(false);
  });

  it('loads initial state and reacts to update-state events', async () => {
    let listener: ((payload: any) => void) | null = null;

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'available',
        currentVersion: '1.1.9',
        availableVersion: '1.2.0',
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: 'Release notes',
        message: 'Version 1.2.0 is available.',
        errorKind: null,
        errorOperation: null,
        checkedAt: '2026-02-26T00:00:00.000Z',
      }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
        listener = callback;
        return vi.fn();
      }),
    });

    const store = useAppUpdateStore();
    await store.initialize();

    expect(store.status).toBe('available');
    expect(store.availableVersion).toBe('1.2.0');
    expect(store.shouldShow).toBe(true);

    listener?.({
      status: 'downloaded',
      message: 'Update downloaded. Restart to install.',
      currentVersion: '1.1.9',
      availableVersion: '1.2.0',
      downloadPercent: 100,
      downloadTransferredBytes: 100,
      downloadTotalBytes: 100,
      releaseNotes: null,
      errorKind: null,
      errorOperation: null,
      checkedAt: '2026-02-26T00:00:00.000Z',
    });

    expect(store.status).toBe('downloaded');
    expect(store.downloadPercent).toBe(100);
    expect(addToastMock).toHaveBeenCalledWith('Update downloaded. Restart to install.', 'success');
  });

  it('runs check/download/install actions through electron API', async () => {
    const checkForAppUpdates = vi.fn().mockResolvedValue({
      status: 'available',
      currentVersion: '1.1.9',
      availableVersion: '1.2.0',
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
      releaseNotes: null,
      message: 'Version 1.2.0 is available.',
      errorKind: null,
      errorOperation: null,
      checkedAt: '2026-02-26T00:00:00.000Z',
    });

    const downloadAppUpdate = vi.fn().mockResolvedValue({
      status: 'downloading',
      currentVersion: '1.1.9',
      availableVersion: '1.2.0',
      downloadPercent: 24,
      downloadTransferredBytes: 24,
      downloadTotalBytes: 100,
      releaseNotes: null,
      message: 'Downloading update...',
      errorKind: null,
      errorOperation: null,
      checkedAt: '2026-02-26T00:00:00.000Z',
    });

    const installAppUpdateAndRestart = vi.fn().mockResolvedValue({ accepted: true });

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '1.1.9',
        availableVersion: null,
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: '',
        errorKind: null,
        errorOperation: null,
        checkedAt: null,
      }),
      onAppUpdateState: vi.fn().mockReturnValue(vi.fn()),
      checkForAppUpdates,
      downloadAppUpdate,
      installAppUpdateAndRestart,
    });

    const store = useAppUpdateStore();
    await store.initialize();

    await store.checkForUpdates();
    expect(checkForAppUpdates).toHaveBeenCalledTimes(1);
    expect(store.status).toBe('available');

    await store.downloadUpdate();
    expect(downloadAppUpdate).toHaveBeenCalledTimes(1);
    expect(store.status).toBe('downloading');

    await store.installUpdateAndRestart();
    expect(installAppUpdateAndRestart).toHaveBeenCalledTimes(1);
  });

  it('enters installing state immediately when restart installation is triggered', async () => {
    const installAppUpdateAndRestart = vi.fn().mockResolvedValue({ accepted: true });

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'downloaded',
        currentVersion: '1.1.9',
        availableVersion: '1.2.0',
        downloadPercent: 100,
        downloadTransferredBytes: 100,
        downloadTotalBytes: 100,
        releaseNotes: null,
        message: 'Update downloaded. Restart to install.',
        errorKind: null,
        errorOperation: null,
        checkedAt: '2026-02-26T00:00:00.000Z',
      }),
      onAppUpdateState: vi.fn().mockReturnValue(vi.fn()),
      installAppUpdateAndRestart,
    });

    const store = useAppUpdateStore();
    await store.initialize();

    await store.installUpdateAndRestart();

    expect(installAppUpdateAndRestart).toHaveBeenCalledTimes(1);
    expect(store.status).toBe('installing');
    expect(store.message).toContain('The app will close automatically');
  });

  it('dismisses currently available update notice', async () => {
    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'available',
        currentVersion: '1.1.9',
        availableVersion: '1.2.0',
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: 'Version 1.2.0 is available.',
        errorKind: null,
        errorOperation: null,
        checkedAt: '2026-02-26T00:00:00.000Z',
      }),
      onAppUpdateState: vi.fn().mockReturnValue(vi.fn()),
    });

    const store = useAppUpdateStore();
    await store.initialize();

    expect(store.shouldShow).toBe(true);
    store.dismissNotice();
    expect(store.shouldShow).toBe(false);
  });

  it('keeps no-update notice visible for at least three seconds', async () => {
    vi.useFakeTimers();
    let listener: ((payload: any) => void) | null = null;

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '1.1.12',
        availableVersion: null,
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: '',
        errorKind: null,
        errorOperation: null,
        checkedAt: null,
      }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
        listener = callback;
        return vi.fn();
      }),
    });

    const store = useAppUpdateStore();
    await store.initialize();

    listener?.({
      status: 'no-update',
      message: 'You already have the latest version.',
      currentVersion: '1.1.12',
      availableVersion: null,
      checkedAt: '2026-02-27T00:00:00.000Z',
    });

    expect(store.shouldShow).toBe(true);
    vi.advanceTimersByTime(2999);
    expect(store.shouldShow).toBe(true);
    vi.advanceTimersByTime(1);
    expect(store.shouldShow).toBe(false);
  });

  it('cancels pending no-update auto-hide when a new state arrives', async () => {
    vi.useFakeTimers();
    let listener: ((payload: any) => void) | null = null;

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '1.1.12',
        availableVersion: null,
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: '',
        errorKind: null,
        errorOperation: null,
        checkedAt: null,
      }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
        listener = callback;
        return vi.fn();
      }),
    });

    const store = useAppUpdateStore();
    await store.initialize();

    listener?.({
      status: 'no-update',
      message: 'You already have the latest version.',
      currentVersion: '1.1.12',
      availableVersion: null,
      checkedAt: '2026-02-27T00:00:00.000Z',
    });
    expect(store.shouldShow).toBe(true);

    listener?.({
      status: 'available',
      message: 'Version 1.1.13 is available.',
      currentVersion: '1.1.12',
      availableVersion: '1.1.13',
      checkedAt: '2026-02-27T00:00:05.000Z',
    });
    vi.advanceTimersByTime(3000);

    expect(store.status).toBe('available');
    expect(store.shouldShow).toBe(true);
  });

  it('keeps startup transient update errors quiet and avoids raw diagnostic toasts', async () => {
    let listener: ((payload: any) => void) | null = null;

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '1.1.12',
        availableVersion: null,
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: '',
        errorKind: null,
        errorOperation: null,
        checkedAt: null,
      }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
        listener = callback;
        return vi.fn();
      }),
    });

    const store = useAppUpdateStore();
    await store.initialize();
    addToastMock.mockClear();

    listener?.({
      status: 'error',
      currentVersion: '1.1.12',
      message: 'net::ERR_CONNECTION_CLOSED',
      errorKind: 'network',
      errorOperation: 'startup-check',
      checkedAt: '2026-02-27T00:00:00.000Z',
    });

    expect(store.status).toBe('error');
    expect(store.shouldShow).toBe(false);
    expect(addToastMock).not.toHaveBeenCalled();
  });

  it('shows manual update errors with safe toast copy and dedupes repeated error events', async () => {
    let listener: ((payload: any) => void) | null = null;

    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({
        status: 'idle',
        currentVersion: '1.1.12',
        availableVersion: null,
        downloadPercent: null,
        downloadTransferredBytes: null,
        downloadTotalBytes: null,
        releaseNotes: null,
        message: '',
        errorKind: null,
        errorOperation: null,
        checkedAt: null,
      }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
        listener = callback;
        return vi.fn();
      }),
    });

    const store = useAppUpdateStore();
    await store.initialize();
    addToastMock.mockClear();

    const payload = {
      status: 'error',
      currentVersion: '1.1.12',
      message: 'Cannot find latest-mac.yml in https://example.invalid/latest-mac.yml',
      errorKind: 'release-preparing',
      errorOperation: 'manual-check',
      checkedAt: '2026-02-27T00:00:00.000Z',
    };

    listener?.(payload);
    listener?.({
      ...payload,
      errorOperation: 'updater-event',
      checkedAt: '2026-02-27T00:00:01.000Z',
    });

    expect(store.shouldShow).toBe(true);
    expect(addToastMock).toHaveBeenCalledTimes(1);
    expect(addToastMock.mock.calls[0][0]).toContain('still being prepared');
    expect(addToastMock.mock.calls[0][0]).not.toContain('latest-mac.yml');
    expect(addToastMock.mock.calls[0][0]).not.toContain('example.invalid');
  });

  describe('update channel', () => {
    const remoteState = (overrides: Record<string, unknown> = {}) => ({
      status: 'no-update',
      currentVersion: '1.4.90-beta.1',
      currentVersionIsPrerelease: true,
      updateChannel: 'beta',
      updateStaged: false,
      availableVersion: null,
      downloadPercent: null,
      downloadTransferredBytes: null,
      downloadTotalBytes: null,
      releaseNotes: null,
      message: 'You already have the latest version.',
      errorKind: null,
      errorOperation: null,
      checkedAt: '2026-09-27T00:00:00.000Z',
      ...overrides,
    });

    it('defaults to the stable channel on a stable build', () => {
      const store = useAppUpdateStore();

      expect(store.updateChannel).toBe('stable');
      expect(store.currentVersionIsPrerelease).toBe(false);
    });

    it('mirrors channel, pre-release and staged fields from remote state', async () => {
      let listener: ((payload: any) => void) | undefined;
      setElectronApiMock({
        getAppUpdateState: vi.fn().mockResolvedValue(remoteState({ status: 'idle' })),
        onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => {
          listener = callback;
          return vi.fn();
        }),
      });

      const store = useAppUpdateStore();
      await store.initialize();

      expect(store.updateChannel).toBe('beta');
      expect(store.currentVersionIsPrerelease).toBe(true);
      expect(store.updateStaged).toBe(false);

      listener!(remoteState({ status: 'downloaded', updateStaged: true }));
      listener!(remoteState({ status: 'available', updateStaged: true, availableVersion: '1.4.90-beta.2' }));

      expect(store.status).toBe('available');
      expect(store.updateStaged).toBe(true);
    });

    it('keeps channel facts when a manual check IPC call fails', async () => {
      setElectronApiMock({
        getAppUpdateState: vi.fn().mockResolvedValue(remoteState({ status: 'downloaded', updateStaged: true })),
        onAppUpdateState: vi.fn().mockReturnValue(vi.fn()),
        checkForAppUpdates: vi.fn().mockRejectedValue(new Error('ipc boom')),
      });

      const store = useAppUpdateStore();
      await store.initialize();
      await store.checkForUpdates();

      expect(store.status).toBe('error');
      expect(store.updateChannel).toBe('beta');
      expect(store.updateStaged).toBe(true);
      expect(store.currentVersionIsPrerelease).toBe(true);
    });

    it('applies the returned state when the change is accepted and saved', async () => {
      const setAppUpdateChannel = vi.fn().mockResolvedValue({
        accepted: true,
        persisted: true,
        state: remoteState(),
      });
      setElectronApiMock({ setAppUpdateChannel });

      const store = useAppUpdateStore();
      await store.setUpdateChannel('beta');

      expect(setAppUpdateChannel).toHaveBeenCalledWith('beta');
      expect(store.updateChannel).toBe('beta');
      expect(store.status).toBe('no-update');
      expect(addToastMock).not.toHaveBeenCalled();
    });

    it('shows a save-failed toast when the change applies but is not persisted', async () => {
      setElectronApiMock({
        setAppUpdateChannel: vi.fn().mockResolvedValue({
          accepted: true,
          persisted: false,
          state: remoteState(),
        }),
      });

      const store = useAppUpdateStore();
      await store.setUpdateChannel('beta');

      expect(store.updateChannel).toBe('beta');
      expect(addToastMock).toHaveBeenCalledTimes(1);
      expect(addToastMock).toHaveBeenCalledWith(
        'Couldn’t save the update channel. It applies until AutoByteus restarts.',
        'error',
      );
    });

    it('keeps its state when the main process refuses the change', async () => {
      setElectronApiMock({
        setAppUpdateChannel: vi.fn().mockResolvedValue({
          accepted: false,
          persisted: false,
          state: remoteState({ status: 'downloaded', updateChannel: 'stable' }),
        }),
      });

      const store = useAppUpdateStore();
      store.status = 'downloaded';
      await store.setUpdateChannel('beta');

      expect(store.updateChannel).toBe('stable');
      expect(addToastMock).not.toHaveBeenCalled();
    });

    it('shows a generic error toast when the IPC call fails', async () => {
      setElectronApiMock({
        setAppUpdateChannel: vi.fn().mockRejectedValue(new Error('ipc boom')),
      });

      const store = useAppUpdateStore();
      await store.setUpdateChannel('beta');

      expect(store.updateChannel).toBe('stable');
      expect(addToastMock).toHaveBeenCalledWith(
        'AutoByteus couldn’t complete the update check. Try again later.',
        'error',
      );
    });

    it('does nothing without the Electron bridge', async () => {
      const store = useAppUpdateStore();
      await store.setUpdateChannel('beta');

      expect(store.updateChannel).toBe('stable');
      expect(addToastMock).not.toHaveBeenCalled();
    });
  });
});
