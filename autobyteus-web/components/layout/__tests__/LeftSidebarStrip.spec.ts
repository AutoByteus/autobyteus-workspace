import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import LeftSidebarStrip from '../LeftSidebarStrip.vue'

const {
  applicationsCapabilityStoreMock,
  appLayoutStoreMock,
  routeMock,
  routerMock,
  registeredRunIds,
  selectionMock,
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
    query: {} as Record<string, string>,
  },
  routerMock: {
    push: vi.fn(),
  },
  registeredRunIds: new Set<string>(),
  selectionMock: { selectedType: null as string | null, selectedRunId: null as string | null },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('@iconify/vue', () => ({
  Icon: { props: ['icon'], template: '<i class="icon-stub" :data-icon="icon" />' },
}))

vi.mock('~/stores/appLayoutStore', () => ({
  useAppLayoutStore: () => appLayoutStoreMock,
}))

vi.mock('~/stores/agentContextsStore', () => ({
  useAgentContextsStore: () => ({ getRun: (id: string) => (registeredRunIds.has(id) ? { id } : undefined) }),
}))

vi.mock('~/stores/agentSelectionStore', () => ({
  useAgentSelectionStore: () => selectionMock,
}))

describe('LeftSidebarStrip Component', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    appLayoutStoreMock.isMobileMenuOpen = false
    appLayoutStoreMock.openMobileMenu.mockClear()
    appLayoutStoreMock.closeMobileMenu.mockClear()
    routeMock.path = '/agents'
    routeMock.query = {}
    registeredRunIds.clear()
    selectionMock.selectedType = null
    selectionMock.selectedRunId = null
    document.body.innerHTML = ''
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
    const strip = wrapper.get('[data-test="workspace-left-navigation-strip"]')
    expect(strip.classes()).toContain('relative')
    expect(strip.classes()).toContain('flex-none')
    expect(strip.classes()).not.toContain('fixed')
    expect(strip.classes()).not.toContain('z-[60]')
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

  it('renders the visible nodes-network icon in strip mode', () => {
    const wrapper = mount(LeftSidebarStrip, {
      props: { stripActivation: 'redock-panel' },
      global: {
        stubs: {
          Icon: true,
        },
      },
    })

    const nodesButton = wrapper.get('button[title="Nodes"]')
    expect(nodesButton.find('[data-testid="nodes-network-icon"]').exists()).toBe(true)
    expect(nodesButton.find('svg').exists()).toBe(true)
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

  // collapsed-left-panel-expand-keeps-run
  describe('Workspaces', () => {
    const mountStrip = (stripActivation: 'redock-panel' | 'open-drawer') => mount(LeftSidebarStrip, {
      props: { stripActivation },
      attachTo: document.body,
      global: { stubs: { Icon: true } },
    })
    const workspaces = (wrapper: ReturnType<typeof mountStrip>) => wrapper.get('[data-test="workspace-left-strip-workspaces"]')

    it('follows the page icons after a decorative divider, with the tree glyph and its name (AC-010)', () => {
      const wrapper = mountStrip('redock-panel')
      const column = wrapper.get('[data-test="workspace-left-navigation-strip"] > div')
      const children = Array.from(column.element.children) as HTMLElement[]
      const divider = wrapper.get('[data-test="workspace-left-strip-workspaces-divider"]')

      expect(children.at(-2)).toBe(divider.element)
      expect(children.at(-3)?.dataset.navKey).toBe('nodes')
      expect(children.at(-1)).toBe(workspaces(wrapper).element)
      expect(divider.attributes('aria-hidden')).toBe('true')
      expect(divider.classes()).toEqual(expect.arrayContaining(['mx-auto', 'h-px', 'w-6', 'bg-gray-100', '[@media(max-height:540px)]:hidden']))
      expect(column.classes()).toEqual(expect.arrayContaining(['space-y-2', '[@media(max-height:540px)]:space-y-1']))
      expect(workspaces(wrapper).element.tagName).toBe('BUTTON')
      expect(workspaces(wrapper).attributes()).toMatchObject({
        type: 'button',
        title: 'Workspaces',
        'aria-label': 'Workspaces',
        'data-nav-key': 'workspaces',
      })
      expect(workspaces(wrapper).get('.icon-stub').attributes('data-icon')).toBe('ph:tree-view')
      wrapper.unmount()
    })

    it('docks the panel without navigating and hands focus to the Workspaces section (REQ-002, REQ-009)', async () => {
      routeMock.path = '/chat'
      routeMock.query = { id: 'run-1' }
      const section = document.createElement('section')
      section.dataset.test = 'app-left-panel-run-history'
      section.tabIndex = -1
      document.body.appendChild(section)
      const wrapper = mountStrip('redock-panel')

      await workspaces(wrapper).trigger('click')
      await flushPromises()

      expect(wrapper.emitted('request-redock')).toHaveLength(1)
      expect(routerMock.push).not.toHaveBeenCalled()
      expect(appLayoutStoreMock.openMobileMenu).not.toHaveBeenCalled()
      expect(document.activeElement).toBe(section)
      wrapper.unmount()
    })

    it('opens the drawer without navigating on a narrow or short window (REQ-002)', async () => {
      const wrapper = mountStrip('open-drawer')

      await workspaces(wrapper).trigger('click')
      await flushPromises()

      expect(appLayoutStoreMock.openMobileMenu).toHaveBeenCalledOnce()
      expect(wrapper.emitted('request-redock')).toBeUndefined()
      expect(routerMock.push).not.toHaveBeenCalled()
      wrapper.unmount()
    })

    it('is lit with aria-current="location" while a run is shown, and Chat is not (REQ-008)', () => {
      routeMock.path = '/chat'
      routeMock.query = { id: 'run-1' }
      registeredRunIds.add('run-1')
      const wrapper = mountStrip('redock-panel')

      expect(workspaces(wrapper).classes()).toEqual(expect.arrayContaining(['bg-gray-100', 'text-gray-900']))
      expect(workspaces(wrapper).attributes('aria-current')).toBe('location')
      expect(wrapper.get('button[data-nav-key="chat"]').classes()).not.toContain('bg-gray-100')
      wrapper.unmount()
    })

    it('is not lit on New chat, where Chat is (REQ-008, VIS-006)', () => {
      routeMock.path = '/chat'
      const wrapper = mountStrip('redock-panel')

      expect(workspaces(wrapper).classes()).not.toContain('bg-gray-100')
      expect(workspaces(wrapper).attributes('aria-current')).toBeUndefined()
      expect(wrapper.get('button[data-nav-key="chat"]').classes()).toContain('bg-gray-100')
      wrapper.unmount()
    })

    it('leaves page icons docking and navigating as before (AC-006)', async () => {
      routeMock.path = '/chat'
      routeMock.query = { id: 'run-1' }
      registeredRunIds.add('run-1')
      const wrapper = mountStrip('redock-panel')

      await wrapper.get('button[title="Agents"]').trigger('click')
      await flushPromises()

      expect(wrapper.emitted('request-redock')).toHaveLength(1)
      expect(routerMock.push).toHaveBeenCalledWith({ path: '/agents', query: { view: 'list' } })
      wrapper.unmount()
    })
  })
})
