import { describe, expect, it } from 'vitest'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRootView } from './agentRootFixture'

// The view's child statuses (autobyteus-461 SR-055: the history poll's answer no longer updates a view).

const block = { operationId: 'op-1', failureEpoch: 1, position: { kind: 'held_turn', turnId: 't-1' }, state: 'awaiting_user', code: 'COMPACTION_FAILED', message: 'Compaction failed.' }

const build = () => {
  const view = agentRootView()
  return new AgentRunCollaborationContext({
    hostRunId: 'host-run', view,
    entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => ({
      agentRunId: agent.agentRunId, memberAddress: agent.address,
      context: new AgentContext({ agentDefinitionId: 'd', agentDefinitionName: agent.address } as never,
        new AgentRunState(agent.agentRunId, { id: agent.agentRunId, messages: [], createdAt: 'x', updatedAt: 'x', agentDefinitionId: 'd', agentName: agent.address })),
    })),
  })
}

describe('AgentRunCollaborationContext.applyStatuses', () => {
  it('the view\'s states are applied through it at construction', () => {
    const context = build()
    expect(['cua-run', 'pp-run', 'pb-run'].map((id) => context.getAgentContext(id)!.state.currentStatus))
      .toEqual([AgentStatus.Idle, AgentStatus.Running, AgentStatus.Offline])
  })

  it('sets each named child\'s status and recoverable block only', () => {
    const context = build()
    const before = context.view
    context.applyStatuses([
      { agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'running', recoverableBlock: null },
      { agentRunId: 'pp-run', memberAddress: '/product_team/prototyper', status: 'error', recoverableBlock: block as never },
    ])
    expect(context.getAgentContext('cua-run')!.state.currentStatus).toBe(AgentStatus.Running)
    expect(context.getAgentContext('pp-run')!.state).toMatchObject({ currentStatus: 'error', recoverableBlock: block })
    expect(context.getAgentContext('pb-run')!.state.currentStatus).toBe(AgentStatus.Offline)
    expect(context.view).toBe(before)
  })

  it('refuses a status that does not name one local child exactly once', () => {
    const context = build()
    expect(() => context.applyStatuses([{ agentRunId: 'unknown', memberAddress: '/x', status: 'idle', recoverableBlock: null }])).toThrow(/no unique exact child identity/)
    expect(() => context.applyStatuses([{ agentRunId: 'cua-run', memberAddress: '/other', status: 'idle', recoverableBlock: null }])).toThrow(/no unique exact child identity/)
    expect(() => context.applyStatuses([
      { agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'idle', recoverableBlock: null },
      { agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'running', recoverableBlock: null },
    ])).toThrow(/no unique exact child identity/)
    expect(context.getAgentContext('cua-run')!.state.currentStatus).toBe(AgentStatus.Idle)
  })
})
