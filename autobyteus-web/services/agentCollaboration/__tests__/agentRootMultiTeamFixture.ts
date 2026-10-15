import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createChildContext } from '../agentRunCollaborationChildContextFactory'
import { agentRootView, created, launch } from './agentRootFixture'

export const teamId = (copy: number) => `software-team-${copy}`
export const memberId = (copy: number, member: number) => `${teamId(copy)}-member-${member}`
export const memberNames = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']

/** Seven six-member executions at the same address: delegated Team copies, the first a converted former hosted Team. */
export const multiTeamView = (count = 7, hostRunId = 'host-run') => {
  const view = agentRootView()
  const members = (copy: number) => memberNames.map((name, member) => ({
    address: `/software_engineering_team/${name}`, agentRunId: memberId(copy, member), platformAgentRunId: null,
  }))
  view.execution_tree = {
    subjectKind: 'agent', createdAt: created,
    host: { address: '/project_task_manager', agentRunId: hostRunId, agentDefinitionId: 'manager' },
    taskExecutions: Array.from({ length: count }, (_, index) => ({
      address: '/software_engineering_team', teamRunId: teamId(index),
      delegatorAgentRunId: hostRunId, startedAt: created, members: members(index), taskExecutions: [],
      // Copy 0 is the former hosted Team: a converted run that records its catalog source.
      ...(index === 0 ? { source: { kind: 'agent_team' as const, teamDefinitionId: 'software-team', coordinatorAddress: '/software_engineering_team/solution_designer', handoffs: [],
        members: memberNames.map(name => ({ address: `/software_engineering_team/${name}`, agentDefinitionId: name })),
        defaultLaunchConfiguration: { ...launch, workspaceRootPath: null } } } : {}),
    })),
  }
  view.communication_messages = { schemaVersion: 1, subjectKind: 'agent', hostRunId, messages: [] }
  view.agent_statuses = []
  return view
}

export const buildMultiTeamContext = (view = multiTeamView()) => new AgentRunCollaborationContext({
  hostRunId: view.execution_tree.host.agentRunId, view,
  entries: [...new AgentRunCollaborationIndex(view.execution_tree).agents.values()].map(child => ({
    agentRunId: child.agentRunId, memberAddress: child.address,
    context: createChildContext(child, view.execution_tree.createdAt, null),
  })),
})
