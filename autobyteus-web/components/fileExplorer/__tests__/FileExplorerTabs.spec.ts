import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import FileExplorerTabs from '../FileExplorerTabs.vue'
import FileViewer from '../FileViewer.vue'
import { useFileExplorerStore } from '~/stores/fileExplorer'

describe('FileExplorerTabs active lifecycle', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
    setActivePinia(createPinia())
  })

  const mountSubject = (active: boolean) => mount(FileExplorerTabs, {
    props: { active },
    global: {
      mocks: {
        $t: (key: string) => key,
      },
      stubs: {
        FileViewer: true,
        Icon: true,
      },
    },
  })

  it('attaches global keyboard listeners only while active', async () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')

    const wrapper = mountSubject(false)

    expect(addWindowListener).not.toHaveBeenCalledWith('keydown', expect.any(Function))

    await wrapper.setProps({ active: true })
    await nextTick()

    expect(addWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function))

    await wrapper.setProps({ active: false })
    await nextTick()

    expect(removeWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('mounts active immediately without listener initialization errors', () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener')

    expect(() => mountSubject(true)).not.toThrow()
    expect(addWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function))
  })

  it('words a node file the node refused with the plain reason, as the phone does (autobyteus-471)', async () => {
    const store = useFileExplorerStore()
    const state = store._getOrCreateWorkspaceState('ws-node')
    state.openFiles.push({ path: '/w/gone.md', type: 'Text', mode: 'preview', accessIntent: { source: 'event-monitor', readOnly: true },
      content: null, url: null, contentRevision: 0, relativeResourceContext: null, isLoading: false, error: 'node-file-preview:not-found' })
    state.activeFile = '/w/gone.md'
    const wrapper = mount(FileExplorerTabs, {
      props: { workspaceId: 'ws-node' },
      global: { mocks: { $t: (key: string) => key }, stubs: { FileViewer: true, Icon: true } },
    })
    await nextTick()
    expect(wrapper.get('[role="alert"]').text()).toContain('This file was not found on the computer.')
    expect(wrapper.findComponent(FileViewer).exists()).toBe(false)
    wrapper.unmount()
  })
})
