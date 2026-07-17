import { mount } from '@vue/test-utils'
import { ref } from 'vue'
import { describe, expect, it, vi } from 'vitest'
import RightSidebarStrip from '../RightSidebarStrip.vue'

const mocks = vi.hoisted(() => ({
  activeTab: null as any,
  visibleTabs: null as any,
  setActiveTab: vi.fn(),
}))

vi.mock('~/composables/useRightSideTabs', () => ({
  useRightSideTabs: () => mocks,
}))

describe('RightSidebarStrip', () => {
  it('renders the consuming strip as a normal flow item and the sole drawer affordance', async () => {
    const stripBehavior = 'consuming' as const
    mocks.activeTab = ref('terminal')
    mocks.visibleTabs = ref([
      { name: 'files', label: 'Files' },
      { name: 'terminal', label: 'Terminal' },
    ])

    const wrapper = mount(RightSidebarStrip, {
      props: {
        stripActivation: 'open-drawer',
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
    expect(strip.classes()).toContain('relative')
    expect(strip.classes()).toContain('flex-none')
    expect(strip.classes()).not.toContain('fixed')
    expect(strip.classes()).not.toContain('z-[60]')

    await strip.get('button[aria-label="Files"]').trigger('click')

    expect(mocks.setActiveTab).toHaveBeenCalledWith('files')
    expect(wrapper.emitted('request-open')).toHaveLength(1)
    expect(strip.get('button[aria-label="Files"]').attributes('data-tab-name')).toBe('files')
  })

  it('redocks a fitting user strip and restores visibility', async () => {
    mocks.activeTab = ref('terminal')
    mocks.visibleTabs = ref([{ name: 'terminal', label: 'Terminal' }])

    const wrapper = mount(RightSidebarStrip, {
      props: {
        stripActivation: 'redock-panel',
        stripBehavior: 'consuming',
      },
      global: {
        stubs: {
          Icon: true,
        },
      },
      slots: {},
    })

    await wrapper.get('button[aria-label="Terminal"]').trigger('click')

    expect(wrapper.emitted('request-redock')).toHaveLength(1)
    expect(wrapper.emitted('request-open')).toBeUndefined()
  })
})
