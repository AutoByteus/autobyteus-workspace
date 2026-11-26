import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import type { ExtensionItem, ExtensionList } from '~/types/extensions'

const { queryMock, mutateMock, toastMock, refreshAvailabilityMock, actionMock, windowNode } = vi.hoisted(() => ({
  queryMock: vi.fn(),
  mutateMock: vi.fn(),
  toastMock: vi.fn(),
  refreshAvailabilityMock: vi.fn(),
  actionMock: vi.fn(),
  windowNode: { isEmbeddedWindow: true, bindingRevision: 1, nodeBaseUrl: 'http://127.0.0.1:29695' },
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: queryMock, mutate: mutateMock }) }))
vi.mock('~/composables/useToasts', () => ({ useToasts: () => ({ addToast: toastMock }) }))
vi.mock('~/stores/voiceInputStore', () => ({ useVoiceInputStore: () => ({ refreshAvailability: refreshAvailabilityMock }) }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => windowNode }))
vi.mock('~/services/extensions/extensionActionClient', () => ({ callExtensionAction: actionMock }))

import { EXTENSIONS_POLL_INTERVAL_MS, useExtensionsStore } from '../extensionsStore'

const item = (overrides: Partial<ExtensionItem> = {}): ExtensionItem => ({
  id: 'voice-input', name: 'Voice Input', description: 'Dictate.', translations: null, platforms: ['darwin-arm64'],
  state: 'notInstalled', catalogVersion: '1.0.0', notAvailableReason: null, progress: null, installedVersion: null,
  enabled: null, ready: null, message: null, starting: false, update: null, failureMessage: null, ...overrides,
})
const list = (items: ExtensionItem[], catalog: ExtensionList['catalog'] = 'verified') => ({ data: { extensions: { catalog, platform: 'darwin-arm64', extensions: items } } })
const installed = (overrides: Partial<ExtensionItem> = {}) => item({ state: 'installed', installedVersion: '1.0.0', enabled: true, ready: true, message: 'Ready.', update: 'none', ...overrides })

describe('extensionsStore (Settings → Extensions of this window\'s node)', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    setActivePinia(createPinia())
    for (const mock of [queryMock, mutateMock, toastMock, refreshAvailabilityMock, actionMock]) mock.mockReset()
    Object.assign(windowNode, { isEmbeddedWindow: true, bindingRevision: 1 })
  })
  afterEach(() => {
    useExtensionsStore().close()
    vi.useRealTimers()
  })

  it('opens with a catalog fetch, then reads every second only while something installs, updates or starts (DS-009)', async () => {
    queryMock.mockResolvedValueOnce(list([item({ state: 'installing', progress: { message: 'Downloading Voice Input 1.0.0', percent: null } })]))
    const store = useExtensionsStore()
    await store.open()
    expect(queryMock).toHaveBeenLastCalledWith(expect.objectContaining({ variables: { refreshCatalog: true } }))
    expect(store.isBusy).toBe(true)

    queryMock.mockResolvedValueOnce(list([installed({ starting: true })]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(queryMock).toHaveBeenLastCalledWith(expect.objectContaining({ variables: { refreshCatalog: false } }))
    queryMock.mockResolvedValueOnce(list([installed()]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(queryMock).toHaveBeenCalledTimes(3)
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS * 3)
    expect(queryMock).toHaveBeenCalledTimes(3)
  })

  it('allows Install and Update only with a verified catalog (V13)', async () => {
    const store = useExtensionsStore()
    queryMock.mockResolvedValueOnce(list([item()], 'unreachable'))
    await store.open()
    expect(store.canInstall).toBe(false)
    queryMock.mockResolvedValueOnce(list([item()], 'verified'))
    await store.refresh(true)
    expect(store.canInstall).toBe(true)
  })

  it('shows the owner note when the node refuses this credential (REQ-005)', async () => {
    queryMock.mockRejectedValueOnce(Object.assign(new Error('This credential does not open this action.'), {
      graphQLErrors: [{ extensions: { code: 'NODE_ROUTE_NOT_PERMITTED' } }],
    }))
    const store = useExtensionsStore()
    await store.open()
    expect(store.notOwner).toBe(true)
    expect(store.error).toBeNull()
  })

  it('installs on this window\'s node, says "Installed and on" while it starts, and tells this computer\'s voice store', async () => {
    queryMock.mockResolvedValueOnce(list([item()]))
    const store = useExtensionsStore()
    await store.open()
    mutateMock.mockResolvedValueOnce({ data: { installExtension: item({ state: 'installing', progress: { message: 'Downloading', percent: null } }) } })
    queryMock.mockResolvedValueOnce(list([installed({ starting: true })]))
    await store.install('voice-input')
    expect(mutateMock).toHaveBeenCalledWith(expect.objectContaining({ variables: { id: 'voice-input' } }))
    expect(store.justInstalled['voice-input']).toBe(true)
    expect(refreshAvailabilityMock).toHaveBeenCalled()
    queryMock.mockResolvedValueOnce(list([installed()]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(store.justInstalled['voice-input']).toBeUndefined()
  })

  it('tells this computer\'s voice store again when a followed install ends installed and ready (AR-001)', async () => {
    queryMock.mockResolvedValueOnce(list([item({ state: 'installing', progress: { message: 'Preparing', percent: null } })]))
    const store = useExtensionsStore()
    await store.open()
    refreshAvailabilityMock.mockClear()
    queryMock.mockResolvedValueOnce(list([installed({ ready: false, starting: true })]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(refreshAvailabilityMock).toHaveBeenCalledTimes(1)
    queryMock.mockResolvedValueOnce(list([installed({ ready: false, starting: true })]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(refreshAvailabilityMock).toHaveBeenCalledTimes(1)
    queryMock.mockResolvedValueOnce(list([installed()]))
    await vi.advanceTimersByTimeAsync(EXTENSIONS_POLL_INTERVAL_MS)
    expect(refreshAvailabilityMock).toHaveBeenCalledTimes(2)
  })

  it('does not tell the voice store about another node\'s window, and shows a refusal as a toast', async () => {
    Object.assign(windowNode, { isEmbeddedWindow: false })
    queryMock.mockResolvedValue(list([installed()]))
    const store = useExtensionsStore()
    await store.open()
    mutateMock.mockRejectedValueOnce(new Error('voice-input is being installed, updated or removed.'))
    await store.setEnabled('voice-input', false)
    expect(toastMock).toHaveBeenCalledWith('voice-input is being installed, updated or removed.', 'error')
    expect(refreshAvailabilityMock).not.toHaveBeenCalled()
    expect(store.pending).toEqual({})
  })

  it('reads the log and calls a page action on this window\'s node', async () => {
    queryMock.mockResolvedValueOnce({ data: { extensionLog: ['2026-11-26T10:00:00.000Z install: done'] } })
    const store = useExtensionsStore()
    await store.showLog('voice-input')
    expect(store.logLines).toEqual(['2026-11-26T10:00:00.000Z install: done'])
    actionMock.mockResolvedValueOnce({ language: 'en' })
    await expect(store.callAction('voice-input', 'setLanguage', { language: 'en' })).resolves.toEqual({ language: 'en' })
    expect(actionMock).toHaveBeenCalledWith('http://127.0.0.1:29695', 'voice-input', 'setLanguage', { json: { language: 'en' } })
  })
})
