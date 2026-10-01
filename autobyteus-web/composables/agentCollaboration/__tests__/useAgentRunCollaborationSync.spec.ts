import { beforeEach, expect, it, vi } from 'vitest'
import { effectScope, nextTick, reactive } from 'vue'
import { useAgentRunCollaborationSync } from '../useAgentRunCollaborationSync'
const calls = vi.hoisted(() => ({ syncHost: vi.fn() }))
let selection: any; let agents: any; let node: any
vi.mock('~/stores/agentSelectionStore', () => ({ useAgentSelectionStore: () => selection }))
vi.mock('~/stores/agentContextsStore', () => ({ useAgentContextsStore: () => agents }))
vi.mock('~/stores/windowNodeContextStore', () => ({ useWindowNodeContextStore: () => node }))
vi.mock('~/stores/agentRunCollaborationStore', () => ({ useAgentRunCollaborationStore: () => calls }))
beforeEach(() => {
  calls.syncHost.mockClear(); selection = reactive({ selectedType: 'agent' }); node = reactive({ bindingRevision: 1 })
  agents = reactive({ activeRun: { state: { runId: 'host', currentStatus: 'error', recoverableBlock: null } } })
})
it('only current recovery makes Error live, watches recovery changes at unchanged status and bound node', async () => {
  const scope = effectScope(); scope.run(useAgentRunCollaborationSync)
  expect(calls.syncHost).toHaveBeenLastCalledWith('host', false)
  agents.activeRun.state.recoverableBlock = { operationId: 'op', failureEpoch: 1, state: 'awaiting_user', position: { kind: 'held_turn', turnId: 'A' } }
  await nextTick(); expect(calls.syncHost).toHaveBeenLastCalledWith('host', true)
  node.bindingRevision++; await nextTick(); expect(calls.syncHost).toHaveBeenCalledTimes(3)
  agents.activeRun.state.recoverableBlock = null
  await nextTick(); expect(calls.syncHost).toHaveBeenLastCalledWith('host', false)
  agents.activeRun.state.currentStatus = 'offline'
  agents.activeRun.state.recoverableBlock = { operationId: 'stale' }
  await nextTick(); expect(calls.syncHost).toHaveBeenLastCalledWith('host', false)
  scope.stop()
})
