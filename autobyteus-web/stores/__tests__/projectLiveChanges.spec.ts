import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock } = vi.hoisted(() => ({ apolloClientMock: { query: vi.fn(), mutate: vi.fn() } }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))

import { LIVE_HIGHLIGHT_MS, TEMP_TASKS_LIST_ID, useProjectTaskStore } from '../projectTaskStore'
import { useProjectStore } from '../projectStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { Project, ProjectTask, TaskRootView, TaskWithoutProject } from '~/types/project'

const root = (status: TaskRootView['status'] = 'idle'): TaskRootView => ({ kind: 'agent', recipientAddress: '/w', ingressAgentRunId: 'w', teamRunId: null,
  hostRoot: { kind: 'agent', runId: 'r' }, start: 'started', startError: null, closed: false, status })
const task = (taskId: string, updatedAt: string, status: ProjectTask['status'] = 'TODO'): ProjectTask => ({ taskId, projectId: 'p1', description: `Task ${taskId}`,
  status, contextFiles: [], createdAt: '2026-09-26T00:00:00.000Z', updatedAt, root: root() })
const temp = (taskId: string, updatedAt: string, status: TaskWithoutProject['status'] = 'TODO'): TaskWithoutProject => ({ taskId, description: `Temp ${taskId}`,
  status, referenceFiles: [], createdAt: '2026-09-26T00:00:00.000Z', updatedAt, root: root() })
const project = (projectId: string, overrides: Partial<Project> = {}): Project => ({ projectId, name: projectId, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0, ...overrides })
const scope = { kind: 'project', projectId: 'p1' } as const
const deferred = <T>() => { let resolve!: (value: T) => void; const promise = new Promise<T>((r) => { resolve = r }); return { promise, resolve } }
const ids = (list: { tasks: { taskId: string }[] } | null) => list?.tasks.map((t) => t.taskId)

describe('Projects live changes (/ws/projects) in the stores', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
    useProjectStore().projects = [project('p1')]
  })
  afterEach(() => vi.useRealTimers())

  it('applies upserts, removals and worker status to a loaded Project list, with fresh counts', async () => {
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })
    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    store.applyChange({ type: 'task_upserted', scope, task: task('t2', '2026-09-26T02:00:00.000Z') })
    expect(ids(store.getList('p1'))).toEqual(['t2', 't1'])
    store.applyChange({ type: 'task_worker_status', scope, taskId: 't1', status: 'running' })
    expect(store.getList('p1')!.tasks.find((t) => t.taskId === 't1')!.root!.status).toBe('running')
    store.applyChange({ type: 'task_removed', scope, taskId: 't2' })
    expect(ids(store.getList('p1'))).toEqual(['t1'])
    expect(useProjectStore().projects[0]).toMatchObject({ taskCount: 1, openTaskCount: 1 })
  })

  it('ignores changes for lists that were never loaded (they read fresh when opened)', () => {
    const store = useProjectTaskStore()
    store.applyChange({ type: 'task_upserted', scope, task: task('t1', 'x') })
    expect(store.getList('p1')).toBeNull()
  })

  it('highlights an arrived Task and a Task that moved lanes for 2.4 s; an in-lane edit is not highlighted', async () => {
    vi.useFakeTimers()
    apolloClientMock.query.mockResolvedValue({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z')] } })
    const store = useProjectTaskStore()
    await store.fetchTasks('p1')
    store.applyChange({ type: 'task_upserted', scope, task: { ...task('t1', '2026-09-26T01:30:00.000Z'), description: 'edited' } })
    expect(store.liveChanges).toEqual({})
    store.applyChange({ type: 'task_upserted', scope, task: task('t2', '2026-09-26T02:00:00.000Z') })
    store.applyChange({ type: 'task_upserted', scope, task: task('t1', '2026-09-26T03:00:00.000Z', 'IN_PROGRESS') })
    expect(store.liveChanges).toEqual({ t2: 'arrived', t1: 'moved' })
    vi.advanceTimersByTime(LIVE_HIGHLIGHT_MS - 1)
    expect(Object.keys(store.liveChanges)).toHaveLength(2)
    vi.advanceTimersByTime(1)
    expect(store.liveChanges).toEqual({})
  })

  it('queues changes while a read is in flight and replays them onto the arriving snapshot (DS-006)', async () => {
    const store = useProjectTaskStore()
    const pending = deferred<unknown>()
    apolloClientMock.query.mockReturnValueOnce(pending.promise)
    const read = store.fetchTasks('p1')
    await Promise.resolve()
    store.applyChange({ type: 'task_upserted', scope, task: task('t2', '2026-09-26T02:00:00.000Z', 'DONE') })
    store.applyChange({ type: 'task_removed', scope, taskId: 't1' })
    // The snapshot was read before those changes were committed.
    pending.resolve({ data: { projectTasks: [task('t1', '2026-09-26T01:00:00.000Z'), task('t2', '2026-09-26T01:30:00.000Z')] } })
    await read
    expect(ids(store.getList('p1'))).toEqual(['t2'])
    expect(store.getList('p1')!.tasks[0]!.status).toBe('DONE')
  })

  it('a reconnect (connected) re-reads every loaded list; a removed Project forgets its list', async () => {
    apolloClientMock.query.mockImplementation(async ({ variables }: { variables: Record<string, string> }) => variables.projectId
      ? { data: { projectTasks: [task('t1', 'a')] } } : { data: { tasksWithoutProject: [temp('x1', 'a')] } })
    const store = useProjectTaskStore()
    await store.fetchTasks('p1'); await store.fetchTasks(TEMP_TASKS_LIST_ID)
    apolloClientMock.query.mockClear()
    store.applyChange({ type: 'connected' })
    await vi.waitFor(() => expect(apolloClientMock.query).toHaveBeenCalledTimes(2))
    store.applyChange({ type: 'project_removed', projectId: 'p1' })
    expect(store.getList('p1')).toBeNull()
    expect(store.getTempList()?.hasLoaded).toBe(true)
  })

  it('Temp tasks: read by the no-project query, Open/Done lanes for highlights, and no Project counts', async () => {
    vi.useFakeTimers()
    apolloClientMock.query.mockResolvedValue({ data: { tasksWithoutProject: [temp('x1', '2026-09-26T01:00:00.000Z', 'TODO')] } })
    const store = useProjectTaskStore()
    const setCounts = vi.spyOn(useProjectStore(), 'setTaskCounts')
    await store.fetchTasks(TEMP_TASKS_LIST_ID)
    expect(apolloClientMock.query).toHaveBeenCalledWith(expect.objectContaining({ variables: {} }))
    const none = { kind: 'no_project' } as const
    store.applyChange({ type: 'task_upserted', scope: none, task: temp('x1', '2026-09-26T02:00:00.000Z', 'IN_PROGRESS') })
    expect(store.liveChanges).toEqual({}) // still Open
    store.applyChange({ type: 'task_upserted', scope: none, task: temp('x1', '2026-09-26T03:00:00.000Z', 'DONE') })
    expect(store.liveChanges).toEqual({ x1: 'moved' })
    expect(store.getTempList()!.tasks[0]!.status).toBe('DONE')
    expect(setCounts).not.toHaveBeenCalled()
  })

  it('the Project list follows project_upserted (with server counts) and project_removed; connected re-reads once fetched', async () => {
    const projects = useProjectStore()
    projects.projects = []
    projects.applyChange({ type: 'project_upserted', project: project('p2', { taskCount: 3 }) })
    expect(projects.projects).toEqual([]) // never fetched: the list reads fresh when opened
    apolloClientMock.query.mockResolvedValue({ data: { projects: [project('p1')] } })
    await projects.fetchProjects()
    projects.applyChange({ type: 'project_upserted', project: project('p2', { taskCount: 3, openTaskCount: 2 }) })
    expect(projects.projects.map((p) => p.projectId)).toEqual(['p1', 'p2'])
    expect(projects.projects[1]).toMatchObject({ taskCount: 3, openTaskCount: 2 })
    projects.applyChange({ type: 'project_removed', projectId: 'p1' })
    expect(projects.projects.map((p) => p.projectId)).toEqual(['p2'])
    apolloClientMock.query.mockClear()
    projects.applyChange({ type: 'connected' })
    await vi.waitFor(() => expect(apolloClientMock.query).toHaveBeenCalledOnce())
  })
})
