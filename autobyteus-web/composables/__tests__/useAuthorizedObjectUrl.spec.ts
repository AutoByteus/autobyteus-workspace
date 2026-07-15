import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, h } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthorizedObjectUrlMap } from '~/composables/useAuthorizedObjectUrl'
import { useMobileNodeSessionStore } from '~/stores/mobileNodeSessionStore'
import type { MobileNodeSession } from '~/types/remoteAccess'

const sessionWithCredential = (credential: string): MobileNodeSession => ({
  version: 1,
  nodeId: 'mobile-paired-node',
  serverBaseUrl: 'http://node.example',
  credential,
  pairedAt: '2026-07-12T00:00:00.000Z',
  device: {
    deviceId: 'device-1',
    displayName: 'Phone',
    clientFacingBaseUrl: 'http://node.example',
    createdAt: '2026-07-12T00:00:00.000Z',
    lastSeenAt: null,
    revokedAt: null,
  },
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

const blobResponse = (label: string): Response => ({
  ok: true,
  status: 200,
  statusText: 'OK',
  blob: () => Promise.resolve(new Blob([label], { type: 'image/png' })),
}) as Response

describe('useAuthorizedObjectUrlMap credential generations', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('invalidates unchanged sources and commits only the latest credential snapshot', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useMobileNodeSessionStore()
    const source = '/rest/workspaces/ws/content?path=image.png'
    const requestA = deferred<Response>()
    const requestB = deferred<Response>()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const credential = new Headers(init?.headers).get('Authorization')
      if (credential === 'Bearer credential-a') return requestA.promise
      if (credential === 'Bearer credential-b') return requestB.promise
      throw new Error(`Unexpected credential: ${credential}`)
    })
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:credential-b')
    const revokeObjectUrl = vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined)

    let resources!: ReturnType<typeof useAuthorizedObjectUrlMap>
    const wrapper = mount(defineComponent({
      setup() {
        resources = useAuthorizedObjectUrlMap(() => [source])
        return () => h('div')
      },
    }), { global: { plugins: [pinia] } })

    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: source })

    sessionStore.$patch({ session: sessionWithCredential('credential-a') })
    expect(resources.resolvedUrlsBySource.value).toEqual({})

    sessionStore.$patch({ session: sessionWithCredential('credential-b') })
    expect(resources.resolvedUrlsBySource.value).toEqual({})

    requestA.resolve(blobResponse('a'))
    await flushPromises()
    expect(resources.resolvedUrlsBySource.value).toEqual({})
    expect(createObjectUrl).not.toHaveBeenCalled()

    requestB.resolve(blobResponse('b'))
    await flushPromises()
    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: 'blob:credential-b' })

    sessionStore.$patch({ session: null })
    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: source })
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:credential-b')

    wrapper.unmount()
  })

  it('restores an unchanged direct source when credential A is removed in flight', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    const sessionStore = useMobileNodeSessionStore()
    const source = '/rest/workspaces/ws/content?path=image.png'
    const requestA = deferred<Response>()
    vi.spyOn(globalThis, 'fetch').mockImplementation((_input, init) => {
      const credential = new Headers(init?.headers).get('Authorization')
      if (credential === 'Bearer credential-a') return requestA.promise
      throw new Error(`Unexpected credential: ${credential}`)
    })
    const createObjectUrl = vi.spyOn(URL, 'createObjectURL')

    let resources!: ReturnType<typeof useAuthorizedObjectUrlMap>
    const wrapper = mount(defineComponent({
      setup() {
        resources = useAuthorizedObjectUrlMap(() => [source])
        return () => h('div')
      },
    }), { global: { plugins: [pinia] } })

    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: source })

    sessionStore.$patch({ session: sessionWithCredential('credential-a') })
    expect(resources.resolvedUrlsBySource.value).toEqual({})

    sessionStore.$patch({ session: null })
    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: source })

    requestA.resolve(blobResponse('stale-a'))
    await flushPromises()
    expect(resources.resolvedUrlsBySource.value).toEqual({ [source]: source })
    expect(createObjectUrl).not.toHaveBeenCalled()

    wrapper.unmount()
  })
})
