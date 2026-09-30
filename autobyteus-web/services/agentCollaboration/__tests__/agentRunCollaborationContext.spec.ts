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
    expect(context.messagesView('cua-run').listMessages()).toMatchObject([{ direction: 'sent', counterpart: { label: 'research assistant', kind: 'configured' } }])
    expect(host.referenceContentPath('m1', 'r1')).toBe('agent-collaborations/host-run/communication/messages/m1/references/r1/content')
  })

  it('applies sequenced events: collaborator added, messages, and a reload for a new child', () => {
    const context = build()
    expect(context.applyEvent(5, { kind: 'collaborator_added', collaborator: {
      kind: 'agent', address: '/code_reviewer', agentDefinitionId: 'code-reviewer', launchConfiguration: launch, addedAt: created, addedViaAgentRunId: 'host-run',
    } })).toBe('applied')
    expect(invalidate).toHaveBeenCalledWith('agent', 'host-run')
    expect(context.view.execution_tree.collaborators).toHaveLength(3)
    expect(context.applyEvent(6, { kind: 'communication', message: {
      messageId: 'm2', senderAgentRunId: 'host-run', receiverAgentRunId: 'pp-run', content: 'thanks', messageType: 'direct_message', referenceFiles: [], createdAt: created,
    } })).toBe('applied')
    expect(context.view.communication_messages.messages).toHaveLength(2)
    expect(context.applyEvent(7, { kind: 'task_execution_started', host_kind: 'root', host_run_id: 'host-run', execution: {
      address: '/code_reviewer', agentRunId: 'cr-run', platformAgentRunId: null, delegatorAgentRunId: 'host-run', startedAt: created,
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
