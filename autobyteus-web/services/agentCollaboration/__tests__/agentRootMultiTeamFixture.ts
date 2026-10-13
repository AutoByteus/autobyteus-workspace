import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { AgentRunCollaborationIndex } from '../agentRunCollaborationIndex'
import { createChildContext } from '../agentRunCollaborationChildContextFactory'
import { agentRootView, created, launch } from './agentRootFixture'

export const teamId = (copy: number) => `software-team-${copy}`
export const memberId = (copy: number, member: number) => `${teamId(copy)}-member-${member}`
export const memberNames = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']

/** Seven six-member executions at the same address: one hosted Team and six delegated copies. */
export const multiTeamView = (count = 7, hostRunId = 'host-run') => {
  const view = agentRootView()
  const members = (copy: number) => memberNames.map((name, member) => ({
    address: `/software_engineering_team/${name}`, agentRunId: memberId(copy, member), platformAgentRunId: null,
  }))
  view.execution_tree = {
    subjectKind: 'agent', createdAt: created,
    host: { address: '/project_task_manager', agentRunId: hostRunId, agentDefinitionId: 'manager' },
    collaborators: [{
      kind: 'agent_team', address: '/software_engineering_team', teamDefinitionId: 'software-team', teamRunId: teamId(0),
      coordinatorAddress: '/software_engineering_team/solution_designer',
      members: members(0).map((member, index) => ({ ...member, agentDefinitionId: memberNames[index]! })),
      handoffs: [], defaultLaunchConfiguration: { ...launch, workspaceRootPath: null },
      taskExecutions: [], addedAt: created, addedViaAgentRunId: hostRunId,
    }],
    taskExecutions: Array.from({ length: count - 1 }, (_, index) => ({
      address: '/software_engineering_team', teamRunId: teamId(index + 1),
      delegatorAgentRunId: hostRunId, startedAt: created, members: members(index + 1), taskExecutions: [],
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
