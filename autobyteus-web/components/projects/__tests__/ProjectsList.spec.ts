import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import ProjectsList from '../ProjectsList.vue'
import { useProjectStore } from '~/stores/projectStore'

let store: ReturnType<typeof useProjectStore>

const project = (projectId: string, name: string, description = '', workspaces: unknown[] = [], openTaskCount = 0) => ({
  projectId,
  name,
  description,
  createdAt: '',
  updatedAt: '',
  workspaces,
  openTaskCount,
})

const mountList = () => mount(ProjectsList, {
  global: {
    stubs: { NuxtLink: RouterLinkStub },
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
      project('p1', 'autobyteus', 'AutoByteus product', [{}, {}, {}], 4),
      project('p2', 'Marketing site', 'Landing pages'),
    ] as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.findAll('[data-testid^="project-card-p"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="project-card-p1"] [data-testid="project-card-counts"]').text()).toBe('4 open tasks · 3 workspaces')
    expect(wrapper.get('[data-testid="project-card-p2"] [data-testid="project-card-counts"]').text()).toBe('No open tasks · No workspaces')

    await wrapper.get('[data-testid="projects-search-input"]').setValue('landing')
    expect(wrapper.findAll('[data-testid^="project-card-p"]').map((card) => card.attributes('data-testid'))).toEqual(['project-card-p2'])

    await wrapper.get('[data-testid="projects-search-input"]').setValue('AUTOBYTEUS')
    expect(wrapper.findAll('[data-testid^="project-card-p"]').map((card) => card.attributes('data-testid'))).toEqual(['project-card-p1'])

    await wrapper.get('[data-testid="projects-search-input"]').setValue('nothing here')
    expect(wrapper.find('[data-testid="projects-no-match"]').exists()).toBe(true)

    await wrapper.get('[data-testid="projects-clear-search"]').trigger('click')
    expect(wrapper.findAll('[data-testid^="project-card-p"]')).toHaveLength(2)
  })

  it('links New project to the ordinary authoring page', async () => {
    const wrapper = mountList()
    await wrapper.get('[data-testid="projects-new-button"]').trigger('click')
    expect(wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-testid') === 'projects-new-button')?.props('to')).toBe('/projects/new')
  })

  it('links each card to its project detail route', async () => {
    store.projects = [project('project_1', 'autobyteus')] as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.findAllComponents(RouterLinkStub).find((link) => link.props('to') === '/projects/project_1')).toBeDefined()
  })

  it('uses singular forms for one open task and one workspace (REQ-009)', async () => {
    store.projects = [project('p1', 'autobyteus', '', [{}], 1)] as any
    const wrapper = mountList()
    await flushPromises()

    expect(wrapper.get('[data-testid="project-card-counts"]').text()).toBe('1 open task · 1 workspace')
  })
})
