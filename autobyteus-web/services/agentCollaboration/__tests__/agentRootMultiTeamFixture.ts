import { AgentRunCollaborationContext } from '../agentRunCollaborationContext'
import { agentRootView, created } from './agentRootFixture'

export const teamId = (copy: number) => `software-team-${copy}`
export const memberId = (copy: number, member: number) => `${teamId(copy)}-member-${member}`
export const memberNames = ['solution_designer', 'architecture_reviewer', 'implementation_engineer', 'code_reviewer', 'api_e2e_engineer', 'delivery_engineer']

/**
 * The view of a manager run that delegated seven Team copies (autobyteus-461 SR-084): its host only; its tree is
 * `multiTeamTree` (`test-support/runTreeFixtures`).
 */
export const multiTeamView = (_count = 7, hostRunId = 'host-run') => {
  const view = agentRootView()
  view.execution_tree = { subjectKind: 'agent', createdAt: created,
    host: { address: '/project_task_manager', agentRunId: hostRunId, agentDefinitionId: 'manager' } }
  return view
}

export const buildMultiTeamContext = (view = multiTeamView()) =>
  new AgentRunCollaborationContext({ hostRunId: view.execution_tree.host.agentRunId, view })
