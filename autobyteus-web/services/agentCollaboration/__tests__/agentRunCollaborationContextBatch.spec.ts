import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'

vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate: vi.fn() } }))

import { agentRootView, created } from './agentRootFixture'

const childContext = (agentRunId: string, address: string) => {
  const state = new AgentRunState(agentRunId, { id: agentRunId, messages: [], createdAt: created, updatedAt: created, agentDefinitionId: 'x', agentName: address })
  state.currentStatus = AgentStatus.Running
  return new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: address, llmModelIdentifier: 'root-model', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, llmConfig: null, isLocked: true } as never, state)
}
const build = () => {
  const view = agentRootView()
  return new AgentRunCollaborationContext({
    hostRunId: 'host-run', view,
    entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => ({
      agentRunId: agent.agentRunId, memberAddress: agent.address, context: childContext(agent.agentRunId, agent.address),
    })),
  })
}
const segment = { segment_id: 'segment-1', turn_id: 'turn-1', segment_type: 'text' as const }
const start = (agentRunId: string, address: string) => ({ kind: 'agent_presentation' as const, agent_run_id: agentRunId, member_address: address,
  message: { type: 'SEGMENT_START' as const, payload: { ...segment, metadata: null } } })
const item = (agentRunId: string, address: string, delta: string) => ({ agent_run_id: agentRunId, member_address: address,
  message: { type: 'SEGMENT_CONTENT' as const, payload: { ...segment, delta } } })
const text = (context: AgentContext): string => context.conversation.messages
  .flatMap((message) => ('segments' in message ? message.segments : []) as { content?: string }[])
  .map((part) => part.content ?? '').join('|')

describe('AgentRunCollaborationContext content batches (autobyteus-139)', () => {
  beforeEach(() => { setActivePinia(createPinia()) })

  it('applies a batch at the next sequence, per agent in item order, and continues after its range', () => {
    const context = build()
    expect(context.applyEvent(5, start('cua-run', '/computer_use_agent'))).toBe('applied')
    expect(context.applyEvent(6, start('pp-run', '/product_team/prototyper'))).toBe('applied')
    expect(context.applyEvent(7, { kind: 'agent_presentation_batch', items: [
      item('cua-run', '/computer_use_agent', 'xy'), item('pp-run', '/product_team/prototyper', '12'),
    ] }, 12)).toBe('applied')
    expect(context.changeSequence).toBe(12)
    expect(text(context.getAgentContext('cua-run')!)).toBe('xy')
    expect(text(context.getAgentContext('pp-run')!)).toBe('12')
    expect(context.applyEvent(13, { kind: 'agent_presentation_batch', items: [item('cua-run', '/computer_use_agent', 'z')] }, 13)).toBe('applied')
    expect(text(context.getAgentContext('cua-run')!)).toBe('xyz')
  })

  it('rejects a batch that does not start at the next sequence', () => {
    const context = build()
    expect(() => context.applyEvent(6, { kind: 'agent_presentation_batch', items: [item('cua-run', '/computer_use_agent', 'x')] }, 9))
      .toThrow('change sequence gap')
    expect(context.phase).toBe('reopen_required')
  })

  it('rejects a batch with an unknown identity before applying any of its items', () => {
    const context = build()
    context.applyEvent(5, start('cua-run', '/computer_use_agent'))
    const before = text(context.getAgentContext('cua-run')!)
    expect(() => context.applyEvent(6, { kind: 'agent_presentation_batch', items: [
      item('cua-run', '/computer_use_agent', 'x'), item('stranger-run', '/stranger', 'y'),
    ] }, 7)).toThrow('not a child of this run')
    expect(text(context.getAgentContext('cua-run')!)).toBe(before)
  })
})
