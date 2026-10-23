import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { AgentContext } from '~/types/agent/AgentContext'
import { AgentRunState } from '~/types/agent/AgentRunState'
import { AgentStatus } from '~/types/agent/AgentStatus'
import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createRemoteChildContext } from '../agentRunCollaborationChildContextFactory'
import { useRemoteRunsStore } from '~/stores/remoteRunsStore'

const dispatched = vi.hoisted(() => [] as unknown[])
vi.mock('~/services/agentStreaming/agentStreamMessageProjector', () => ({
  dispatchAgentStreamMessage: (message: unknown, target: unknown) => dispatched.push({ message, target }),
}))

import { agentRootView, created } from './agentRootFixture'

/** autobyteus-278: a standalone root's remote children are rows, contexts and presentation targets like its copies. */

const remoteTeam = {
  kind: 'agent_team' as const, address: '/marketing_team', team_run_id: 'marketing-run', node_id: 'srv_docker', node_name: 'docker',
  coordinator_address: '/marketing_team/campaign_lead',
  members: [{ address: '/marketing_team/campaign_lead', agent_run_id: 'lead-run' }, { address: '/marketing_team/writer', agent_run_id: 'writer-run' }],
  delegator_agent_run_id: 'host-run', started_at: '2026-09-29T00:00:00.000Z',
}
const remoteAgent = {
  kind: 'agent' as const, address: '/market_researcher', agent_run_id: 'researcher-run', node_id: 'srv_docker', node_name: 'docker',
  delegator_agent_run_id: 'host-run', started_at: '2026-10-01T00:00:00.000Z',
}

const localContext = (agentRunId: string, address: string) => {
  const state = new AgentRunState(agentRunId, { id: agentRunId, messages: [], createdAt: created, updatedAt: created, agentDefinitionId: 'x', agentName: address })
  return new AgentContext({ agentDefinitionId: 'x', agentDefinitionName: address, llmModelIdentifier: 'm', runtimeKind: 'codex_app_server',
    workspaceId: null, workspaceMetadata: null, autoExecuteTools: false, llmConfig: null, isLocked: true } as never, state)
}

const build = () => {
  const view = agentRootView()
  view.remote_task_executions = [remoteTeam, remoteAgent]
  const index = new AgentRunCollaborationIndex(view.execution_tree, view.remote_task_executions)
  return new AgentRunCollaborationContext({ hostRunId: 'host-run', view, entries: [
    ...[...index.agents.values()].map((agent) => ({ agentRunId: agent.agentRunId, memberAddress: agent.address, context: localContext(agent.agentRunId, agent.address) })),
    ...[...index.remoteAgents.values()].map((agent) => ({ agentRunId: agent.agentRunId, memberAddress: agent.address, context: createRemoteChildContext(agent, agent.execution.started_at) })),
  ] })
}

describe('AgentRunCollaborationContext with remote children', () => {
  beforeEach(() => { setActivePinia(createPinia()); dispatched.length = 0 })

  it('lists remote runs among the local copies in delegation order, with their node, a Team with its members', () => {
    const context = build()
    const rows = context.listTaskRows((teamRunId) => teamRunId === 'marketing-run').map(({ row }) => [row.rowKey, row.depth, row.remote?.nodeName ?? null])
    expect(rows).toEqual([
      ['team:marketing-run', 0, 'docker'], ['agent:lead-run', 1, 'docker'], ['agent:writer-run', 1, 'docker'],
      ['agent:cua-run', 0, null], ['team:team-run', 0, null],
      ['agent:researcher-run', 0, 'docker'],
    ])
    expect(context.index.coordinatorRunIdOf('marketing-run')).toBe('lead-run')
    expect(context.isListed('writer-run')).toBe(true)
    expect(context.getRemoteChild('researcher-run')).toMatchObject({ kind: 'remote_agent', delegatorAgentRunId: 'host-run' })
  })

  it("applies a node's summary to its agents' statuses and the window's registry; an agent it does not list is offline", () => {
    const context = build()
    const remoteRuns = useRemoteRunsStore()
    context.remoteExecutions.forEach((execution) => remoteRuns.register(execution, () => true))
    expect(context.applyEvent(5, { kind: 'remote_task_execution_summary', node_id: 'srv_docker', run_id: 'marketing-run', reachable: true,
      title: 'Plan the October campaign', statuses: [{ agent_run_id: 'lead-run', status: 'running' }] })).toBe('applied')
    expect(context.getAgentContext('lead-run')?.state.currentStatus).toBe(AgentStatus.Running)
    expect(context.getAgentContext('writer-run')?.state.currentStatus).toBe(AgentStatus.Offline)
    expect(remoteRuns.runOfAgentRun('writer-run')).toMatchObject({ nodeName: 'docker', reachable: true, title: 'Plan the October campaign' })
    expect(context.applyEvent(6, { kind: 'remote_task_execution_summary', node_id: 'srv_docker', run_id: 'marketing-run', reachable: false,
      title: null, statuses: [] })).toBe('applied')
    expect(context.getAgentContext('lead-run')?.state.currentStatus).toBe(AgentStatus.Offline)
    expect(remoteRuns.run('marketing-run')).toMatchObject({ reachable: false, title: 'Plan the October campaign' })
  })

  it("presents a remote child's output to its own context; a new remote run reloads the view, a known one does not", () => {
    const context = build()
    const message = { type: 'AGENT_STATUS', payload: { status: 'running', trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null } }
    context.applyEvent(5, { kind: 'agent_presentation', member_address: '/marketing_team/writer', agent_run_id: 'writer-run', message } as never)
    expect(dispatched).toHaveLength(1)
    expect((dispatched[0] as { target: { agentRunId: string } }).target.agentRunId).toBe('writer-run')
    expect(context.applyEvent(6, { kind: 'remote_task_execution_started', execution: remoteAgent })).toBe('applied')
    expect(context.applyEvent(7, { kind: 'remote_task_execution_started', execution: { ...remoteAgent, agent_run_id: 'new-run' } })).toBe('checkpoint_required')
    expect(() => context.applyEvent(8, { kind: 'agent_presentation', member_address: '/elsewhere', agent_run_id: 'writer-run', message } as never)).toThrow()
  })
})
