import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { defineComponent, ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useAuthorizedObjectUrl } from '~/composables/useAuthorizedObjectUrl'

// autobyteus-450 DS-002: a reload of the same URL (an open file's contentRevision) reads the bytes again. A browser shows
// an image it already has for a URL it saw in the page (measured in Chrome: no second request), so the reload goes
// through fetch with `no-store` into an object URL, with or without a key.

const okBlob = (label: string) => ({ ok: true, status: 200, statusText: 'OK', blob: () => Promise.resolve(new Blob([label])) }) as Response

describe('useAuthorizedObjectUrl reload by revision', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  const mountWith = (url: string) => {
    const revision = ref(0)
    let result!: ReturnType<typeof useAuthorizedObjectUrl>
    mount(defineComponent({ setup() { result = useAuthorizedObjectUrl(() => url, { revision: () => revision.value }); return () => null } }))
    return { revision, result }
  }

  it('a desktop window (no phone key) shows the URL itself first, and after a reload the bytes read again, uncached', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okBlob('v2'))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reload-1')
    const { revision, result } = mountWith('http://node.example/rest/workspaces/ws/content?path=chart.png')
    expect(result.resolvedUrl.value).toBe('http://node.example/rest/workspaces/ws/content?path=chart.png')
    expect(fetchMock).not.toHaveBeenCalled()

    revision.value = 1
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('http://node.example/rest/workspaces/ws/content?path=chart.png', expect.objectContaining({ cache: 'no-store' }))
    expect(new Headers(fetchMock.mock.calls[0]![1]?.headers).get('Authorization')).toBeNull()
    expect(result.resolvedUrl.value).toBe('blob:reload-1')
  })

  it('an Electron local file reloads the same way (its scheme supports fetch)', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okBlob('v2'))
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:reload-local')
    const { revision, result } = mountWith('local-file://local/Users/me/chart.png')
    revision.value = 2
    await flushPromises()
    expect(fetchMock).toHaveBeenCalledWith('local-file://local/Users/me/chart.png', expect.objectContaining({ cache: 'no-store' }))
    expect(result.resolvedUrl.value).toBe('blob:reload-local')
  })

  it('a blob URL (already bytes) is shown as it is, even on a reload', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch')
    const { revision, result } = mountWith('blob:phone/1')
    revision.value = 1
    await flushPromises()
    expect(fetchMock).not.toHaveBeenCalled()
    expect(result.resolvedUrl.value).toBe('blob:phone/1')
  })
})
