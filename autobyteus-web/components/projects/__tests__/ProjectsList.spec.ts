import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectsList from '../ProjectsList.vue'
import { useProjectStore } from '~/stores/projectStore'

let store: ReturnType<typeof useProjectStore>

const project = (projectId: string, name: string, description = '', workspaces: unknown[] = []) => ({
  projectId,
  name,
  description,
  createdAt: '',
  updatedAt: '',
  workspaces,
})

const mountList = () => mount(ProjectsList, {
  global: {
    stubs: { NuxtLink: RouterLinkStub, ProjectFormDialog: { template: '<div data-testid="project-form-dialog-stub"></div>' } },
  },
})

describe('ProjectsList', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectStore()
    store.fetchProjects = vi.fn().mockResolvedValue([]) as any
  })

  it('loads projects on mount and shows the empty state', async () => {
    const wrapper = mountList()
    await flushPromises()

    expect(store.fetchProjects).toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-testid="projects-empty"]').exists()).toBe(true)
  })

  it('shows a retryable error', async () => {
    store.error = new Error('offline') as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.get('[data-testid="projects-error"]').attributes('role')).toBe('alert')
    expect(wrapper.get('[data-testid="projects-error"]').text()).toContain('offline')
  })

  it('filters by name or description and recovers from no matches', async () => {
    store.projects = [
      project('p1', 'autobyteus', 'AutoByteus product', [{}, {}, {}]),
      project('p2', 'Marketing site', 'Landing pages'),
    ] as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="project-card-p"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="project-card-p1"]').text()).toContain('3 linked workspaces')

    await wrapper.get('[data-testid="projects-search-input"]').setValue('landing')
    expect(wrapper.findAll('[data-testid^="project-card-p"]').map((card) => card.attributes('data-testid'))).toEqual(['project-card-p2'])

    await wrapper.get('[data-testid="projects-search-input"]').setValue('AUTOBYTEUS')
    expect(wrapper.findAll('[data-testid^="project-card-p"]').map((card) => card.attributes('data-testid'))).toEqual(['project-card-p1'])

    await wrapper.get('[data-testid="projects-search-input"]').setValue('nothing here')
    expect(wrapper.find('[data-testid="projects-no-match"]').exists()).toBe(true)

    await wrapper.get('[data-testid="projects-clear-search"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="project-card-p"]')).toHaveLength(2)
  })

  it('opens the create dialog', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-testid="projects-new-button"]').trigger('click')
    expect(wrapper.find('[data-testid="project-form-dialog-stub"]').exists()).toBe(true)
  })

  it('links each card to its project detail route', async () => {
    store.projects = [project('project_1', 'autobyteus')] as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.getComponent(RouterLinkStub).props('to')).toBe('/projects/project_1')
  })
})
