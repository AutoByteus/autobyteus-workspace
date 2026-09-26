import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

import { createBoundNodeCapabilityStore } from '../createBoundNodeCapabilityStore'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

type DemoCapability = { enabled: boolean; settingKey: 'ENABLE_DEMO'; source: 'SERVER_SETTING' | 'INITIALIZED_DISABLED' }

const QUERY = { kind: 'Document', definitions: [] } as any
const MUTATION = { kind: 'Document', definitions: [{}] } as any

const useDemoCapabilityStore = createBoundNodeCapabilityStore<DemoCapability>({
  id: 'demoCapability',
  query: QUERY,
  mutation: MUTATION,
  queryField: 'demoCapability',
  mutationField: 'setDemoEnabled',
  label: 'Demo',
})

const capability = (enabled: boolean, source: DemoCapability['source'] = 'SERVER_SETTING'): DemoCapability => ({
  enabled,
  settingKey: 'ENABLE_DEMO',
  source,
})

describe('createBoundNodeCapabilityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true, status: 200 }))
  })

  it('queries the configured document and field and caches the result', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { demoCapability: capability(true) } })

    const store = useDemoCapabilityStore()
    await expect(store.ensureResolved()).resolves.toEqual(capability(true))
    await store.ensureResolved()

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(apolloClientMock.query).toHaveBeenCalledWith({ query: QUERY, fetchPolicy: 'network-only' })
    expect(store.$id).toBe('demoCapability')
    expect(store.isEnabled).toBe(true)
  })

  it('shares one in-flight request between concurrent callers', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { demoCapability: capability(false, 'INITIALIZED_DISABLED') } })

    const store = useDemoCapabilityStore()
    await Promise.all([store.ensureResolved(), store.ensureResolved()])

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(store.isEnabled).toBe(false)
  })

  it('reports a labelled error when the capability is missing', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { demoCapability: null } })

    const store = useDemoCapabilityStore()
    await expect(store.ensureResolved()).rejects.toThrow('Demo capability was not returned.')
    expect(store.status).toBe('error')
    expect(store.isEnabled).toBe(false)
  })

  it('joins GraphQL errors into the store error', async () => {
    apolloClientMock.query.mockResolvedValue({ data: {}, errors: [{ message: 'a' }, { message: 'b' }] })

    const store = useDemoCapabilityStore()
    await expect(store.ensureResolved()).rejects.toThrow('a, b')
    expect(store.error?.message).toBe('a, b')
  })

  it('sets the capability through the configured mutation field', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { demoCapability: capability(false) } })
    apolloClientMock.mutate.mockResolvedValue({ data: { setDemoEnabled: capability(true) } })

    const store = useDemoCapabilityStore()
    await store.ensureResolved()
    await expect(store.setEnabled(true)).resolves.toEqual(capability(true))

    expect(apolloClientMock.mutate).toHaveBeenCalledWith({ mutation: MUTATION, variables: { enabled: true } })
    expect(store.isEnabled).toBe(true)
  })

  it('rolls back to the previous capability when the mutation fails', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { demoCapability: capability(false) } })
    apolloClientMock.mutate.mockRejectedValue(new Error('save failed'))

    const store = useDemoCapabilityStore()
    await store.ensureResolved()
    await expect(store.setEnabled(true)).rejects.toThrow('save failed')

    expect(store.status).toBe('resolved')
    expect(store.capability).toEqual(capability(false))
    expect(store.error?.message).toBe('save failed')
  })

  it('re-resolves when the bound node changes', async () => {
    apolloClientMock.query
      .mockResolvedValueOnce({ data: { demoCapability: capability(true) } })
      .mockResolvedValueOnce({ data: { demoCapability: capability(false) } })

    const store = useDemoCapabilityStore()
    await store.ensureResolved()

    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    await vi.waitFor(() => {
      expect(apolloClientMock.query).toHaveBeenCalledTimes(2)
      expect(store.status).toBe('resolved')
      expect(store.isEnabled).toBe(false)
    })
  })
})
