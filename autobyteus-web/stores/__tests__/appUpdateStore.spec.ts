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
        error: null,
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
      error: null,
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
      error: null,
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
      error: null,
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
        error: null,
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
        error: null,
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
        error: null,
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
        error: null,
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
});
