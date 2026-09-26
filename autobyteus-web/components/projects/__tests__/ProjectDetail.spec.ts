import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProjectDetail from '../ProjectDetail.vue'
import { useProjectStore } from '~/stores/projectStore'
import type { Project } from '~/types/project'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

const project: Project = {
  projectId: 'p1',
  name: 'autobyteus',
  description: 'AutoByteus product',
  createdAt: '',
  updatedAt: '',
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
      ProjectFormDialog: { template: '<div data-testid="project-form-dialog-stub"></div>' },
      ProjectWorkspaceLinkDialog: {
        props: ['project', 'link'],
        template: '<div data-testid="project-link-dialog-stub">{{ link ? link.workspaceId : "add" }}</div>',
      },
    },
  },
})

describe('ProjectDetail', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectStore()
    store.fetchProject = vi.fn(async () => {
      store.projects = [project] as any
      return project
    }) as any
    store.deleteProject = vi.fn().mockResolvedValue(true) as any
    store.removeWorkspace = vi.fn().mockResolvedValue(project) as any
  })

  it('renders the project and its linked workspaces, marking unregistered ones unavailable', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-detail-name"]').text()).toBe('autobyteus')
    const unavailableRow = wrapper.get('[data-testid="project-workspace-row-agent_ws_b2"]')
    expect(unavailableRow.attributes('data-availability')).toBe('UNREGISTERED')
    expect(unavailableRow.text()).toContain('/work/autobyteus-web-prototype')
    expect(unavailableRow.text()).toContain('UI prototype workspace')
    expect(unavailableRow.find('[data-testid="project-workspace-unavailable"]').exists()).toBe(true)
    expect(unavailableRow.get('[data-testid="project-workspace-unlink"]').attributes('disabled')).toBeUndefined()
    expect(wrapper.get('[data-testid="project-workspace-row-agent_ws_a1"]').find('[data-testid="project-workspace-unavailable"]').exists()).toBe(false)
    expect(wrapper.text()).not.toMatch(/\btasks?\b/i)
    wrapper.unmount()
  })

  it('shows a not-found state with a way back', async () => {
    store.fetchProject = vi.fn().mockResolvedValue(null) as any
    const wrapper = mountDetail()
    await flushPromises()

    expect(wrapper.find('[data-testid="project-not-found"]').exists()).toBe(true)
    expect(wrapper.findAllComponents(RouterLinkStub).some((link) => link.props('to') === '/projects')).toBe(true)
    wrapper.unmount()
  })

  it('opens the link dialog to add or edit a workspace link', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-add-workspace-button"]').trigger('click')
    expect(wrapper.get('[data-testid="project-link-dialog-stub"]').text()).toBe('add')
  })

  it('unlinks a workspace', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-workspace-row-agent_ws_b2"] [data-testid="project-workspace-unlink"]').trigger('click')
    await flushPromises()
    expect(store.removeWorkspace).toHaveBeenCalledWith('p1', 'agent_ws_b2')
    wrapper.unmount()
  })

  it('requires confirmation before deleting, and cancel keeps everything', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-delete-button"]').trigger('click')
    await flushPromises()
    const dialog = wrapper.get('[data-testid="project-delete-dialog"]')
    expect(dialog.attributes('role')).toBe('dialog')
    expect(dialog.text()).toContain('autobyteus')
    expect(document.activeElement).toBe(wrapper.get('[data-testid="project-delete-cancel"]').element)

    await wrapper.get('[data-testid="project-delete-cancel"]').trigger('click')
    expect(wrapper.find('[data-testid="project-delete-dialog"]').exists()).toBe(false)
    expect(store.deleteProject).not.toHaveBeenCalled()
    wrapper.unmount()
  })

  it('deletes after confirmation and returns to the index', async () => {
    const wrapper = mountDetail()
    await flushPromises()

    await wrapper.get('[data-testid="project-delete-button"]').trigger('click')
    await wrapper.get('[data-testid="project-delete-confirm"]').trigger('click')
    await flushPromises()

    expect(store.deleteProject).toHaveBeenCalledWith('p1')
    expect(navigateToMock).toHaveBeenCalledWith('/projects')
    wrapper.unmount()
  })
})
