import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { mockNuxtImport } from '@nuxt/test-utils/runtime'
import ProjectListPane from '../ProjectListPane.vue'
import { useProjectStore } from '~/stores/projectStore'

const { navigateToMock } = vi.hoisted(() => ({ navigateToMock: vi.fn() }))
mockNuxtImport('navigateTo', () => navigateToMock)

let store: ReturnType<typeof useProjectStore>

const project = (projectId: string, name: string, openTaskCount = 0, description = '') => ({
  projectId,
  name,
  description,
  createdAt: '',
  updatedAt: '',
  workspaces: [],
  openTaskCount,
})

const mountPane = (selectedProjectId: string | null = null) => mount(ProjectListPane, {
  props: { selectedProjectId },
  global: {
    stubs: {
      NuxtLink: RouterLinkStub,
      ProjectFormDialog: {
        emits: ['saved', 'close'],
        template: '<button data-testid="project-form-dialog-stub" @click="$emit(\'saved\', { projectId: \'p_new\' })"></button>',
      },
    },
  },
})

const itemIds = (wrapper: ReturnType<typeof mountPane>) =>
  wrapper.findAll('[data-testid^="project-list-item-p"]').map((item) => item.attributes('data-testid'))

describe('ProjectListPane', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    store = useProjectStore()
    store.fetchProjects = vi.fn().mockResolvedValue([]) as any
  })

  it('loads Projects on mount and shows the empty state', async () => {
    const wrapper = mountPane()
    await flushPromises()

    expect(store.fetchProjects).toHaveBeenCalledWith(true)
    expect(wrapper.find('[data-testid="projects-empty"]').exists()).toBe(true)
  })

  it('lists Project names with their open Task counts as text and marks the selection', async () => {
    store.projects = [project('p1', 'AutoByteus', 4), project('p2', 'Marketing', 0)] as any
    const wrapper = mountPane('p1')
    await flushPromises()

    const selected = wrapper.get('[data-testid="project-list-item-p1"]')
    expect(selected.attributes('aria-current')).toBe('page')
    expect(selected.text()).toContain('AutoByteus')
    expect(selected.get('[data-testid="project-list-item-open-count"]').text()).toBe('4 open')
    expect(wrapper.get('[data-testid="project-list-item-p2"]').attributes('aria-current')).toBeUndefined()
    expect(wrapper.get('[data-testid="project-list-item-p2"] [data-testid="project-list-item-open-count"]').text()).toBe('0 open')
    expect(wrapper.findAllComponents(RouterLinkStub).map((link) => link.props('to'))).toEqual(['/projects/p1', '/projects/p2'])
  })

  it('filters by name or description and recovers from no matches', async () => {
    store.projects = [project('p1', 'AutoByteus', 0, 'desktop app'), project('p2', 'Marketing', 0, 'landing pages')] as any
    const wrapper = mountPane()
    await flushPromises()

    await wrapper.get('[data-testid="projects-search-input"]').setValue('LANDING')
    expect(itemIds(wrapper)).toEqual(['project-list-item-p2'])

    await wrapper.get('[data-testid="projects-search-input"]').setValue('zzz')
    expect(wrapper.find('[data-testid="projects-no-match"]').exists()).toBe(true)
    await wrapper.get('[data-testid="projects-clear-search"]').trigger('click')
    expect(itemIds(wrapper)).toHaveLength(2)
  })

  it('does not blank or flag the list while a list refresh is loading or fails', async () => {
    store.projects = [project('p1', 'AutoByteus')] as any
    store.loading = true
    store.error = new Error('offline') as any
    const wrapper = mountPane('p1')
    await flushPromises()

    expect(wrapper.find('[data-testid="projects-loading"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="projects-error"]').exists()).toBe(false)
    expect(itemIds(wrapper)).toEqual(['project-list-item-p1'])
  })

  it('shows a retryable error when the first load fails', async () => {
    store.error = new Error('offline') as any
    const wrapper = mountPane()
    await flushPromises()

    expect(wrapper.get('[data-testid="projects-error"]').attributes('role')).toBe('alert')
  })

  it('creates a Project and selects it', async () => {
    const wrapper = mountPane()
    await wrapper.get('[data-testid="projects-new-button"]').trigger('click')
    await wrapper.get('[data-testid="project-form-dialog-stub"]').trigger('click')
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith('/projects/p_new')
    expect(wrapper.find('[data-testid="project-form-dialog-stub"]').exists()).toBe(false)
  })
})
