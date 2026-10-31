/**
 * projectRunsStore (projects-left-navigation, DS-003, DS-004; REQ-011, AC-007, AC-011): reads every Project when the
 * mode is shown, re-reads on the explicit triggers, keeps one read per Project in flight (one queued), keeps the last
 * good snapshot on a failed read and drops a deleted Project. Apollo is a fake.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const query = vi.fn()
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => ({ query, mutate: vi.fn() })) }))

import { useProjectRunsStore } from '../projectRunsStore'
import { useProjectStore } from '../projectStore'
import type { Project, ProjectChangeMessage } from '~/types/project'

const project = (projectId: string): Project => ({ projectId, name: projectId, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0 })

const read = (projectId: string, runIds: string[] = [], scopes: Array<{ rootRunId: string; executions: Array<{ agentRunId?: string; teamRunId?: string }> }> = []) => ({
  data: { projectRunHistory: {
    projectId,
    agentDefinitions: runIds.length ? [{ agentDefinitionId: 'pm', agentName: 'PM', runs: runIds.map((runId) => ({
      runId, summary: runId, createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: 'offline',
      isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: false })) }] : [],
    teamDefinitions: [],
    agentOrgRuns: [],
    scopes: scopes.map((scope) => ({ rootKind: 'AGENT', ...scope })),
  } },
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej })
  return { promise, resolve, reject }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('projectRunsStore', () => {
  let store: ReturnType<typeof useProjectRunsStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    query.mockReset()
    const projects = useProjectStore()
    vi.spyOn(projects, 'fetchProjects').mockImplementation(async () => {
      projects.projects = [project('P'), project('Q')]
      projects.hasFetched = true
      return projects.projects
    })
    store = useProjectRunsStore()
  })

  it('reads every Project when shown, with their scopes as copy keys (DS-003)', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId, [`${variables.projectId}-run`],
      [{ rootRunId: `${variables.projectId}-run`, executions: [{ teamRunId: 'set-1' }, { agentRunId: 'apc-1' }] }]))
    store.show()
    expect(store.firstRead).toBe('loading')
    await flush()
    expect(store.firstRead).toBe('ready')
    expect(Object.keys(store.snapshots).sort()).toEqual(['P', 'Q'])
    expect([...store.snapshots.P!.scopes['AGENT:P-run']!]).toEqual(['team:set-1', 'agent:apc-1'])
    expect(store.projection.entries.map((entry) => entry.project.projectId)).toEqual(['P', 'Q'])
  })

  it('re-reads only on its triggers, and nothing while the mode is hidden (DS-004)', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId, variables.projectId === 'P' ? ['host-1'] : []))
    const hide = store.show()
    await flush()
    query.mockClear()
    const ids = () => query.mock.calls.map(([options]) => options.variables.projectId).sort()

    store.applyChange({ type: 'task_upserted', scope: { kind: 'project', projectId: 'Q' }, task: {} } as ProjectChangeMessage)
    await flush()
    expect(ids()).toEqual(['Q'])

    query.mockClear()
    // A Temp task carries no Project: the Projects listing its hosting root are read (SCN-009).
    store.applyChange({ type: 'task_upserted', scope: { kind: 'no_project' }, task: { root: { hostRoot: { kind: 'agent', runId: 'host-1' } } } } as ProjectChangeMessage)
    await flush()
    expect(ids()).toEqual(['P'])

    query.mockClear()
    store.applyChange({ type: 'connected' })
    await flush()
    expect(ids()).toEqual(['P', 'Q'])

    query.mockClear()
    store.noteUnscoped('P', ['agent:copy-1'])
    store.noteUnscoped('P', ['agent:copy-1'])
    await flush()
    expect(ids()).toEqual(['P'])

    hide()
    query.mockClear()
    store.applyChange({ type: 'connected' })
    store.noteRunStarted('P')
    await flush()
    expect(query).not.toHaveBeenCalled()
  })

  it('keeps one read per Project in flight and one queued; an older answer never replaces a newer one', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId))
    store.show()
    await flush()
    const first = deferred<ReturnType<typeof read>>()
    const second = deferred<ReturnType<typeof read>>()
    query.mockReset()
    query.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    const change = { type: 'task_upserted', scope: { kind: 'project', projectId: 'P' }, task: {} } as ProjectChangeMessage
    store.applyChange(change)
    store.applyChange(change)
    store.applyChange(change)
    expect(query).toHaveBeenCalledTimes(1)
    first.resolve(read('P', ['old']))
    await flush()
    expect(query).toHaveBeenCalledTimes(2)
    second.resolve(read('P', ['new']))
    await flush()
    expect(store.snapshots.P!.agentDefinitions[0]!.runs[0]!.runId).toBe('new')
  })

  it('keeps the last good tree when a later read fails, and drops a deleted Project (REQ-011, REQ-013)', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId, ['run-1']))
    store.show()
    await flush()
    query.mockRejectedValueOnce(new Error('offline'))
    store.applyChange({ type: 'task_removed', scope: { kind: 'project', projectId: 'P' }, taskId: 't' } as ProjectChangeMessage)
    await flush()
    expect(store.refreshFailed).toBe(true)
    expect(store.snapshots.P!.agentDefinitions[0]!.runs[0]!.runId).toBe('run-1')

    query.mockResolvedValueOnce({ errors: [{ message: 'gone', extensions: { code: 'PROJECT_NOT_FOUND' } }], data: null })
    store.applyChange({ type: 'task_removed', scope: { kind: 'project', projectId: 'P' }, taskId: 't' } as ProjectChangeMessage)
    await flush()
    expect(store.snapshots.P).toBeUndefined()
  })

  it('shows the first-read error when nothing could be read, and Retry reads again (AC-011)', async () => {
    query.mockRejectedValue(new Error('offline'))
    store.show()
    await flush()
    expect(store.firstRead).toBe('error')
    query.mockImplementation(async ({ variables }) => read(variables.projectId))
    await store.retry()
    expect(store.firstRead).toBe('ready')
    expect(store.refreshFailed).toBe(false)
  })
})
