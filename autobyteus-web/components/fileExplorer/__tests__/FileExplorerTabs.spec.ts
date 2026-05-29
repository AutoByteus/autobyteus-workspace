import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

import FileExplorerTabs from '../FileExplorerTabs.vue'

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

  it('attaches global keyboard/click listeners only while active', async () => {
    const addWindowListener = vi.spyOn(window, 'addEventListener')
    const removeWindowListener = vi.spyOn(window, 'removeEventListener')
    const addDocumentListener = vi.spyOn(document, 'addEventListener')
    const removeDocumentListener = vi.spyOn(document, 'removeEventListener')

    const wrapper = mountSubject(false)

    expect(addWindowListener).not.toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(addDocumentListener).not.toHaveBeenCalledWith('click', expect.any(Function))

    await wrapper.setProps({ active: true })
    await nextTick()

    expect(addWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(addDocumentListener).toHaveBeenCalledWith('click', expect.any(Function))

    await wrapper.setProps({ active: false })
    await nextTick()

    expect(removeWindowListener).toHaveBeenCalledWith('keydown', expect.any(Function))
    expect(removeDocumentListener).toHaveBeenCalledWith('click', expect.any(Function))
  })
})
