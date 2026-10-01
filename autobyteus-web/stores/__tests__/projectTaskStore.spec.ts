import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { nextTick } from 'vue'

const { apolloClientMock } = vi.hoisted(() => ({
  apolloClientMock: {
    query: vi.fn(),
    mutate: vi.fn(),
  },
}))

vi.mock('~/utils/apolloClient', () => ({
  getApolloClient: vi.fn(() => apolloClientMock),
}))

import { useProjectTaskStore } from '../projectTaskStore'
import { useProjectStore } from '../projectStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import { ProjectRequestError } from '~/utils/projects/projectRequestError'
import type { ProjectTask } from '~/types/project'

const task = (taskId: string, updatedAt: string, status: ProjectTask['status'] = 'TODO'): ProjectTask => ({
  taskId,
  projectId: 'p1',
  description: `Task ${taskId}`,
  status,
  createdAt: '2026-09-26T00:00:00.000Z',
  updatedAt,
})

describe('projectTaskStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
    const projectStore = useProjectStore()
    projectStore.projects = [
      { projectId: 'p1', name: 'A', description: '', createdAt: '', updatedAt: '', workspaces: [], openTaskCount: 0 },
    ] as any
  })

  it('loads a Project\'s Tasks most recently updated first and caches them', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z'), task('t2', '2026-09-26T02:00:00.000Z')] },
    })

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    await store.fetchTasks('p1')

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({ variables: { projectId: 'p1' } }))
    expect(store.getList('p1')?.status).toBe('ready')
    expect(store.getList('p1')?.tasks.map((entry) => entry.taskId)).toEqual(['t2', 't1'])
  })

  it('shares one in-flight request per Project', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [] } })

    const store = useProjectTaskStore()
    await Promise.all([store.fetchTasks('p1'), store.fetchTasks('p1')])

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
  })

  it('records a load error with the server code', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: null,
      errors: [{ message: 'missing', extensions: { code: 'PROJECT_NOT_FOUND' } }],
    })

    const store = useProjectTaskStore()
    await expect(store.fetchTasks('p1')).rejects.toBeInstanceOf(ProjectRequestError)
    expect(store.getList('p1')?.status).toBe('error')
    expect(store.getList('p1')?.error?.code).toBe('PROJECT_NOT_FOUND')
  })

  it('creates a Task, keeps the list ordered and pushes the open count to the Project', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })
    apolloClientMock.mutate.mockResolvedValue({ data: { createProjectTask: task('t2', '2026-09-26T03:00:00.000Z') } })

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    const created = await store.createTask('p1', 'New work')

    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { input: { projectId: 'p1', description: 'New work' } },
    }))
    expect(created.taskId).toBe('t2')
    expect(store.getList('p1')?.tasks.map((entry) => entry.taskId)).toEqual(['t2', 't1'])
    expect(useProjectStore().getProjectById('p1')?.openTaskCount).toBe(2)
  })

  it('loads the list before applying a write when it was not loaded yet', async () => {
    apolloClientMock.mutate.mockResolvedValue({ data: { createProjectTask: task('t9', '2026-09-26T05:00:00.000Z') } })
    // The server list already contains the new Task.
    apolloClientMock.query.mockResolvedValue({
      data: { projectTasks: [task('t9', '2026-09-26T05:00:00.000Z'), task('t1', '2026-09-26T01:00:00.000Z', 'DONE')] },
    })

    const store = useProjectTaskStore()
    await store.createTask('p1', 'New work')

    expect(store.getList('p1')?.tasks.map((entry) => entry.taskId)).toEqual(['t9', 't1'])
    expect(useProjectStore().getProjectById('p1')?.openTaskCount).toBe(1)
  })

  it('updates a description and moves the Task to the top', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z'), task('t2', '2026-09-26T02:00:00.000Z')] },
    })
    apolloClientMock.mutate.mockResolvedValue({
      data: { updateProjectTask: { ...task('t1', '2026-09-26T04:00:00.000Z'), description: 'edited' } },
    })

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    await store.updateTaskDescription('p1', 't1', 'edited')

    expect(apolloClientMock.mutate).toHaveBeenCalledWith(expect.objectContaining({
      variables: { input: { projectId: 'p1', taskId: 't1', description: 'edited' } },
    }))
    expect(store.getList('p1')?.tasks.map((entry) => [entry.taskId, entry.description])).toEqual([
      ['t1', 'edited'],
      ['t2', 'Task t2'],
    ])
  })

  it('deletes a Task and updates the open count', async () => {
    apolloClientMock.query.mockResolvedValue({
      data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z'), task('t2', '2026-09-26T02:00:00.000Z')] },
    })
    apolloClientMock.mutate.mockResolvedValue({ data: { deleteProjectTask: true } })

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    await expect(store.deleteTask('p1', 't2')).resolves.toBe(true)

    expect(store.getList('p1')?.tasks.map((entry) => entry.taskId)).toEqual(['t1'])
    expect(useProjectStore().getProjectById('p1')?.openTaskCount).toBe(1)
  })

  it('surfaces write errors with the server code and leaves the list unchanged', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })
    apolloClientMock.mutate.mockRejectedValue(Object.assign(new Error('GraphQL error'), {
      graphQLErrors: [{ message: 'required', extensions: { code: 'TASK_DESCRIPTION_REQUIRED' } }],
    }))

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    await expect(store.createTask('p1', ' ')).rejects.toMatchObject({ code: 'TASK_DESCRIPTION_REQUIRED' })
    expect(store.getList('p1')?.tasks.map((entry) => entry.taskId)).toEqual(['t1'])
  })

  it('forgets one Project and drops everything when the bound node changes', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })

    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    store.forget('p1')
    expect(store.getList('p1')).toBeNull()

    await store.fetchTasks('p1')
    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()
    expect(store.getList('p1')).toBeNull()
  })

  it('ignores a list response that arrives after the bound node changed', async () => {
    let resolveQuery!: (value: unknown) => void
    apolloClientMock.query.mockReturnValueOnce(new Promise((resolve) => { resolveQuery = resolve }))

    const store = useProjectTaskStore()
    const pending = store.fetchTasks('p1')
    await vi.waitFor(() => expect(apolloClientMock.query).toHaveBeenCalledOnce())
    useWindowNodeContextStore().bindNodeContext('remote-node', 'http://127.0.0.1:3900')
    await nextTick()

    resolveQuery({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })
    await expect(pending).resolves.toEqual([])
    expect(store.getList('p1')).toBeNull()
  })
})
