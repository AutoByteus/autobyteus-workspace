import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'
import BrowserPanel from '../BrowserPanel.vue'
import { useBrowserDisplayModeStore } from '~/stores/browserDisplayMode'
import { useBrowserShellStore } from '~/stores/browserShellStore'

vi.mock('~/composables/useRightPanel', () => ({
  useRightPanel: () => ({
    isRightPanelVisible: { value: true },
    rightPanelWidth: { value: 520 },
  }),
}))

describe('BrowserPanel', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
      },
      writable: true,
    })
  })

  it('renders browser sessions from the store without crashing on mount', async () => {
    const store = useBrowserShellStore()
    store.browserAvailable = true
    store.activeTabId = 'abc123'
    store.sessions = [
      {
        tab_id: 'abc123',
        canGoBack: false,
        canGoForward: false,
        title: 'Google Browser Test',
        url: 'https://www.google.com/',
      },
    ]

    const wrapper = mount(BrowserPanel)
    await nextTick()

    expect(wrapper.text()).toContain('Google Browser Test')
  })

  it('shows compact zero-tab chrome and a clean empty-state hint when no browser tabs exist', async () => {
    const store = useBrowserShellStore()
    store.browserAvailable = true
    store.activeTabId = null
    store.sessions = []

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toMatch(/open a url to start browsing/i)
    expect(wrapper.find('button[title="Maximize Browser view"]').exists()).toBe(false)
    expect(wrapper.get('button[title="Open new tab"]').exists()).toBe(true)
    expect(wrapper.get('input').attributes('placeholder')).toMatch(/enter url and press enter/i)
  })

  it('opens a browser tab from the Browser chrome', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        openBrowserTab: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
        updateBrowserHostBounds: vi.fn()
          .mockResolvedValueOnce({
            activeTabId: 'tab-1',
            sessions: [
              {
                tab_id: 'tab-1',
                canGoBack: false,
                canGoForward: false,
                title: 'Example',
                url: 'https://example.com/',
                deviceEmulation: { mode: 'desktop', profile: null },
              },
            ],
          })
          .mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    await wrapper.get('input').setValue('https://example.com')
    await wrapper.get('button[title=\"Open new tab\"]').trigger('click')
    await flushPromises()

    expect(window.electronAPI?.openBrowserTab).toHaveBeenCalledWith({
      url: 'https://example.com',
      waitUntil: 'load',
    })
  })

  it('normalizes a bare hostname before opening a browser tab', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        openBrowserTab: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Google',
              url: 'https://www.google.com/',
            },
          ],
        }),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Google',
              url: 'https://www.google.com/',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    await wrapper.get('input').setValue('www.google.com')
    await wrapper.get('button[title="Open new tab"]').trigger('click')
    await flushPromises()

    expect(window.electronAPI?.openBrowserTab).toHaveBeenCalledWith({
      url: 'https://www.google.com',
      waitUntil: 'load',
    })
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('https://www.google.com/')
  })

  it('refreshes the active browser tab from the Browser chrome', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        reloadBrowserTab: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    await wrapper.get('button[title="Refresh active tab"]').trigger('click')
    await flushPromises()

    expect(window.electronAPI?.reloadBrowserTab).toHaveBeenCalledWith({
      tabId: 'tab-1',
      waitUntil: 'load',
    })
  })

  it('toggles mobile device emulation for the active browser tab', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
              deviceEmulation: { mode: 'desktop', profile: null },
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        setBrowserDeviceEmulation: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
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
        }),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
              deviceEmulation: { mode: 'desktop', profile: null },
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    await wrapper.get('button[title="Switch to mobile view"]').trigger('click')
    await flushPromises()

    expect(window.electronAPI?.setBrowserDeviceEmulation).toHaveBeenCalledWith({
      tabId: 'tab-1',
      mode: 'mobile',
    })
  })

  it('closes the active browser tab from the Browser chrome', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        closeBrowserShellSession: vi.fn().mockResolvedValue({
          activeTabId: null,
          sessions: [],
        }),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    await nextTick()
    await flushPromises()

    await wrapper.get('button[title="Close active tab"]').trigger('click')
    await flushPromises()

    expect(window.electronAPI?.closeBrowserShellSession).toHaveBeenCalledWith('tab-1')
    expect(wrapper.text()).toMatch(/open a url to start browsing/i)
    expect(wrapper.find('button[title="Maximize Browser view"]').exists()).toBe(false)
  })

  it('toggles Browser full-view mode from the Browser chrome when browser tabs exist', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-1',
          sessions: [
            {
              tab_id: 'tab-1',
              canGoBack: false,
              canGoForward: false,
              title: 'Example',
              url: 'https://example.com/',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    const displayModeStore = useBrowserDisplayModeStore()
    await nextTick()
    await flushPromises()

    expect(displayModeStore.isZenMode).toBe(false)

    await wrapper.get('button[title="Maximize Browser view"]').trigger('click')
    await flushPromises()

    expect(displayModeStore.isZenMode).toBe(true)
  })

  it('keeps the active browser tab state intact when toggling Browser full-view mode', async () => {
    Object.defineProperty(window, 'electronAPI', {
      configurable: true,
      value: {
        getBrowserShellSnapshot: vi.fn().mockResolvedValue({
          activeTabId: 'tab-7',
          sessions: [
            {
              tab_id: 'tab-7',
              canGoBack: false,
              canGoForward: false,
              title: 'Retained Browser Tab',
              url: 'https://example.com/retained',
            },
          ],
        }),
        onBrowserShellSnapshotUpdated: vi.fn(() => vi.fn()),
        updateBrowserHostBounds: vi.fn().mockResolvedValue({
          activeTabId: 'tab-7',
          sessions: [
            {
              tab_id: 'tab-7',
              canGoBack: false,
              canGoForward: false,
              title: 'Retained Browser Tab',
              url: 'https://example.com/retained',
            },
          ],
        }),
      },
      writable: true,
    })

    const wrapper = mount(BrowserPanel)
    const displayModeStore = useBrowserDisplayModeStore()
    const store = useBrowserShellStore()
    await nextTick()
    await flushPromises()

    expect(wrapper.text()).toContain('Retained Browser Tab')
    expect(wrapper.get('input').element.value).toBe('https://example.com/retained')

    await wrapper.get('button[title="Maximize Browser view"]').trigger('click')
    await flushPromises()

    expect(displayModeStore.isZenMode).toBe(true)
    expect(store.activeTabId).toBe('tab-7')
    expect(store.activeSession?.url).toBe('https://example.com/retained')
    expect(document.body.textContent ?? '').toContain('Retained Browser Tab')
  })
  it('labels and disables history controls with no tab', async () => {
    const wrapper = mount(BrowserPanel)
    await flushPromises()
    for (const label of ['Back', 'Forward']) {
      const button = wrapper.get(`button[aria-label="${label}"]`)
      expect(button.attributes('title')).toBe(label)
      expect(button.attributes('disabled')).toBeDefined()
      expect(button.attributes('type')).toBe('button')
    }
    wrapper.unmount()
  })

  it('preserves typed addresses on capability-only updates and captures active history intent', async () => {
    const store = useBrowserShellStore()
    store.initialized = true
    store.browserAvailable = true
    store.activeTabId = 't1'
    const first = { tab_id: 't1', title: 'Same', url: 'http://localhost/same', canGoBack: true, canGoForward: false }
    store.sessions = [first]
    vi.spyOn(store, 'updateHostBounds').mockResolvedValue()
    const navigate = vi.spyOn(store, 'navigateHistory').mockResolvedValue()
    const wrapper = mount(BrowserPanel)
    await flushPromises()
    await wrapper.get('input').setValue('unfinished.example/pat')
    store.sessions = [{ ...first, canGoForward: true }]
    await nextTick()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('unfinished.example/pat')
    expect(wrapper.get('button[aria-label="Forward"]').attributes('disabled')).toBeUndefined()
    await wrapper.get('button[aria-label="Back"]').trigger('click')
    expect(navigate).toHaveBeenCalledWith({ tabId: 't1', direction: 'back' })
    store.sessions = [{ ...first, url: 'http://localhost/earlier' }]
    await nextTick()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('http://localhost/earlier')
    await wrapper.get('input').setValue('another edit')
    store.sessions = [{ ...first, tab_id: 't2', url: 'http://localhost/earlier' }]
    store.activeTabId = 't2'
    await nextTick()
    expect((wrapper.get('input').element as HTMLInputElement).value).toBe('http://localhost/earlier')
    expect(wrapper.get('button[aria-label="Forward"]').attributes('disabled')).toBeDefined()
    wrapper.unmount()
  })

})
