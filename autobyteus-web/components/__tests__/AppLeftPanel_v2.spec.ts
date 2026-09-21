import { beforeEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { nextTick } from 'vue'
import AppLeftPanel from '../AppLeftPanel.vue'

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
    query: {} as Record<string, string>,
  },
  routerMock: {
    push: vi.fn().mockResolvedValue(undefined),
  },
}))

vi.mock('vue-router', () => ({
  useRoute: () => routeMock,
  useRouter: () => routerMock,
}))

vi.mock('~/stores/applicationsCapabilityStore', () => ({
  useApplicationsCapabilityStore: () => applicationsCapabilityStoreMock,
}))

vi.mock('~/components/workspace/history/WorkspaceAgentRunsTreePanel.vue', () => ({
  default: {
    name: 'WorkspaceAgentRunsTreePanel',
    emits: ['run-selected', 'run-created'],
    template: '<div></div>',
  },
}))

describe('AppLeftPanel Component', () => {
  beforeEach(() => {
    applicationsCapabilityStoreMock.isEnabled = false
    applicationsCapabilityStoreMock.ensureResolved.mockResolvedValue(null)
    routeMock.path = '/agents'
    routeMock.query = {}
    vi.clearAllMocks()
    window.localStorage.clear()
  })

  it('hides Applications link when the capability is disabled', () => {
    const wrapper = mount(AppLeftPanel, {
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: routeMock,
          $router: routerMock,
        },
      },
    })

    const text = wrapper.text()
    expect(text).not.toContain('Applications')
    expect(text).toContain('Agents')
    expect(text).toContain('Agent Teams')
    expect(applicationsCapabilityStoreMock.ensureResolved).toHaveBeenCalledOnce()
  })

  it('shows Applications link when the capability is enabled', () => {
    applicationsCapabilityStoreMock.isEnabled = true

    const wrapper = mount(AppLeftPanel, {
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: routeMock,
          $router: routerMock,
        },
      },
    })

    expect(wrapper.text()).toContain('Applications')
  })

  it('allows dragging the section handle upward to give workspaces more height', async () => {
    const wrapper = mount(AppLeftPanel, {
      attachTo: document.body,
      global: {
        stubs: {
          Icon: true,
          WorkspaceAgentRunsTreePanel: true,
        },
        mocks: {
          $route: routeMock,
          $router: routerMock,
        },
      },
    })

    const sectionsContainer = wrapper.get('[data-test="app-left-panel-sections"]').element as HTMLElement
    Object.defineProperty(sectionsContainer, 'clientHeight', {
      configurable: true,
      value: 640,
    })

    const primaryNavSection = wrapper.get('[data-test="app-left-panel-primary-nav"]').element as HTMLElement
    const resizeHandle = wrapper.get('[data-test="app-left-panel-section-resize-handle"]')

    expect(primaryNavSection.style.height).toBe('240px')

    await resizeHandle.trigger('mousedown', { clientY: 320 })
    document.dispatchEvent(new MouseEvent('mousemove', { bubbles: true, clientY: 200 }))
    document.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }))
    await nextTick()

    expect(primaryNavSection.style.height).toBe('56px')

    wrapper.unmount()
  })

  it('retires AgentOrg query ownership when a standalone Team row is selected', async () => {
    routeMock.path = '/workspace'
    routeMock.query = {
      rootSubjectKind: 'agent_org',
      definitionId: 'org-def',
      orgRunId: 'org-run',
      mode: 'active',
    }
    const wrapper = mount(AppLeftPanel, {
      global: { stubs: { Icon: true } },
    })

    wrapper.findComponent({ name: 'WorkspaceAgentRunsTreePanel' }).vm.$emit(
      'run-selected',
      { type: 'team', runId: 'standalone-team-run' },
    )
    await nextTick()

    expect(routerMock.push).toHaveBeenCalledOnce()
    expect(routerMock.push).toHaveBeenCalledWith('/workspace')
  })

  it('does not replace an already plain standalone workspace route', async () => {
    routeMock.path = '/workspace'
    routeMock.query = {}
    const wrapper = mount(AppLeftPanel, {
      global: { stubs: { Icon: true } },
    })

    wrapper.findComponent({ name: 'WorkspaceAgentRunsTreePanel' }).vm.$emit(
      'run-selected',
      { type: 'team', runId: 'standalone-team-run' },
    )
    await nextTick()

    expect(routerMock.push).not.toHaveBeenCalled()
  })
})
