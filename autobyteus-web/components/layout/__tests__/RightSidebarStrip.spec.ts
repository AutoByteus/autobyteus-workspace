import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import RightSidebarStrip from '../RightSidebarStrip.vue'

const mocks = vi.hoisted(() => ({
  activeTab: null as any,
  visibleTabs: null as any,
  setActiveTab: vi.fn(),
  setRightPanelVisible: vi.fn(),
  toggleRightPanel: vi.fn(),
}))

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => mocks,
}))

vi.mock('~/composables/useRightPanel', () => ({
  useRightPanel: () => ({
    setRightPanelVisible: mocks.setRightPanelVisible,
    toggleRightPanel: mocks.toggleRightPanel,
  }),
}))

describe('RightSidebarStrip', () => {
  it.each([
    ['consuming', false],
    ['overlay', true],
  ] as const)('renders the %s strip as the sole drawer affordance', async (stripBehavior, isOverlay) => {
    mocks.activeTab = ref('terminal')
    mocks.visibleTabs = ref([
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
    ])

    const wrapper = mount(RightSidebarStrip, {
      props: {
        openAsDrawer: true,
        stripBehavior,
      },
      global: {
        stubs: {
          Icon: true,
        },
        mocks: {
          $t: (key: string) => key,
        },
      },
    })

    const strip = wrapper.get('[data-test="workspace-right-tool-strip-surface"]')
    expect(strip.attributes('data-strip-behavior')).toBe(stripBehavior)
    expect(strip.classes()).toContain(isOverlay ? 'fixed' : 'flex')
    expect(strip.classes()).not.toContain(isOverlay ? 'static' : 'fixed')

    await strip.get('button[aria-label="Files"]').trigger('click')

    expect(mocks.setActiveTab).toHaveBeenCalledWith('files')
    expect(mocks.setRightPanelVisible).toHaveBeenCalledWith(true)
    expect(wrapper.emitted('request-open')).toHaveLength(1)
  })
})
