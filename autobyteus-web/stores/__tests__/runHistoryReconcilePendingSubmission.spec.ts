import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reconcileDiscoveredActiveRuns, type RunHistoryFetchStoreLike } from '~/stores/runHistoryLoadActions'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: vi.fn(), mutate: vi.fn() }) }))

const PREPARED_RUN_ID = 'daily_assistant_prepared'

const buildPreparedContext = () => {
  const context = new AgentContext({
    agentDefinitionId: 'autobyteus-daily-assistant', agentDefinitionName: 'Daily Assistant', llmModelIdentifier: 'gpt-5.5',
    runtimeKind: 'codex_app_server', workspaceId: null, workspaceMetadata: null, autoExecuteTools: true,
    skillAccessMode: 'PRELOADED_ONLY', isLocked: false,
  }, new AgentRunState(PREPARED_RUN_ID, { id: PREPARED_RUN_ID, messages: [], createdAt: '', updatedAt: '', agentDefinitionId: 'autobyteus-daily-assistant' }))
  context.state.currentStatus = AgentStatus.Uninitialized
  return context
}

// A snapshot taken right after PrepareAgentRun: P exists but is not active yet.
const staleSnapshot = {
  workspaceGroups: [{
    workspaceRootPath: '/tmp/ws', workspaceName: 'ws', teamDefinitions: [],
    agentDefinitions: [{ agentDefinitionId: 'autobyteus-daily-assistant', agentName: 'Daily Assistant', runs: [
      { runId: PREPARED_RUN_ID, isActive: false, status: 'IDLE', summary: 'hello', createdAt: '', archivedAt: null, terminatedAt: null },
    ] }],
  }],
} as unknown as RunHistoryFetchStoreLike

describe('reconcileDiscoveredActiveRuns with a pending first send (D-14)', () => {
  let disconnect: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    setActivePinia(createPinia())
    const runStore = useAgentRunStore()
    vi.spyOn(runStore, 'isAgentStreamReady').mockReturnValue(true)
    disconnect = vi.spyOn(runStore, 'disconnectAgentStream').mockImplementation(() => undefined)
  })

  it('keeps the stream and status of a context whose local submission is in flight', async () => {
    const context = buildPreparedContext()
    context.submissionPending = true
    useAgentContextsStore().runs.set(PREPARED_RUN_ID, context)

    await reconcileDiscoveredActiveRuns(staleSnapshot)

    expect(disconnect).not.toHaveBeenCalled()
    expect(useAgentContextsStore().getRun(PREPARED_RUN_ID)!.state.currentStatus).toBe(AgentStatus.Uninitialized)
    expect(useAgentContextsStore().getRun(PREPARED_RUN_ID)!.submissionPending).toBe(true)
  })

  it('still disconnects and cleans up an inactive run without a pending submission', async () => {
    const context = buildPreparedContext()
    context.submissionPending = false
    context.state.currentStatus = AgentStatus.Idle
    useAgentContextsStore().runs.set(PREPARED_RUN_ID, context)

    await reconcileDiscoveredActiveRuns(staleSnapshot)

    expect(disconnect).toHaveBeenCalledWith(PREPARED_RUN_ID)
    expect(useAgentContextsStore().getRun(PREPARED_RUN_ID)!.state.currentStatus).toBe(AgentStatus.Offline)
  })
})
