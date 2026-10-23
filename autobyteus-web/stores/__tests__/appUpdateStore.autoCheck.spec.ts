import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useAppUpdateStore } from '../appUpdateStore';

/** The app's automatic checks in the renderer: the quiet periodic error and the setting (REQ-012, 013, 025). */
const { addToastMock } = vi.hoisted(() => ({ addToastMock: vi.fn() }));
vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({ addToast: addToastMock, toasts: { value: [] }, removeToast: vi.fn() }),
}));

function setElectronApiMock(mock: Partial<Window['electronAPI']> | null): void {
  Object.defineProperty(window, 'electronAPI', { configurable: true, writable: true, value: mock });
}

describe('appUpdateStore automatic checks', () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
    setElectronApiMock(null);
  });

  it('keeps a failed periodic check quiet as well (REQ-025)', async () => {
    const bridge: { listener: ((payload: any) => void) | null } = { listener: null };
    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({ status: 'idle', currentVersion: '1.1.12', message: '', checkedAt: null }),
      onAppUpdateState: vi.fn().mockImplementation((callback: (payload: any) => void) => { bridge.listener = callback; return vi.fn(); }),
    });
    const store = useAppUpdateStore();
    await store.initialize();
    addToastMock.mockClear();
    bridge.listener?.({ status: 'error', message: 'offline', errorKind: 'network', errorOperation: 'periodic-check' });
    expect(addToastMock).not.toHaveBeenCalled();
    bridge.listener?.({ status: 'error', message: 'offline', errorKind: 'network', errorOperation: 'manual-check' });
    expect(addToastMock).toHaveBeenCalledTimes(1);
  });

  it('sends the whole automatic-check setting to the shell and follows its answer (REQ-012, REQ-013)', async () => {
    const autoCheck = { enabled: true, intervalMinutes: 60 };
    const setAppUpdateAutoCheck = vi.fn(async (next: typeof autoCheck) => ({ status: 'idle', autoCheck: next.intervalMinutes === 5 ? autoCheck : next }));
    setElectronApiMock({
      getAppUpdateState: vi.fn().mockResolvedValue({ status: 'idle', currentVersion: '1.1.12', message: '', checkedAt: null, autoCheck }),
      onAppUpdateState: vi.fn().mockReturnValue(vi.fn()),
      setAppUpdateAutoCheck,
    } as never);
    const store = useAppUpdateStore();
    await store.initialize();
    expect(store.autoCheck).toEqual(autoCheck);
    expect(await store.setAutoCheck({ enabled: false })).toBe(true);
    expect(setAppUpdateAutoCheck).toHaveBeenLastCalledWith({ enabled: false, intervalMinutes: 60 });
    expect(store.autoCheck).toEqual({ enabled: false, intervalMinutes: 60 });
    expect(await store.setAutoCheck({ intervalMinutes: 5 })).toBe(false);
  });

  it('has no automatic-check setting where the shell has none (disabled updates, browser windows)', async () => {
    const store = useAppUpdateStore();
    await store.initialize();
    expect(store.autoCheck).toBeNull();
    expect(await store.setAutoCheck({ enabled: false })).toBe(false);
  });
});
