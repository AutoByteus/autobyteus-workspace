import { describe, expect, it, vi } from 'vitest'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '~/services/agentCollaboration/agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '~/services/agentCollaboration/agentRunCollaborationIndex'
import { agentRootView } from './agentRootFixture'

// autobyteus-426 D-09: one status shape for the view and the history poll's status read.

const query = vi.hoisted(() => vi.fn())
vi.mock('~/utils/apolloClient', () => ({ getApolloClient: () => ({ query }) }))

import { readAgentRunCollaborationStatuses } from '~/services/agentCollaboration/agentRunCollaborationHydration'

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

describe('readAgentRunCollaborationStatuses', () => {
  it('asks once for the runs, uncached, and maps each answer into the client status shape, with its closed-set digest', async () => {
    query.mockResolvedValueOnce({ data: { agentRunCollaborationStatuses: [
      { runId: 'host-run', isActive: true, closedTaskExecutionsDigest: '1:bb7f09af', statuses: [
        { agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'idle', recoverableBlock: null },
        { agentRunId: 'pp-run', memberAddress: '/product_team/prototyper', status: 'error', recoverableBlock: block },
      ] },
      { runId: 'stopped-run', isActive: false, closedTaskExecutionsDigest: null, statuses: [] },
    ] } })

    await expect(readAgentRunCollaborationStatuses(['host-run', 'stopped-run'])).resolves.toEqual([
      { runId: 'host-run', isActive: true, closedTaskExecutionsDigest: '1:bb7f09af', statuses: [
        { agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'idle', recoverableBlock: null },
        { agentRunId: 'pp-run', memberAddress: '/product_team/prototyper', status: 'error', recoverableBlock: block },
      ] },
      { runId: 'stopped-run', isActive: false, closedTaskExecutionsDigest: null, statuses: [] },
    ])
    expect(query).toHaveBeenCalledWith(expect.objectContaining({ variables: { runIds: ['host-run', 'stopped-run'] }, fetchPolicy: 'network-only' }))
  })

  it('throws on GraphQL errors and on a malformed recoverable block', async () => {
    query.mockResolvedValueOnce({ data: null, errors: [{ message: 'At most 100 runs per status read.' }] })
    await expect(readAgentRunCollaborationStatuses(['x'])).rejects.toThrow('At most 100 runs per status read.')
    query.mockResolvedValueOnce({ data: { agentRunCollaborationStatuses: [
      { runId: 'host-run', isActive: true, statuses: [{ agentRunId: 'cua-run', memberAddress: '/computer_use_agent', status: 'idle', recoverableBlock: { bad: true } }] },
    ] } })
    await expect(readAgentRunCollaborationStatuses(['host-run'])).rejects.toThrow()
  })
})
