import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LeftSidebarStrip from '../LeftSidebarStrip.vue'

const {
  applicationsCapabilityStoreMock,
  routeMock,
  routerMock,
} = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  routeMock: {
    path: '/agents',
  },
  routerMock: {
    push: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/composables/useLeftPanel', () => ({
  useLeftPanel: () => ({
    isLeftPanelVisible: { value: true },
    toggleLeftPanel: vi.fn(),
  }),
}))

describe('LeftSidebarStrip Component', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    vi.clearAllMocks()
  })

  it('hides Applications link when the capability is disabled', () => {
    const wrapper = mount(LeftSidebarStrip, {
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    const items = wrapper.findAll('button[title]')
    const labels = items.map((item) => item.attributes('title'))

    expect(labels).not.toContain('Applications')
    expect(labels).toContain('Agents')
    expect(labels).toContain('Agent Teams')
    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
  })

  it('shows Applications link when the capability is enabled', () => {
    applicationsCapabilityStoreMock.isEnabled = true

    const wrapper = mount(LeftSidebarStrip, {
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    const items = wrapper.findAll('button[title]')
    const labels = items.map((item) => item.attributes('title'))

    expect(labels).toContain('Applications')
  })
})
