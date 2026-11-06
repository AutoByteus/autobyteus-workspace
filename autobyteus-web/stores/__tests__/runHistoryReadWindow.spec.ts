import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useRunHistoryStore } from '~/stores/runHistoryStore'
import { useRunHistoryRetiredRunsStore } from '~/stores/runHistoryRetiredRuns'
import { GetWorkspaceRunHistory, ListWorkspaceRunHistory } from '~/graphql/queries/runHistoryQueries'
import { useMobileWorkCatalog } from '~/composables/mobile/useMobileWorkCatalog'
import type { RunHistoryWorkspaceGroup } from '~/stores/runHistoryTypes'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ agentWs: 'ws://fixture.invalid/ws/agent' }) }),
}))
vi.mock('~/stores/runHistoryStoreSupport', async (original) => ({
  ...await original<typeof import('~/stores/runHistoryStoreSupport')>(),
  buildNextAgentAvatarIndex: async (current: unknown) => current ?? {},
}))

const agentRun = (runId: string, createdAt: string) => ({
  runId, status: 'IDLE', summary: runId, createdAt, lastActivityAt: createdAt, archivedAt: null, terminatedAt: null,
  isActive: false, shouldConnectStream: false,
})
const historyOf = (runs: ReturnType<typeof agentRun>[]) => [{
  workspaceRootPath: '/tmp/ws', workspaceName: 'ws', teamDefinitions: [],
  agentDefinitions: [{ agentDefinitionId: 'daily-assistant', agentName: 'Daily Assistant', runs }],
}] as unknown as RunHistoryWorkspaceGroup[]

let history: RunHistoryWorkspaceGroup[] = []
const workspaceReads = () => io.query.mock.calls
  .map(([request]) => request)
  .filter((request) => request.query === ListWorkspaceRunHistory)

// workspace-tree-vs-chooser DS-002 (from autobyteus-378): one read window owned by runHistoryStore; the run section sets
// it per view (Runs and Projects: null, Workspaces: 6), the phone sets 5.
describe('the run history read window (one value per store; null reads every run)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    history = historyOf([agentRun('run-new', '2026-11-02T00:00:00.000Z')])
    io.query.mockReset()
    io.query.mockImplementation(async (request: { query: unknown }) => request.query === ListWorkspaceRunHistory
      ? { data: { listWorkspaceRunHistory: history } }
      : { data: { listCollaborationRootHistory: [] } })
  })
  afterEach(() => vi.restoreAllMocks())

  it('reads 6 per agent by default', async () => {
    await useRunHistoryStore().fetchTree()
    expect(workspaceReads().map((request) => request.variables)).toEqual([{ limitPerAgent: 6 }])
  })

  it('keeps the window it was given on the first read and every quiet refresh', async () => {
    const store = useRunHistoryStore()
    store.setHistoryWindow(null)
    await store.fetchTree()
    await store.refreshTreeQuietly()
    expect(workspaceReads().map((request) => request.variables)).toEqual([{ limitPerAgent: null }, { limitPerAgent: null }])
  })

  it('the folder read uses the same window', async () => {
    io.query.mockImplementation(async (request: { query: unknown }) => request.query === GetWorkspaceRunHistory
      ? { data: { workspaceRunHistory: history[0] } }
      : { data: { listCollaborationRootHistory: [] } })
    const store = useRunHistoryStore()
    store.setHistoryWindow(null)
    await store.fetchWorkspaceHistory('ws-1')
    const folderReads = io.query.mock.calls.map(([request]) => request).filter((request) => request.query === GetWorkspaceRunHistory)
    expect(folderReads.map((request) => request.variables)).toEqual([{ workspaceId: 'ws-1', limitPerAgent: null }])
  })

  it('the phone sets its own window of 5 before its read, whatever the desktop view set', async () => {
    const store = useRunHistoryStore()
    store.setHistoryWindow(null)
    await useMobileWorkCatalog().refreshMobileCatalogSegment('recent')
    expect(store.historyWindow).toBe(5)
    expect(workspaceReads().map((request) => request.variables)).toEqual([{ limitPerAgent: 5 }])
  })

  it('keeps the mobile window of 5 on quiet refreshes', async () => {
    const store = useRunHistoryStore()
    store.setHistoryWindow(5)
    await store.fetchTree()
    await store.refreshTreeQuietly()
    expect(workspaceReads().map((request) => request.variables)).toEqual([{ limitPerAgent: 5 }, { limitPerAgent: 5 }])
  })
})

describe('retiring runs a read no longer lists', () => {
  beforeEach(() => setActivePinia(createPinia()))

  const sixNewest = Array.from({ length: 6 }, (_, index) => agentRun(`run-${index}`, `2026-11-0${index + 1}T00:00:00.000Z`))

  it('with no window, retires an agent run the read no longer lists, however old', () => {
    const retired = useRunHistoryRetiredRunsStore()
    retired.reconcileHistoryRead(historyOf([agentRun('run-old', '2026-01-01T00:00:00.000Z'), ...sixNewest]), null)
    retired.reconcileHistoryRead(historyOf(sixNewest), null)
    expect([...retired.retiredRunIds]).toEqual(['run-old'])
  })

  it('with a window, keeps an older run that only fell out of it', () => {
    const retired = useRunHistoryRetiredRunsStore()
    retired.reconcileHistoryRead(historyOf([agentRun('run-old', '2026-01-01T00:00:00.000Z'), ...sixNewest.slice(1)]), 6)
    retired.reconcileHistoryRead(historyOf(sixNewest), 6)
    expect([...retired.retiredRunIds]).toEqual([])
  })

  it('shrinking the window from every run (Runs view) to 6 (Workspaces view) retires no run that only fell out of it', () => {
    const retired = useRunHistoryRetiredRunsStore()
    const older = [agentRun('run-old-a', '2026-01-01T00:00:00.000Z'), agentRun('run-old-b', '2026-01-02T00:00:00.000Z')]
    retired.reconcileHistoryRead(historyOf([...older, ...sixNewest]), null)
    retired.reconcileHistoryRead(historyOf(sixNewest), 6)
    expect([...retired.retiredRunIds]).toEqual([])
  })
})
