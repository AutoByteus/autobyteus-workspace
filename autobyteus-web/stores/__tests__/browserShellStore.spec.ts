import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useBrowserShellStore } from '../browserShellStore'

describe('browserShellStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: undefined,
      writable: true,
    })
  })

  it('initializes Browser availability from the Electron shell API and applies the snapshot', async () => {
    const onBrowserShellSnapshotUpdated = vi.fn(() => vi.fn())
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'browser-session-1',
          sessions: [
            {
              tab_id: 'browser-session-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Demo',
              url: 'http://localhost:3000/demo',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated,
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.initialize()

    expect(store.browserAvailable).toBe(true)
    expect(store.activeTabId).toBe('browser-session-1')
    expect(store.sessions).toHaveLength(1)
    expect(store.activeSession?.url).toBe('http://localhost:3000/demo')
    expect(onBrowserShellSnapshotUpdated).toHaveBeenCalledTimes(1)
  })

  it('keeps Browser unavailable when Electron browser APIs do not exist', async () => {
    const store = useBrowserShellStore()
    await store.initialize()

    expect(store.browserAvailable).toBe(false)
    expect(store.sessions).toEqual([])
  })

  it('surfaces a startup error when the Browser runtime is unavailable on desktop', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi
          .fn()
          .mockRejectedValue(new Error('Browser runtime is unavailable on this desktop instance.')),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.initialize()

    expect(store.browserAvailable).toBe(true)
    expect(store.sessions).toEqual([])
    expect(store.lastError).toBe('Browser runtime is unavailable on this desktop instance.')
  })

  it('openTab applies the snapshot returned by Electron', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        openBrowserTab: vi.fn().mockResolvedValue({
          activeTabId: 'browser-session-2',
          sessions: [
            {
              tab_id: 'browser-session-2',
              canGoBack: false,
              canGoForward: false,
              title: 'Other',
              url: 'http://localhost:3000/other',
            },
          ],
        }),
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.openTab({ url: 'http://localhost:3000/other', waitUntil: 'load' })

    expect(store.activeTabId).toBe('browser-session-2')
    expect(store.activeSession?.title).toBe('Other')
  })

  it('reloadTab applies the updated snapshot returned by Electron', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'browser-session-1',
          sessions: [
            {
              tab_id: 'browser-session-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Demo',
              url: 'http://localhost:3000/demo',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        reloadBrowserTab: vi.fn().mockResolvedValue({
          activeTabId: 'browser-session-1',
          sessions: [
            {
              tab_id: 'browser-session-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Demo Reloaded',
              url: 'http://localhost:3000/demo',
            },
          ],
        }),
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.reloadTab({ tabId: 'browser-session-1', waitUntil: 'load' })

    expect(store.activeSession?.title).toBe('Demo Reloaded')
  })

  it('setDeviceEmulation applies the Electron snapshot and preserves mobile state', async () => {
    const setBrowserDeviceEmulation = vi.fn().mockResolvedValue({
      activeTabId: 'browser-session-1',
      sessions: [
        {
          tab_id: 'browser-session-1',
          canGoBack: false,
          canGoForward: false,
          title: 'Demo',
          url: 'http://localhost:3000/demo',
          deviceEmulation: {
            mode: 'mobile',
            profile: {
              width: 390,
              height: 844,
              deviceScaleFactor: 3,
            },
          },
        },
      ],
    })
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'browser-session-1',
          sessions: [
            {
              tab_id: 'browser-session-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Demo',
              url: 'http://localhost:3000/demo',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        setBrowserDeviceEmulation,
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.setDeviceEmulation({
      tabId: 'browser-session-1',
      mode: 'mobile',
    })

    expect(setBrowserDeviceEmulation).toHaveBeenCalledWith({
      tabId: 'browser-session-1',
      mode: 'mobile',
    })
    expect(store.activeSession?.deviceEmulation).toEqual({
      mode: 'mobile',
      profile: {
        width: 390,
        height: 844,
        deviceScaleFactor: 3,
      },
    })
  })

  it('ignores identical snapshot updates from Electron', async () => {
    let snapshotListener: ((snapshot: {
      activeTabId: string | null;
      sessions: Array<{ tab_id: string; title: string | null; url: string }>;
    }) => void) | null = null

    const initialSnapshot = {
      activeTabId: 'browser-session-1',
      sessions: [
        {
          tab_id: 'browser-session-1',
          canGoBack: false,
          canGoForward: false,
          title: 'Demo',
          url: 'http://localhost:3000/demo',
        },
      ],
    }

    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue(initialSnapshot),
        onBrowserShellSnapshotUpdated: vi.fn((callback) => {
          snapshotListener = callback
          return vi.fn()
        }),
      },
      writable: true,
    })

    const store = useBrowserShellStore()
    await store.initialize()
    const initialSessionsRef = store.sessions

    snapshotListener?.({
      activeTabId: 'browser-session-1',
      sessions: [
        {
          tab_id: 'browser-session-1',
          canGoBack: false,
          canGoForward: false,
          title: 'Demo',
          url: 'http://localhost:3000/demo',
        },
      ],
    })

    expect(store.sessions).toBe(initialSessionsRef)
    expect(store.activeTabId).toBe('browser-session-1')
    expect(store.browserAvailable).toBe(true)
  })
  it('applies flag-only updates and sends history intent, surfacing dispatch errors', async () => {
    let listener: (snapshot: any) => void = () => {}
    const snapshot = { activeTabId: 't1', sessions: [{ tab_id: 't1', title: 'Same', url: 'http://localhost/same', canGoBack: true, canGoForward: false }] }
    const navigateBrowserHistory = vi.fn().mockResolvedValue(snapshot)
    window.electronAPI = {
      getBrowserShellSnapshot: vi.fn().mockResolvedValue(snapshot),
      onBrowserShellSnapshotUpdated: vi.fn((callback) => { listener = callback; return vi.fn() }),
      navigateBrowserHistory,
    } as any
    const store = useBrowserShellStore()
    await store.initialize()
    const previous = store.sessions
    listener({ ...snapshot, sessions: [{ ...snapshot.sessions[0], canGoForward: true }] })
    expect(store.sessions).not.toBe(previous)
    expect(store.activeSession?.canGoForward).toBe(true)
    await store.navigateHistory({ tabId: 't1', direction: 'back' })
    expect(navigateBrowserHistory).toHaveBeenCalledWith({ tabId: 't1', direction: 'back' })
    navigateBrowserHistory.mockRejectedValueOnce(new Error('history failed'))
    await store.navigateHistory({ tabId: 't1', direction: 'forward' })
    expect(store.lastError).toBe('history failed')
    expect(store.activeTabId).toBe('t1')
    listener(snapshot)
    expect(store.lastError).toBeNull()
  })

})
