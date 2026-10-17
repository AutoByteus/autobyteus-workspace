import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const { apolloClientMock, feedMock, releaseFeed } = vi.hoisted(() => {
  const releaseFeed = vi.fn()
  return { apolloClientMock: { query: vi.fn(), mutate: vi.fn() }, releaseFeed, feedMock: { retain: vi.fn(() => releaseFeed) } }
})
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => apolloClientMock) }))
vi.mock('~/services/projects/projectChangeFeed', () => ({ getProjectChangeFeed: () => feedMock }))

import { useTaskWorkerTaskStore } from '../taskWorkerTaskStore'
import { useWindowNodeContextStore } from '../windowNodeContextStore'
import type { ProjectTask, TaskWorkerRef, TaskWorkerTask } from '~/types/project'

const agent: TaskWorkerRef = { kind: 'agent', agentRunId: 'a1' }
const team: TaskWorkerRef = { kind: 'team', teamRunId: 't1' }
const workerTask = (taskId: string, projectId: string | null = 'p1', status: TaskWorkerTask['status'] = 'IN_PROGRESS'): TaskWorkerTask =>
  ({ taskId, projectId, description: `Task ${taskId}`, status })
type Answer = { workerKind: 'agent' | 'team'; workerRunId: string; task: TaskWorkerTask | null }
const answering = (...answers: Answer[]) => ({ data: { taskWorkerTasks: answers } })
const settle = () => new Promise((resolve) => setTimeout(resolve, 0))
const upserted = (taskId: string, root: Partial<NonNullable<ProjectTask['root']>> | null) => ({
  type: 'task_upserted' as const, scope: { kind: 'project' as const, projectId: 'p1' },
  task: { taskId, projectId: 'p1', taskKey: `p1-${taskId}`, description: 'd', status: 'TODO' as const, dependsOnTaskIds: [], contextFiles: [], createdAt: '', updatedAt: '',
    root: root && { kind: 'agent', recipientAddress: null, ingressAgentRunId: 'x', teamRunId: null, hostRoot: { kind: 'agent', runId: 'h' },
      start: 'started', startError: null, closed: false, status: 'idle', ...root } as NonNullable<ProjectTask['root']> },
})
const lastVariables = () => apolloClientMock.query.mock.calls.at(-1)?.[0]?.variables

describe('taskWorkerTaskStore (delegated-copy-task-locator DS-001, DS-003)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
    vi.spyOn(useWindowNodeContextStore(), 'waitForBoundBackendReady').mockResolvedValue(true)
  })

  it('reads newly shown workers in one batched query and caches each answer (QR-001)', async () => {
    apolloClientMock.query.mockResolvedValue(answering(
      { workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-a') },
      { workerKind: 'team', workerRunId: 't1', task: null },
    ))
    const store = useTaskWorkerTaskStore()
    store.retain([agent])
    store.retain([team])
    expect(store.taskOf(agent)).toBeUndefined()
    await settle()

    expect(apolloClientMock.query).toHaveBeenCalledOnce()
    expect(lastVariables()).toEqual({ agentRunIds: ['a1'], teamRunIds: ['t1'] })
    expect(store.taskOf(agent)).toEqual(workerTask('task-a'))
    expect(store.taskOf(team)).toBeNull()
    expect(feedMock.retain).toHaveBeenCalledOnce()
  })

  it('keeps answers while any interest remains and releases the feed with the last interest', async () => {
    apolloClientMock.query.mockResolvedValue(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-a') }))
    const store = useTaskWorkerTaskStore()
    const first = store.retain([agent])
    const second = store.retain([agent])
    await settle()
    expect(apolloClientMock.query).toHaveBeenCalledOnce()

    first()
    first()
    expect(store.taskOf(agent)).toEqual(workerTask('task-a'))
    expect(releaseFeed).not.toHaveBeenCalled()
    second()
    expect(store.taskOf(agent)).toBeUndefined()
    expect(releaseFeed).toHaveBeenCalledOnce()
  })

  it('re-reads only the workers a change may affect (connected, root match, cached Task, removal, Project removal)', async () => {
    apolloClientMock.query.mockResolvedValueOnce(answering(
      { workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-a', 'p1') },
      { workerKind: 'team', workerRunId: 't1', task: workerTask('task-t', null) },
    ))
    const store = useTaskWorkerTaskStore()
    store.retain([agent, team])
    await settle()
    apolloClientMock.query.mockResolvedValue(answering())
    const readAfter = async (message: Parameters<typeof store.applyChange>[0]) => {
      apolloClientMock.query.mockClear()
      store.applyChange(message)
      await settle()
      return apolloClientMock.query.mock.calls.length ? lastVariables() : null
    }

    expect(await readAfter({ type: 'connected' })).toEqual({ agentRunIds: ['a1'], teamRunIds: ['t1'] })
    // A follow-up Task whose root is the agent copy; a team root by its team run.
    expect(await readAfter(upserted('task-b', { kind: 'agent', ingressAgentRunId: 'a1' }))).toEqual({ agentRunIds: ['a1'], teamRunIds: [] })
    expect(await readAfter(upserted('task-c', { kind: 'team', ingressAgentRunId: 'lead', teamRunId: 't1' }))).toEqual({ agentRunIds: [], teamRunIds: ['t1'] })
    // A rename (or a new root) of the cached Task; a Task unrelated to any shown worker reads nothing.
    expect(await readAfter(upserted('task-a', null))).toEqual({ agentRunIds: ['a1'], teamRunIds: [] })
    expect(await readAfter(upserted('task-z', { kind: 'agent', ingressAgentRunId: 'other' }))).toBeNull()
    expect(await readAfter({ type: 'task_removed', scope: { kind: 'no_project' }, taskId: 'task-t' })).toEqual({ agentRunIds: [], teamRunIds: ['t1'] })
    expect(await readAfter({ type: 'project_removed', projectId: 'p1' })).toEqual({ agentRunIds: ['a1'], teamRunIds: [] })
    expect(await readAfter({ type: 'task_worker_status', scope: { kind: 'project', projectId: 'p1' }, taskId: 'task-a', status: 'running' })).toBeNull()
  })

  it('applies the answers of a re-read: rename, follow-up and removal', async () => {
    apolloClientMock.query.mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-a') }))
    const store = useTaskWorkerTaskStore()
    store.retain([agent])
    await settle()

    apolloClientMock.query.mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: { ...workerTask('task-a'), description: 'Renamed' } }))
    store.applyChange(upserted('task-a', null))
    await settle()
    expect(store.taskOf(agent)?.description).toBe('Renamed')

    apolloClientMock.query.mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-b') }))
    store.applyChange(upserted('task-b', { kind: 'agent', ingressAgentRunId: 'a1' }))
    await settle()
    expect(store.taskOf(agent)?.taskId).toBe('task-b')

    apolloClientMock.query.mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: null }))
    store.applyChange({ type: 'task_removed', scope: { kind: 'project', projectId: 'p1' }, taskId: 'task-b' })
    await settle()
    expect(store.taskOf(agent)).toBeNull()
  })

  it('never lets an older answer for a key overwrite a newer one (per-key read epochs)', async () => {
    let resolveOld!: (value: unknown) => void
    apolloClientMock.query
      .mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
      .mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-new') }))
    const store = useTaskWorkerTaskStore()
    store.retain([agent])
    await settle()
    store.applyChange({ type: 'connected' })
    await settle()
    expect(store.taskOf(agent)?.taskId).toBe('task-new')

    resolveOld(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-old') }))
    await settle()
    expect(store.taskOf(agent)?.taskId).toBe('task-new')
  })

  it('starts over for a newly bound node and ignores the old node\'s answer', async () => {
    let resolveOld!: (value: unknown) => void
    apolloClientMock.query.mockImplementationOnce(() => new Promise((resolve) => { resolveOld = resolve }))
    const store = useTaskWorkerTaskStore()
    store.retain([agent])
    await settle()
    apolloClientMock.query.mockResolvedValueOnce(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-node-b') }))
    useWindowNodeContextStore().bindingRevision++
    resolveOld(answering({ workerKind: 'agent', workerRunId: 'a1', task: workerTask('task-node-a') }))
    await settle()

    expect(apolloClientMock.query).toHaveBeenCalledTimes(2)
    expect(store.taskOf(agent)?.taskId).toBe('task-node-b')
  })

  it('leaves a worker unknown when the read fails (no fallback scan)', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)
    apolloClientMock.query.mockRejectedValue(new Error('offline'))
    const store = useTaskWorkerTaskStore()
    store.retain([agent])
    await settle()
    expect(store.taskOf(agent)).toBeUndefined()
    expect(warn).toHaveBeenCalled()
  })
})
