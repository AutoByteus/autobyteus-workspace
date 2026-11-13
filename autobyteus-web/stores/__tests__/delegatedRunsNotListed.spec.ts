import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { reconcileDiscoveredActiveRuns, type RunHistoryFetchStoreLike } from '~/stores/runHistoryLoadActions'
import { refreshRunNavigationTopologyForStore, type RunHistoryNavigationStoreState } from '~/stores/runHistoryNavigationStoreActions'
import { useAgentContextsStore } from '~/stores/agentContextsStore'
import { useAgentRunStore } from '~/stores/agentRunStore'
import { useDelegatedRunsStore } from '~/stores/delegatedRunsStore'
import { useRunListStore } from '~/stores/runListStore'
import { useWorkspaceStore } from '~/stores/workspace'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'

vi.mock('~/stores/runHistoryStoreSupport', async (original) => ({
  ...await original<typeof import('~/stores/runHistoryStoreSupport')>(),
  buildNextAgentAvatarIndex: async (current: unknown) => current ?? {},
}))

/**
 * autobyteus-461 CR-461-044 (F-22): a delegated run opened from its delegator's view (rule 2) is listed once, under its
 * delegator: its own open context is not a top-level run of the list, and the list's poll leaves its stream alone. A run
 * the user opened as itself is listed as before.
 */
const context = (runId: string, status = AgentStatus.Running) => {
  const created = new AgentContext({
    agentDefinitionId: 'worker', agentDefinitionName: 'Worker', llmModelIdentifier: 'gpt', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: { workspaceRootPath: '/tmp/ws' } as never, autoExecuteTools: true, isLocked: true,
  }, new AgentRunState(runId, { id: runId, messages: [], createdAt: '2026-11-13T00:00:00.000Z', updatedAt: '2026-11-13T00:00:00.000Z', agentDefinitionId: 'worker' }))
  created.state.currentStatus = status
  return created
}
const emptyList = () => ({ workspaceGroups: [] }) as unknown as RunHistoryFetchStoreLike

describe('a delegated run opened from its delegator\'s view (CR-461-044)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    const runs = useAgentRunStore()
    vi.spyOn(runs, 'isAgentStreamReady').mockReturnValue(true)
    vi.spyOn(runs, 'connectToAgentStream').mockImplementation(() => null)
  })
  afterEach(() => { vi.restoreAllMocks() })

  it('is not a top-level run of the list; a run the user opened is', () => {
    useAgentContextsStore().runs.set('worker-run', context('worker-run'))
    useAgentContextsStore().runs.set('own-run', context('own-run'))
    useDelegatedRunsStore().ensureOpen({ kind: 'agent', agentRunId: 'worker-run' })
    useWorkspaceStore().workspaces = { ws: { workspaceId: 'ws', name: 'ws', workspaceConfig: {}, absolutePath: '/tmp/ws', workspaceRootPath: '/tmp/ws' } }
    const store = { workspaceGroups: [], agentAvatarByDefinitionId: {}, navigationProjection: null, navigationTopologyRevision: 0,
      navigationPatchRevision: 0, agentOrgHistory: [] } as RunHistoryNavigationStoreState
    refreshRunNavigationTopologyForStore(store, 'test')
    expect(store.navigationProjection!.runIndexById['own-run']).toBeDefined()
    expect(store.navigationProjection!.runIndexById['worker-run']).toBeUndefined()
  })

  it('is not a top-level run of the phone\'s run list either: one owner for both lists (CR-461-053, F-33)', () => {
    useAgentContextsStore().runs.set('worker-run', context('worker-run'))
    useAgentContextsStore().runs.set('own-run', context('own-run'))
    useDelegatedRunsStore().ensureOpen({ kind: 'agent', agentRunId: 'worker-run' })
    expect(useRunListStore().entries.map((entry) => entry.runId)).toEqual(['own-run'])
  })

  it('keeps its stream and status through the list\'s poll; a run the user opened that is not listed is torn down as before', async () => {
    useAgentContextsStore().runs.set('worker-run', context('worker-run'))
    useAgentContextsStore().runs.set('own-run', context('own-run'))
    useDelegatedRunsStore().ensureOpen({ kind: 'agent', agentRunId: 'worker-run' })
    const disconnect = vi.spyOn(useAgentRunStore(), 'disconnectAgentStream').mockImplementation(() => undefined)
    await reconcileDiscoveredActiveRuns(emptyList())
    expect(disconnect).toHaveBeenCalledWith('own-run')
    expect(disconnect).not.toHaveBeenCalledWith('worker-run')
    expect(useAgentContextsStore().getRun('worker-run')!.state.currentStatus).toBe(AgentStatus.Running)
  })
})
