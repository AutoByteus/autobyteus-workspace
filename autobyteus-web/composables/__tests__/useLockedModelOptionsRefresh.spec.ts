import { describe, expect, it, vi } from 'vitest'
import { defineComponent, h } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import {
  injectLockedModelOptionsRefresh,
  provideLockedModelOptionsRefresh,
  type LockedModelOptionsRefresh,
} from '../useLockedModelOptionsRefresh'

const mountTree = (reload: () => Promise<boolean>) => {
  let provided!: LockedModelOptionsRefresh
  let injected: LockedModelOptionsRefresh | null = null
  const Child = defineComponent({ setup() { injected = injectLockedModelOptionsRefresh(); return () => h('span') } })
  mount(defineComponent({ setup() { provided = provideLockedModelOptionsRefresh(reload); return () => h(Child) } }))
  return { provided, injected: () => injected }
}

describe('provideLockedModelOptionsRefresh (REQ-010, QR-001, QR-002)', () => {
  it('gives the menus under the editor the editor\'s refresh', () => {
    const { provided, injected } = mountTree(async () => true)
    expect(injected()).toBe(provided)
  })

  it('gives a menu outside any editor nothing', () => {
    let injected: LockedModelOptionsRefresh | null | undefined
    mount(defineComponent({ setup() { injected = injectLockedModelOptionsRefresh(); return () => h('span') } }))
    expect(injected).toBeNull()
  })

  it('is busy while the options are read and shares one read between concurrent asks', async () => {
    let finish!: (ok: boolean) => void
    const reload = vi.fn(() => new Promise<boolean>((resolve) => { finish = resolve }))
    const { provided } = mountTree(reload)

    const first = provided.refresh()
    const second = provided.refresh()
    expect(provided.refreshing.value).toBe(true)
    expect(reload).toHaveBeenCalledOnce()

    finish(true)
    await Promise.all([first, second])
    expect(provided.refreshing.value).toBe(false)
    expect(provided.failed.value).toBe(false)

    void provided.refresh()
    expect(reload).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['could not read the options', async () => false],
    ['threw', async () => { throw new Error('network') }],
  ])('reports a failure when the editor %s, and clears it on the next ask', async (_name, reload) => {
    const { provided } = mountTree(reload)

    await provided.refresh()
    expect(provided.failed.value).toBe(true)
    expect(provided.refreshing.value).toBe(false)

    const retry = provided.refresh()
    expect(provided.failed.value).toBe(false)
    await retry
  })
})
