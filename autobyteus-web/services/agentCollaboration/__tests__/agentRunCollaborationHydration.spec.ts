import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { useAgentActivityStore } from '~/stores/agentActivityStore'
import { useRunFileChangesStore } from '~/stores/runFileChangesStore'
import { buildAgentRunCollaborationContext } from '../agentRunCollaborationHydration'
import { agentRootView } from './agentRootFixture'

const mocks = vi.hoisted(() => ({
  query: vi.fn(),
  ensureWorkspace: vi.fn(async () => null),
  resolveWorkspace: vi.fn(async (root: string) => ({ workspaceId: `ws:${root}`, workspaceRootPath: root })),
}))
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query: mocks.query }) }))
vi.mock('~/stores/runHistoryStore', () => ({ useRunHistoryStore: () => ({
  ensureWorkspaceByRootPath: mocks.ensureWorkspace,
  resolveWorkspaceMetadataByRootPath: mocks.resolveWorkspace,
}) }))

/** delegated-copies-slow-open D-1 (AC-001, AC-002): a hub's context is built from its view alone. */
describe('buildAgentRunCollaborationContext', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  it('builds one Offline context per child with statuses from the view and requests no child details', async () => {
    const context = await buildAgentRunCollaborationContext({ hostRunId: 'host-run', view: agentRootView() })

    expect(mocks.query).not.toHaveBeenCalled()
    expect(context.listAgentContextEntries().map((entry) => [entry.agentRunId, entry.context.state.currentStatus])).toEqual([
      ['cua-run', AgentStatus.Idle], ['pp-run', AgentStatus.Running], ['pb-run', AgentStatus.Offline],
    ])
    for (const entry of context.listAgentContextEntries()) {
      expect(entry.context.state.conversation.messages).toEqual([])
      expect(context.isChildHydrated(entry.agentRunId)).toBe(false)
      expect(useAgentActivityStore().getActivities(entry.agentRunId)).toEqual([])
      expect(useRunFileChangesStore().getArtifactsForRun(entry.agentRunId)).toEqual([])
    }
    expect(context.listTaskRows(() => true).map((row) => row.row.displayName))
      .toEqual(['computer use agent', 'product team', 'prototyper', 'bootstrapper'])
  })

  it.each([true, false])('resolves each distinct workspace root once (active=%s)', async (active) => {
    const view = agentRootView()
    view.is_active = active
    const context = await buildAgentRunCollaborationContext({ hostRunId: 'host-run', view })

    expect(mocks.resolveWorkspace).toHaveBeenCalledOnce()
    expect(mocks.ensureWorkspace).toHaveBeenCalledTimes(active ? 1 : 0)
    expect(context.getAgentContext('pb-run')!.config.workspaceId).toBe('ws:/ws')
  })
})
