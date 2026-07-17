import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import LeftSidebarStrip from '../LeftSidebarStrip.vue'

const {
  applicationsCapabilityStoreMock,
  appLayoutStoreMock,
  routeMock,
  routerMock,
} = vi.hoisted(() => ({
  applicationsCapabilityStoreMock: {
    isEnabled: false,
    ensureResolved: vi.fn().mockResolvedValue(null),
  },
  appLayoutStoreMock: {
    isMobileMenuOpen: false,
    openMobileMenu: vi.fn(),
    closeMobileMenu: vi.fn(),
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

vi.mock('~/stores/appLayoutStore', () => ({
  useAppLayoutStore: () => appLayoutStoreMock,
}))

describe('LeftSidebarStrip Component', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    appLayoutStoreMock.isMobileMenuOpen = false
    appLayoutStoreMock.openMobileMenu.mockClear()
    appLayoutStoreMock.closeMobileMenu.mockClear()
    vi.clearAllMocks()
  })

  it('preserves the personal strip inventory without a leading menu control', () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'open-drawer' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    expect(wrapper.find('[data-test="workspace-left-strip-open"]').exists()).toBe(false)
    expect(wrapper.find('button[title="Agents"]').exists()).toBe(true)
    expect(wrapper.get('button[title="Agents"]').attributes('data-nav-key')).toBe('agents')
    expect(wrapper.get('[data-test="workspace-left-navigation-strip"]').classes()).toContain('flex-none')
    expect(wrapper.get('[data-test="workspace-left-navigation-strip"]').classes()).not.toContain('fixed')
  })

  it('hides Applications link when the capability is disabled', () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'open-drawer' },
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
    expect(labels).toContain('Nodes')
    expect(labels).not.toContain('Media')
    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
  })

  it('navigates to the top-level nodes page from the promoted Nodes item', async () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'redock-panel' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    await wrapper.get('button[title="Nodes"]').trigger('click')

    expect(routerMock.push).toHaveBeenCalledWith('/nodes')
  })

  it('opens the transient navigation drawer instead of toggling the hidden preference', async () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'open-drawer' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    await wrapper.get('button[title="Agents"]').trigger('click')

    expect(appLayoutStoreMock.openMobileMenu).toHaveBeenCalledOnce()
    expect(routerMock.push).not.toHaveBeenCalled()
  })

  it('closes the transient navigation drawer from the existing strip inventory', async () => {
    appLayoutStoreMock.isMobileMenuOpen = true
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'open-drawer' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    await wrapper.get('button[title="Agents"]').trigger('click')

    expect(wrapper.get('[data-test="workspace-left-navigation-strip"]').attributes('role')).toBe('navigation')
    expect(appLayoutStoreMock.closeMobileMenu).toHaveBeenCalledOnce()
    expect(appLayoutStoreMock.openMobileMenu).not.toHaveBeenCalled()
  })

  it('shows Applications link when the capability is enabled', () => {
    applicationsCapabilityStoreMock.isEnabled = true

    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'open-drawer' },
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

  it('emits redock instead of opening a drawer for a fitting user strip', async () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'redock-panel' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    await wrapper.get('button[title="Agents"]').trigger('click')

    expect(wrapper.get('[data-test="workspace-left-navigation-strip"]').attributes('data-strip-activation')).toBe('redock-panel')
    expect(wrapper.emitted('request-redock')).toHaveLength(1)
    expect(appLayoutStoreMock.openMobileMenu).not.toHaveBeenCalled()
  })
})
