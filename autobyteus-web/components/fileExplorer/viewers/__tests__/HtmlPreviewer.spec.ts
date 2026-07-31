import { flushPromises, mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import HtmlPreviewer from '~/components/fileExplorer/viewers/HtmlPreviewer.vue'
import { useWindowNodeContextStore } from '~/stores/windowNodeContextStore'

describe('HtmlPreviewer', () => {
  const createObjectUrl = vi.fn()
  const revokeObjectUrl = vi.fn()

  beforeEach(() => {
    createObjectUrl.mockReset()
    revokeObjectUrl.mockReset()
    createObjectUrl.mockReturnValue('blob:html-preview')
    vi.spyOn(URL, 'createObjectURL').mockImplementation(createObjectUrl)
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(revokeObjectUrl)

    setActivePinia(createPinia())
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('uses the explicit workspace identity for static HTML previews', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useWindowNodeContextStore().bindNodeContext('node-1', 'http://node.example')

    const wrapper = mount(HtmlPreviewer, {
      props: {
        content: '<h1>Workspace preview</h1>',
        path: 'docs/My preview.html',
        relativeResourceContext: { kind: 'workspace', workspaceId: 'workspace-2' },
      },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    expect(wrapper.find('iframe').attributes('src')).toBe(
      'http://node.example/rest/workspaces/workspace-2/static/docs/My%20preview.html',
    )
    expect(createObjectUrl).not.toHaveBeenCalled()
    expect(wrapper.find('iframe').attributes('sandbox')).toBe('allow-scripts allow-same-origin')
  })

  it('uses a Blob URL for a local absolute path without workspace context', async () => {
    const pinia = createPinia()
    setActivePinia(pinia)
    useWindowNodeContextStore().bindNodeContext('node-1', 'http://node.example')

    const wrapper = mount(HtmlPreviewer, {
      props: {
        content: '<h1>Local preview</h1>',
        path: '/Users/normy/.autobyteus/server-data/demo.html',
        relativeResourceContext: null,
      },
      global: { plugins: [pinia] },
    })
    await flushPromises()

    const src = wrapper.find('iframe').attributes('src')
    expect(src).toBe('blob:html-preview')
    expect(src).not.toContain('/rest/workspaces/')
    expect(createObjectUrl).toHaveBeenCalledWith(expect.any(Blob))
  })

  it('revokes Blob URLs when content changes and on unmount', async () => {
    createObjectUrl.mockReturnValueOnce('blob:first').mockReturnValueOnce('blob:second')
    const wrapper = mount(HtmlPreviewer, {
      props: {
        content: '<h1>First</h1>',
        path: '/tmp/first.html',
      },
    })
    await flushPromises()
    expect(wrapper.find('iframe').attributes('src')).toBe('blob:first')

    await wrapper.setProps({ content: '<h1>Second</h1>', path: '/tmp/second.html' })
    await flushPromises()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:first')
    expect(wrapper.find('iframe').attributes('src')).toBe('blob:second')

    wrapper.unmount()
    expect(revokeObjectUrl).toHaveBeenCalledWith('blob:second')
  })
})
