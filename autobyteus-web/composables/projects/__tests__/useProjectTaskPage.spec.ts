import { beforeEach, describe, expect, it, vi } from 'vitest'
import { defineComponent } from 'vue'
import { flushPromises, mount } from '@vue/test-utils'
import type { ProjectTask } from '~/types/project'

const { projects, tasks, router, route } = vi.hoisted(() => ({
  projects: { getProjectById: vi.fn(() => ({ projectId: 'p1', name: 'AutoByteus' })), fetchProject: vi.fn(async () => undefined) },
  tasks: { getList: vi.fn(), fetchTasks: vi.fn(async () => undefined), releaseRead: vi.fn() },
  router: { replace: vi.fn(async () => undefined) },
  route: { query: { notice: 'saved' } as Record<string, string> },
}))
vi.mock('~/stores/projectStore', () => ({ useProjectStore: () => projects }))
vi.mock('~/stores/projectTaskStore', () => ({ useProjectTaskStore: () => tasks }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => ({ bindingRevision: 1 }) }))
vi.mock('vue-router', () => ({ useRouter: () => router, useRoute: () => route }))

import { useProjectTaskPage } from '../useProjectTaskPage'

const task: ProjectTask = { taskId: 'project_task_0e31', projectId: 'p1', taskKey: 'autobyteus-42', description: 'Ship it', status: 'TODO',
  dependsOnTaskIds: [], contextFiles: [], createdAt: '', updatedAt: '', root: null }
const open = async (reference: string | undefined, suffix?: string) => {
  let page!: ReturnType<typeof useProjectTaskPage>
  mount(defineComponent({ setup() { page = useProjectTaskPage('p1', reference, suffix); return () => null } }))
  await flushPromises()
  return page
}

/** The Task page's route parameter is a Task reference (REQ-022, AC-026, design AR-003). */
describe('useProjectTaskPage', () => {
  beforeEach(() => { vi.clearAllMocks(); tasks.getList.mockReturnValue({ tasks: [task] }) })

  it('the key URL resolves the Task and stays as it is', async () => {
    const page = await open('autobyteus-42')
    expect(page.task.value).toEqual(task)
    expect(page.taskId.value).toBe('project_task_0e31')
    expect(router.replace).not.toHaveBeenCalled()
  })

  it.each([
    ['a long-ID URL', 'project_task_0e31', undefined, '/projects/p1/tasks/autobyteus-42'],
    ['a key in another letter case', 'AutoByteus-42', undefined, '/projects/p1/tasks/autobyteus-42'],
    ['a long-ID edit URL', 'project_task_0e31', '/edit', '/projects/p1/tasks/autobyteus-42/edit'],
  ])('%s opens the Task and is replaced by the key URL, keeping the query', async (_case, reference, suffix, path) => {
    const page = await open(reference, suffix)
    expect(page.task.value?.taskId).toBe('project_task_0e31')
    expect(router.replace).toHaveBeenCalledWith({ path, query: { notice: 'saved' } })
  })

  it('an unknown reference resolves nothing and replaces nothing; New task has no reference', async () => {
    expect((await open('autobyteus-7')).task.value).toBeNull()
    expect((await open(undefined)).task.value).toBeNull()
    expect(tasks.fetchTasks).toHaveBeenCalledTimes(1)
    expect(router.replace).not.toHaveBeenCalled()
  })
})
