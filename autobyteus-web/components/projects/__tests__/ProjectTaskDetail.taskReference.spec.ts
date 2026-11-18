import { beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, RouterLinkStub } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { computed, ref } from 'vue'
import type { ProjectTask } from '~/types/project'

const task: ProjectTask = { taskId: 'project_task_0e31', projectId: 'p1', taskKey: 'autobyteus-42', title: 'Ship it', description: 'Ship it', status: 'TODO',
  dependsOnTaskIds: [], partOfTaskId: null, comments: [], contextFiles: [], createdAt: '', updatedAt: '', root: null }
const { push, page, createClient } = vi.hoisted(() => ({ push: vi.fn(), page: { reference: '' }, createClient: vi.fn(() => ({})) }))
vi.mock('vue-router', async (original) => ({ ...await original<typeof import('vue-router')>(), useRouter: () => ({ push, replace: vi.fn() }), useRoute: () => ({ path: '/projects/p1/tasks/autobyteus-42', query: {} }) }))
vi.mock('~/composables/projects/useProjectChangeFeed', () => ({ useProjectChangeFeed: () => undefined }))
vi.mock('~/services/projects/projectTaskContextClient', () => ({ createProjectTaskContextClient: createClient }))
vi.mock('~/composables/projects/useProjectTaskPage', () => ({
  useProjectTaskPage: (_projectId: string, reference: string) => {
    page.reference = reference
    return { project: computed(() => ({ projectId: 'p1', name: 'AutoByteus' })), task: ref(task), taskId: computed(() => task.taskId),
      loading: ref(false), error: ref(''), heading: ref(null), current: () => true, load: vi.fn() }
  },
}))

import ProjectTaskDetail from '../ProjectTaskDetail.vue'
import { useProjectTaskStore } from '~/stores/projectTaskStore'

/** The Task page receives a Task reference and uses only the resolved Task afterwards (design AR-003). */
describe('ProjectTaskDetail with a Task reference', () => {
  beforeEach(() => { vi.clearAllMocks(); setActivePinia(createPinia()) })

  it('resolves through the page composable; the context client, links and delete use the resolved Task', async () => {
    const store = useProjectTaskStore()
    const deleteTask = vi.spyOn(store, 'deleteTask').mockResolvedValue(true)
    const wrapper = mount(ProjectTaskDetail, { props: { projectId: 'p1', taskReference: 'project_task_0e31' },
      global: { stubs: { NuxtLink: RouterLinkStub, TaskRootSection: true, TaskContextFiles: true } } })
    await flushPromises()
    expect(page.reference).toBe('project_task_0e31')
    // The title above the full description (DEC-018 (2)); the delete confirmation names the Task by its title.
    expect(wrapper.get('[data-testid="task-page-title"]').text()).toBe('Ship it')
    expect(wrapper.get('#task-title-heading').text()).toBe('Title')
    expect(wrapper.get('[data-testid="task-page-title"]').element.compareDocumentPosition(wrapper.get('[data-testid="task-page-description"]').element) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(createClient).toHaveBeenCalledWith('p1', 'project_task_0e31', expect.any(Function))
    expect(wrapper.findAllComponents(RouterLinkStub).find((link) => link.attributes('data-testid') === 'task-page-edit')!.props('to'))
      .toBe('/projects/p1/tasks/autobyteus-42/edit')
    await wrapper.get('[data-testid="task-page-delete"]').trigger('click')
    await flushPromises()
    expect(wrapper.text()).toContain('Delete the task “Ship it”? This cannot be undone.')
    await wrapper.get('[data-testid="task-page-delete-confirm"]').trigger('click')
    await flushPromises()
    expect(deleteTask).toHaveBeenCalledWith('p1', 'project_task_0e31', expect.any(Function))
    expect(push).toHaveBeenCalledWith({ path: '/projects/p1', query: { notice: 'task-deleted' } })
  })
})
