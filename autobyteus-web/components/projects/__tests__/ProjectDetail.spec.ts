import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { reactive } from 'vue'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProjectDetail from '../ProjectDetail.vue'
import { useProjectStore } from '~/stores/projectStore'
import { useProjectTaskStore } from '~/stores/projectTaskStore'
import type { Project } from '~/types/project'

const { navigateToMock, routerMock } = vi.hoisted(() => ({
  navigateToMock: vi.fn(),
  routerMock: { replace: vi.fn(), push: vi.fn() },
}))
mockNuxtImport('navigateTo', () => navigateToMock)

let route: { query: Record<string, string> }
vi.mock('vue-router', async (importOriginal) => ({
  ...(await importOriginal<typeof import('vue-router')>()),
  useRoute: () => route,
  useRouter: () => routerMock,
}))

const project: Project = {
  projectId: 'p1',
  name: 'autobyteus',
  description: 'AutoByteus product',
  createdAt: '',
  updatedAt: '',
  taskCount: 4,
  openTaskCount: 2,
  workspaces: [
    {
      workspaceId: 'agent_ws_a1',
      workspaceRootPath: '/work/superrepo',
      displayName: 'superrepo',
      description: 'Main monorepo',
      addedAt: '1',
      availability: 'AVAILABLE',
    },
    {
      workspaceId: 'agent_ws_b2',
      workspaceRootPath: '/work/autobyteus-web-prototype',
      displayName: 'autobyteus-web-prototype',
      description: 'UI prototype workspace',
      addedAt: '2',
      availability: 'UNREGISTERED',
    },
  ],
}

let store: ReturnType<typeof useProjectStore>

const mountDetail = () => mount(ProjectDetail, {
  props: { projectId: 'p1' },
  attachTo: document.body,
  global: {
    stubs: {
      teleport: true,
      NuxtLink: RouterLinkStub,
      ProjectTaskBoard: { props: ['projectId'], template: '<div data-testid="project-task-board-stub">{{ projectId }}</div>' },

    },
  },
})

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    route = reactive({ query: {} as Record<string, string> })
    routerMock.replace.mockImplementation(({ query }: { query: Record<string, string> }) => {
      route.query = query
      return Promise.resolve()
    })
    setActivePinia(createPinia())
    store = useProjectStore()
    store.fetchProject = vi.fn(async () => {
      store.projects = [project] as any
      return project
    }) as any
    store.deleteProject = vi.fn().mockResolvedValue(true) as any
    store.removeWorkspace = vi.fn().mockResolvedValue(project) as any
  })

  it('shows a full-width page with Back, the header and the Tasks board by default', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-detail"]').classes().some((name) => name.startsWith('max-w'))).toBe(false)
    const back = wrapper.getComponent(RouterLinkStub)
    expect(back.props('to')).toBe('/projects')
    expect(back.attributes('aria-label')).toBe('Back to projects')
    expect(back.text()).toBe('Projects')
    expect(wrapper.get('[data-testid="project-detail-name"]').element.tagName).toBe('H1')
    expect(wrapper.get('[data-testid="project-detail-name"]').text()).toBe('autobyteus')
    expect(wrapper.get('[data-testid="project-detail-description"]').classes()).toContain('line-clamp-2')
    const tasksTab = wrapper.get('[data-testid="project-tab-tasks"]')
    expect(tasksTab.attributes('role')).toBe('tab')
    expect(tasksTab.attributes('aria-selected')).toBe('true')
    expect(wrapper.get('[data-testid="project-tab-workspaces"]').attributes('aria-selected')).toBe('false')
    expect(wrapper.get('[data-testid="project-task-board-stub"]').text()).toBe('p1')
    wrapper.unmount()
  })

  it('renders linked workspaces on ?tab=workspaces, marking unregistered ones unavailable', async () => {
    route.query = { tab: 'workspaces' }
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('[data-testid="project-task-board-stub"]').exists()).toBe(false)
    expect(wrapper.get('[role="tabpanel"]').text()).not.toMatch(/\btasks?\b/i)
    const unavailableRow = wrapper.get('[data-testid="project-workspace-row-agent_ws_b2"]')
    expect(unavailableRow.attributes('data-availability')).toBe('UNREGISTERED')
    expect(unavailableRow.text()).toContain('/work/autobyteus-web-prototype')
    expect(unavailableRow.text()).toContain('UI prototype workspace')
    expect(unavailableRow.find('[data-testid="project-workspace-unavailable"]').exists()).toBe(true)
    expect(wrapper.get('[data-testid="project-workspace-row-agent_ws_a1"]').find('[data-testid="project-workspace-unavailable"]').exists()).toBe(false)
    wrapper.unmount()
  })

  it('switches tabs through the URL without reloading the Project', async () => {
    const wrapper = mountDetail()
    await flushPromises()
    expect(store.fetchProject).toHaveBeenCalledTimes(1)

    await wrapper.get('[data-testid="project-tab-workspaces"]').trigger('click')
    await flushPromises()
    expect(routerMock.replace).toHaveBeenLastCalledWith({ query: { tab: 'workspaces' } })
    expect(wrapper.find('[data-testid="project-workspace-list"]').exists()).toBe(true)

    await wrapper.get('[data-testid="project-tab-tasks"]').trigger('click')
    await flushPromises()
    expect(routerMock.replace).toHaveBeenLastCalledWith({ query: {} })
    expect(wrapper.find('[data-testid="project-task-board-stub"]').exists()).toBe(true)
    expect(store.fetchProject).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('moves between tabs with the arrow keys', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-tab-tasks"]').trigger('keydown', { key: 'ArrowRight' })
    await flushPromises()
    expect(route.query).toEqual({ tab: 'workspaces' })
    expect(document.activeElement).toBe(wrapper.get('[data-testid="project-tab-workspaces"]').element)
    expect(wrapper.get('[data-testid="project-tab-workspaces"]').attributes('tabindex')).toBe('0')
    wrapper.unmount()
  })

  it('shows a cached Project at once while it refreshes', async () => {
    store.projects = [project] as any
    let resolveFetch!: (value: Project) => void
    store.fetchProject = vi.fn(() => new Promise<Project>((resolve) => { resolveFetch = resolve })) as any

    const wrapper = mountDetail()
    await flushPromises()
    expect(wrapper.find('[data-testid="project-detail-loading"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="project-detail-name"]').text()).toBe('autobyteus')
    resolveFetch(project)
    wrapper.unmount()
  })

  it('shows a load error for an uncached Project', async () => {
    store.fetchProject = vi.fn().mockRejectedValue(new Error('offline')) as any
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-detail-error"]').attributes('role')).toBe('alert')
    wrapper.unmount()
  })

  it('shows a not-found state for an unknown Project', async () => {
    store.fetchProject = vi.fn().mockResolvedValue(null) as any
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('[data-testid="project-not-found"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="project-back-link"]').exists()).toBe(true)
    wrapper.unmount()
  })

  it('opens the direct workspace editor and unlinks from the Workspaces tab', async () => {
    route.query = { tab: 'workspaces' }
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-add-workspace-button"]').trigger('click')
    expect(routerMock.push).toHaveBeenCalledWith({path: '/projects/p1/edit', query: {tab: 'workspaces', addWorkspace: '1'}})

    await wrapper.get('[data-testid="project-workspace-row-agent_ws_b2"] [data-testid="project-workspace-unlink"]').trigger('click')
    await flushPromises()
    expect(store.removeWorkspace).toHaveBeenCalledWith('p1', 'agent_ws_b2')
    wrapper.unmount()
  })

  it.each([
    [0, 'Delete the project “autobyteus” and its workspace links?'],
    [1, 'Delete the project “autobyteus”, its workspace links and its 1 task?'],
    [4, 'Delete the project “autobyteus”, its workspace links and its 4 tasks?'],
  ])('states the %i Tasks deleted with the Project, even from the Workspaces tab (REQ-008)', async (count, message) => {
    route.query = { tab: 'workspaces' }
    store.fetchProject = vi.fn(async () => {
      store.projects = [{ ...project, taskCount: count, openTaskCount: 0 }] as any
      return store.projects[0]
    }) as any
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-delete-button"]').trigger('click')
    await flushPromises()
    expect(wrapper.get('[data-testid="project-delete-message"]').text()).toBe(message)
    wrapper.unmount()
  })

  it('requires confirmation before deleting, and cancel keeps everything', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-delete-button"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-testid="project-delete-dialog"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="project-delete-cancel"]').element)

    await wrapper.get('[data-testid="project-delete-cancel"]').trigger('click')
    expect(wrapper.find('[data-testid="project-delete-dialog"]').exists()).toBe(false)
    expect(store.deleteProject).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('deletes after confirmation, forgets its Tasks and returns to the Projects page', async () => {
    const taskStore = useProjectTaskStore()
    const forgetSpy = vi.spyOn(taskStore, 'forget')
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-delete-button"]').trigger('click')
    await flushPromises()
    await wrapper.get('[data-testid="project-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(store.deleteProject).toHaveBeenCalledWith('p1', expect.any(Function))
    expect(forgetSpy).toHaveBeenCalledWith('p1')
    expect(navigateToMock).toHaveBeenCalledWith('/projects')
    wrapper.unmount()
  })
})
