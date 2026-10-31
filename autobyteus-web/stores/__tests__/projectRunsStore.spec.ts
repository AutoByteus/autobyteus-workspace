/**
 * projectRunsStore (projects-tree-one-place, autobyteus-353; REQ-003, AC-004; and 347's read-state rules): reads every
 * Project when the mode is shown; re-reads only when the listing can change (`connected`, a Project added or removed,
 * a run started, archived, deleted or stopped from this window), never on Task changes; keeps one read per Project in
 * flight (one queued), keeps the last good snapshot on a failed read and drops a deleted Project. Apollo is a fake.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

const query = vi.fn()
const mutate = vi.fn()
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: vi.fn(() => ({ query, mutate })) }))

import { useProjectRunsStore } from '../projectRunsStore'
import { useProjectStore } from '../projectStore'
import { useAgentRunStore } from '../agentRunStore'
import { useAgentTeamRunStore } from '../agentTeamRunStore'
import type { Project, ProjectChangeMessage } from '~/types/project'

const project = (projectId: string): Project => ({ projectId, name: projectId, description: '', createdAt: '', updatedAt: '',
  workspaces: [], openTaskCount: 0, taskCount: 0 })

const read = (projectId: string, runIds: string[] = [], teamRunIds: string[] = []) => ({
  data: { projectRunHistory: {
    projectId,
    agentDefinitions: runIds.length ? [{ agentDefinitionId: 'pm', agentName: 'PM', runs: runIds.map((runId) => ({
      runId, summary: runId, createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, status: 'offline',
      isActive: false, shouldConnectStream: false, statusSource: 'TEST', hasCollaboration: false })) }] : [],
    teamDefinitions: teamRunIds.length ? [{ teamDefinitionId: 'set', teamDefinitionName: 'set', runs: teamRunIds.map((teamRunId) => ({
      teamRunId, teamDefinitionId: 'set', teamDefinitionName: 'set', coordinatorAddress: '/lead', workspaceRootPath: '/ws', summary: '',
      createdAt: '2026-10-31T00:00:00.000Z', archivedAt: null, terminatedAt: null, isActive: true, rootTeam: {}, members: [] })) }] : [],
  } },
})

const deferred = <T>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((res) => { resolve = res })
  return { promise, resolve }
}

const flush = () => new Promise((resolve) => setTimeout(resolve, 0))
/** Only Project reads count (a stop also refreshes the Workspaces tree). */
const projectReads = () => query.mock.calls.map(([options]) => options.variables?.projectId).filter(Boolean).sort()

describe('projectRunsStore', () => {
  let store: ReturnType<typeof useProjectRunsStore>
  beforeEach(() => {
    setActivePinia(createPinia())
    query.mockReset()
    mutate.mockReset()
    const projects = useProjectStore()
    vi.spyOn(projects, 'fetchProjects').mockImplementation(async () => {
      projects.projects = [project('P'), project('Q')]
      projects.hasFetched = true
      return projects.projects
    })
    store = useProjectRunsStore()
  })

  it('reads every Project when shown (DS-001)', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId, [`${variables.projectId}-run`]))
    store.show()
    expect(store.firstRead).toBe('loading')
    await flush()
    expect(store.firstRead).toBe('ready')
    expect(Object.keys(store.snapshots).sort()).toEqual(['P', 'Q'])
    expect(store.projection.entries.map((entry) => entry.project.projectId)).toEqual(['P', 'Q'])
  })

  it('re-reads on connected, a Project added and a run started here; never on Task changes or while hidden (REQ-003)', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId))
    const hide = store.show()
    await flush()
    query.mockClear()

    // Task changes do not change which runs are started under a Project.
    store.applyChange({ type: 'task_upserted', scope: { kind: 'project', projectId: 'Q' }, task: {} } as ProjectChangeMessage)
    store.applyChange({ type: 'task_upserted', scope: { kind: 'no_project' }, task: { root: { hostRoot: { kind: 'agent', runId: 'P-run' } } } } as ProjectChangeMessage)
    store.applyChange({ type: 'task_removed', scope: { kind: 'project', projectId: 'P' }, taskId: 't' } as ProjectChangeMessage)
    await flush()
    expect(projectReads()).toEqual([])

    store.applyChange({ type: 'connected' })
    await flush()
    expect(projectReads()).toEqual(['P', 'Q'])

    query.mockClear()
    store.applyChange({ type: 'project_upserted', project: project('R') })
    store.noteRunStarted('P')
    await flush()
    expect(projectReads()).toEqual(['P', 'R'])

    hide()
    query.mockClear()
    store.applyChange({ type: 'connected' })
    store.noteRunStarted('P')
    await flush()
    expect(query).not.toHaveBeenCalled()
  })

  it('re-reads the Project listing a run after the web stops it, an Agent run or a Team run (AC-004)', async () => {
    query.mockImplementation(async ({ variables }) => (variables?.projectId
      ? read(variables.projectId, variables.projectId === 'P' ? ['running-1'] : [], variables.projectId === 'Q' ? ['team-1'] : [])
      : { data: {} }))
    store.show()
    await flush()
    query.mockClear()
    mutate.mockResolvedValue({ data: { terminateAgentRun: { success: true, message: 'stopped' }, terminateAgentTeamRun: { success: true } } })
    await useAgentRunStore().terminateRun('running-1')
    await flush()
    expect(projectReads()).toEqual(['P'])
    query.mockClear()
    await useAgentTeamRunStore().terminateTeamRun('team-1')
    await flush()
    expect(projectReads()).toEqual(['Q'])
  })

  it('keeps one read per Project in flight and one queued; an older answer never replaces a newer one', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId))
    store.show()
    await flush()
    const first = deferred<ReturnType<typeof read>>()
    const second = deferred<ReturnType<typeof read>>()
    query.mockReset()
    query.mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise)
    store.noteRunStarted('P')
    store.noteRunStarted('P')
    store.noteRunStarted('P')
    expect(query).toHaveBeenCalledTimes(1)
    first.resolve(read('P', ['old']))
    await flush()
    expect(query).toHaveBeenCalledTimes(2)
    second.resolve(read('P', ['new']))
    await flush()
    expect(store.snapshots.P!.agentDefinitions[0]!.runs[0]!.runId).toBe('new')
  })

  it('keeps the last good tree when a later read fails, and drops a deleted Project', async () => {
    query.mockImplementation(async ({ variables }) => read(variables.projectId, ['run-1']))
    store.show()
    await flush()
    query.mockRejectedValueOnce(new Error('offline'))
    store.noteRunStarted('P')
    await flush()
    expect(store.refreshFailed).toBe(true)
    expect(store.snapshots.P!.agentDefinitions[0]!.runs[0]!.runId).toBe('run-1')

    query.mockResolvedValueOnce({ errors: [{ message: 'gone', extensions: { code: 'PROJECT_NOT_FOUND' } }], data: null })
    store.noteRunStarted('P')
    await flush()
    expect(store.snapshots.P).toBeUndefined()
  })

  it('shows the first-read error when nothing could be read, and Retry reads again', async () => {
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
