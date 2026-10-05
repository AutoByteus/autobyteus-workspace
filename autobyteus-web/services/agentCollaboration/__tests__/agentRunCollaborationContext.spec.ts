import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'

const invalidate = vi.hoisted(() => vi.fn())
vi.mock('~/services/collaborators/collaboratorCandidatesService', () => ({ collaboratorCandidatesService: { invalidate } }))

import { agentRootView, created, launch } from './agentRootFixture'

const childContext = (agentRunId: string, address: string) => {
  const state = new AgentRunState(agentRunId, { id: agentRunId, messages: [], createdAt: created, updatedAt: created, agentDefinitionId: 'x', agentName: address })
  state.currentStatus = AgentStatus.Offline
  return new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: address, llmModelIdentifier: 'root-model', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, llmConfig: null, isLocked: true } as never, state)
}

const build = (view = agentRootView()) => new AgentRunCollaborationContext({
  hostRunId: 'host-run', view,
  entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map((agent) => ({
    agentRunId: agent.agentRunId, memberAddress: agent.address, context: childContext(agent.agentRunId, agent.address),
  })),
})

describe('AgentRunCollaborationContext', () => {
  beforeEach(() => { setActivePinia(createPinia()); invalidate.mockClear() })

  it('indexes children with collaborator sources; the host is the delegator, not a child', () => {
    const context = build()
    expect(context.index.requireAgent('cua-run')).toMatchObject({ kind: 'task_agent', source: { agentDefinitionId: 'computer-use' }, delegatorAgentRunId: 'host-run' })
    expect(context.index.requireAgent('pb-run')).toMatchObject({ kind: 'task_team_member', teamRunId: 'team-run', source: { agentDefinitionId: 'bootstrapper' } })
    expect(context.index.coordinatorOf('team-run').agentRunId).toBe('pp-run')
    expect(context.getChild('host-run')).toBeNull()
    expect(context.getAgentContext('pp-run')?.state.currentStatus).toBe('running')
  })

  it('lists task rows under the run with Team members only when the Team is open', () => {
    const context = build()
    const closed = context.listTaskRows(() => false)
    expect(closed.map((entry) => [entry.row.transientKind, entry.row.displayName, entry.row.depth])).toEqual([
      ['task_agent', 'computer use agent', 0], ['task_team', 'product team', 0],
    ])
    expect(closed[0]!.row).toMatchObject({ delegatedBy: 'research assistant', currentStatus: 'idle' })
    const open = context.listTaskRows((teamRunId) => teamRunId === 'team-run')
    expect(open.map((entry) => entry.row.displayName)).toEqual(['computer use agent', 'product team', 'prototyper', 'bootstrapper'])
    expect(open[2]!).toMatchObject({ hasFollowingSibling: true, continuingAncestorDepths: [] })
    expect(open[3]!).toMatchObject({ hasFollowingSibling: false })
  })

  it('gives the host and each child a Team-tab perspective with named counterparts', () => {
    const context = build()
    const host = context.messagesView('host-run')
    expect(host).toMatchObject({ rootKind: 'agent', rootRunId: 'host-run', focusedMemberAddress: '/research_assistant' })
    expect(host.listMessages()).toMatchObject([{ direction: 'received', counterpart: { label: 'computer use agent', kind: 'delegated' } }])
    // REQ-008: the run's own agent reads as its name (VIS-013); the collaborator keeps the lowercase row label above.
    expect(context.messagesView('cua-run').listMessages()).toMatchObject([{ direction: 'sent', counterpart: { label: 'Research Assistant', kind: 'configured' } }])
    expect(host.referenceContentPath('m1', 'r1')).toBe('agent-collaborations/host-run/communication/messages/m1/references/r1/content')
  })

  it('applies sequenced events: a collaborator added in place (Offline), messages, and a reload for an extra copy', () => {
    const context = build()
    expect(context.applyEvent(5, { kind: 'collaborator_added', collaborator: {
      kind: 'agent', address: '/code_reviewer', agentDefinitionId: 'code-reviewer', agentRunId: 'cr-run', platformAgentRunId: null,
      launchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run',
    } })).toBe('applied')
    expect(invalidate).toHaveBeenCalledWith('agent', 'host-run')
    expect(context.view.execution_tree.collaborators).toHaveLength(3)
    // The new instance has its context at once, Offline, and a row under the run.
    expect(context.getAgentContext('cr-run')?.state.currentStatus).toBe('offline')
    expect(context.listTaskRows(() => false).map((entry) => entry.row.displayName)).toContain('code reviewer')
    expect(context.applyEvent(6, { kind: 'communication', message: {
      messageId: 'm2', senderAgentRunId: 'host-run', receiverAgentRunId: 'pp-run', content: 'thanks', messageType: 'direct_message', referenceFiles: [], createdAt: created,
    } })).toBe('applied')
    expect(context.view.communication_messages.messages).toHaveLength(2)
    expect(context.applyEvent(7, { kind: 'task_execution_started', host_kind: 'root', host_run_id: 'host-run', execution: {
      address: '/code_reviewer', agentRunId: 'cr-copy-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created,
    } })).toBe('checkpoint_required')
    expect(() => context.applyEvent(9, { kind: 'communication', message: {
      messageId: 'm3', senderAgentRunId: 'host-run', receiverAgentRunId: 'pp-run', content: 'gap', messageType: 'direct_message', referenceFiles: [], createdAt: created,
    } })).toThrow('change sequence gap')
    expect(context.phase).toBe('reopen_required')
  })

  it('rejects a message from an AgentRun outside the run and goes historical on stop', () => {
    const view = agentRootView()
    view.communication_messages.messages[0] = { ...view.communication_messages.messages[0]!, senderAgentRunId: 'stranger' }
    expect(() => build(view)).toThrow('identity mismatch')
    const context = build()
    context.setActive(false)
    expect(context.phase).toBe('historical')
    expect(context.getAgentContext('pp-run')?.state.currentStatus).toBe(AgentStatus.Offline)
    expect(parseAgentTeamAddress(context.index.hostAddress)).toBe('/research_assistant')
  })
})

const recovery = { operationId: 'native-op', failureEpoch: 1,
  position: { kind: 'held_turn' as const, turnId: 'A' }, state: 'awaiting_user' as const, code: 'failed', message: 'Retry on user input' }
const inputState = (revision = 3) => ({ run_instance_id: 'runtime-1', revision, recoverableBlock: recovery,
  entries: ['A', 'B'].map((text, index) => ({ sequence: index + 1, message_id: text, dedupe_key: `input:${text}`, turn_id: index ? null : 'A',
    state: index ? 'queued' as const : 'held' as const, content: text, sender_type: 'user' as const, file_attachments: [] })) })

it('hydrates hosted Agent and Team held/queued identities and applies same-instance live revisions without resending', () => {
  const view = agentRootView()
  view.agent_input_states = ['cua-run', 'pp-run'].map(id => ({ agent_run_id: id, state: inputState() }))
  view.agent_statuses[0]!.status = 'error'; view.agent_statuses[0]!.recoverableBlock = recovery
  const root = build(view)
  for (const id of ['cua-run', 'pp-run']) {
    const ctx = root.getAgentContext(id)!
    expect(ctx.state.inputProjection).toEqual({ runInstanceId: 'runtime-1', revision: 3 })
    expect(ctx.state.recoverableBlock).toEqual(recovery)
    expect(ctx.state.currentStatus).toBe('error')
    expect(ctx.conversation.messages).toMatchObject([
      { type: 'user', messageId: 'A', pendingInput: { state: 'held' } },
      { type: 'user', messageId: 'B', pendingInput: { state: 'queued' } },
    ])
  }
  const ctx = root.getAgentContext('cua-run')!
  expect(root.applyEvent(5, { kind: 'agent_presentation', agent_run_id: 'cua-run', member_address: '/computer_use_agent',
    message: { type: 'AGENT_INPUT_STATE', payload: inputState(2) } } as any)).toBe('applied')
  expect(ctx.state.inputProjection?.revision).toBe(3)
  const fresh = inputState(4); fresh.entries = [fresh.entries[1]!]
  root.applyEvent(6, { kind: 'agent_presentation', agent_run_id: 'cua-run', member_address: '/computer_use_agent',
    message: { type: 'AGENT_INPUT_STATE', payload: fresh } } as any)
  expect(ctx.conversation.messages).toHaveLength(2)
  expect(ctx.conversation.messages[0]).not.toHaveProperty('pendingInput')
  expect(ctx.state.inputProjection?.revision).toBe(4)
})

it('post-response recovery projects no held A and cold dormant contexts invent no input projection', () => {
  const view = agentRootView()
  view.agent_statuses[0]!.status = 'error'
  view.agent_statuses[0]!.recoverableBlock = { ...recovery, position: { kind: 'next_turn', failedTurnId: 'consumed-A' } }
  view.agent_input_states = [{ agent_run_id: 'cua-run', state: { ...inputState(), entries: [],
    recoverableBlock: view.agent_statuses[0]!.recoverableBlock } }]
  const live = build(view).getAgentContext('cua-run')!
  expect(live.conversation.messages).toEqual([]); expect(live.state.recoverableBlock?.position.kind).toBe('next_turn')
  const cold = agentRootView(); cold.is_active = false; cold.agent_statuses.forEach(s => { s.status = 'offline' })
  const saved = build(cold).getAgentContext('cua-run')!
  expect(saved.state.inputProjection).toBeNull(); expect(saved.state.recoverableBlock).toBeNull()
})

it.each(['host-input', 'unknown-input', 'duplicate-input', 'duplicate-status', 'wrong-address'])(
  'rejects %s rather than applying a partial snapshot', kind => {
    const view = agentRootView()
    const value = { agent_run_id: 'cua-run', state: inputState() }
    view.agent_input_states = [value]
    if (kind === 'host-input') value.agent_run_id = 'host-run'
    if (kind === 'unknown-input') value.agent_run_id = 'unknown'
    if (kind === 'duplicate-input') view.agent_input_states.push(value)
    if (kind === 'duplicate-status') view.agent_statuses.push(view.agent_statuses[0]!)
    if (kind === 'wrong-address') view.agent_statuses[0]!.member_address = '/wrong'
    expect(() => build(view)).toThrow(/identity/)
  },
)
