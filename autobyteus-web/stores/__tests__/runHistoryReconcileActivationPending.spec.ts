import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { fetchRunHistoryTree, reconcileDiscoveredActiveRuns, type RunHistoryFetchStoreLike } from '~/stores/runHistoryLoadActions'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { ListWorkspaceRunHistory } from '~/graphql/queries/runHistoryQueries'

const io = vi.hoisted(() => ({ query: vi.fn(), mutate: vi.fn() }))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => io }))
vi.mock('~/stores/windowNodeContextStore', () => ({
  useWindowNodeContextStore: () => ({ waitForBoundBackendReady: async () => true, getBoundEndpoints: () => ({ agentWs: 'ws://fixture.invalid/ws/agent' }) }),
}))
vi.mock('~/stores/runHistoryStoreSupport', async (original) => ({
  ...await original<typeof import('~/stores/runHistoryStoreSupport')>(),
  buildNextAgentAvatarIndex: async (current: unknown) => current ?? {},
}))

const RUN_ID = 'daily_assistant_prepared'

const buildContext = (status: AgentStatus, submissionPending: boolean) => {
  const context = new AgentContext({
    agentDefinitionId: 'autobyteus-daily-assistant', agentDefinitionName: 'Daily Assistant', llmModelIdentifier: 'gpt-5.5',
    runtimeKind: 'codex_app_server', workspaceId: null, workspaceMetadata: null, autoExecuteTools: true,
    isLocked: false,
  }, new AgentRunState(RUN_ID, { id: RUN_ID, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'autobyteus-daily-assistant' }))
  context.state.currentStatus = status
  context.submissionPending = submissionPending
  return context
}

const snapshot = (run: { isActive: boolean; shouldConnectStream?: boolean }) => ({
  workspaceGroups: [{
    workspaceRootPath: '/tmp/ws', workspaceName: 'ws', teamDefinitions: [],
    agentDefinitions: [{ agentDefinitionId: 'autobyteus-daily-assistant', agentName: 'Daily Assistant', runs: [
      { runId: RUN_ID, status: 'IDLE', summary: 'hello', createdAt: '', archivedAt: null, terminatedAt: null, shouldConnectStream: false, ...run },
    ] }],
  }],
}) as unknown as RunHistoryFetchStoreLike

describe('reconcileDiscoveredActiveRuns and the activation-pending marker (D-14)', () => {
  let disconnect: ReturnType<typeof vi.spyOn>
  let connect: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    const runStore = useAgentRunStore()
    runStore.clearActivationPending(RUN_ID)
    vi.spyOn(runStore, 'isAgentStreamReady').mockReturnValue(true)
    disconnect = vi.spyOn(runStore, 'disconnectAgentStream').mockImplementation(() => undefined)
    connect = vi.spyOn(runStore, 'connectToAgentStream').mockImplementation(() => null)
  })
  afterEach(() => { useAgentRunStore().clearActivationPending(RUN_ID); vi.restoreAllMocks() })

  it('keeps a marked run connected on a snapshot that predates activation, even after the connect-time offline status', async () => {
    // The observed race (AF-33): AGENT_STATUS offline already cleared submissionPending.
    useAgentContextsStore().runs.set(RUN_ID, buildContext(AgentStatus.Offline, false))
    useAgentRunStore().markActivationPending(RUN_ID)

    await reconcileDiscoveredActiveRuns(snapshot({ isActive: false }))

    expect(disconnect).not.toHaveBeenCalled()
    expect(useAgentRunStore().isActivationPending(RUN_ID)).toBe(true)
  })

  it('applies no Offline cleanup to a marked run', async () => {
    useAgentContextsStore().runs.set(RUN_ID, buildContext(AgentStatus.Initializing, true))
    useAgentRunStore().markActivationPending(RUN_ID)

    await reconcileDiscoveredActiveRuns(snapshot({ isActive: false }))

    const context = useAgentContextsStore().getRun(RUN_ID)!
    expect(context.state.currentStatus).toBe(AgentStatus.Initializing)
    expect(context.submissionPending).toBe(true)
  })

  it('tears down an unmarked inactive run, whatever submissionPending says (the SR-008 guard is gone)', async () => {
    useAgentContextsStore().runs.set(RUN_ID, buildContext(AgentStatus.Idle, true))

    await reconcileDiscoveredActiveRuns(snapshot({ isActive: false }))

    expect(disconnect).toHaveBeenCalledWith(RUN_ID)
    expect(useAgentContextsStore().getRun(RUN_ID)!.state.currentStatus).toBe(AgentStatus.Offline)
  })

  it.each([[{ isActive: true }], [{ isActive: false, shouldConnectStream: true }]])(
    'clears the marker once a snapshot confirms activation (%o)', async (run) => {
      useAgentContextsStore().runs.set(RUN_ID, buildContext(AgentStatus.Offline, false))
      useAgentRunStore().markActivationPending(RUN_ID)

      await reconcileDiscoveredActiveRuns(snapshot(run))

      expect(useAgentRunStore().isActivationPending(RUN_ID)).toBe(false)
      expect(disconnect).not.toHaveBeenCalled()
      // Later inactive snapshots reconcile the run normally again.
      await reconcileDiscoveredActiveRuns(snapshot({ isActive: false }))
      expect(disconnect).toHaveBeenCalledWith(RUN_ID)
    })

  it('never applies an older workspace snapshot after a newer one (R-2)', async () => {
    useAgentContextsStore().runs.set(RUN_ID, buildContext(AgentStatus.Running, false))
    const pending: Array<(value: unknown) => void> = []
    io.query.mockImplementation(({ query }: { query: unknown }) => {
      if (query !== ListWorkspaceRunHistory) return Promise.reject(new Error('org history not under test'))
      return new Promise((resolve) => pending.push(resolve))
    })
    const store = {
      workspaceGroups: [], agentOrgHistory: [], historyFamilyErrors: { workspace: null, agentOrg: null },
      agentOrgRequestGeneration: 0, workspaceRequestGeneration: 0, agentAvatarByDefinitionId: {},
      refreshRunNavigationTopology: vi.fn(), loading: false, error: null,
    } as unknown as RunHistoryFetchStoreLike
    const older = fetchRunHistoryTree(store, 6, { quiet: true })
    const newer = fetchRunHistoryTree(store, 6, { quiet: true })
    await vi.waitFor(() => expect(pending).toHaveLength(2))

    // The newer snapshot (run active) lands first; the older one (taken before activation) lands last.
    pending[1]!({ data: { listWorkspaceRunHistory: (snapshot({ isActive: true }) as any).workspaceGroups } })
    await newer
    pending[0]!({ data: { listWorkspaceRunHistory: (snapshot({ isActive: false }) as any).workspaceGroups } })
    await older

    expect(store.workspaceGroups[0]!.agentDefinitions[0]!.runs[0]!.isActive).toBe(true)
    expect(disconnect).not.toHaveBeenCalled()
    expect(useAgentContextsStore().getRun(RUN_ID)!.state.currentStatus).toBe(AgentStatus.Running)
  })
})
