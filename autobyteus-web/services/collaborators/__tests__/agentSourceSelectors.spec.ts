import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto, TeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState'
import { createTeamAgentContext, createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { collaboratorAgentSourceAt, collaboratorTeamSourceAt, teamAgentSourceAt } from '../agentSourceSelectors'

const created = '2026-09-30T00:00:00.000Z'
const launch = { runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'root-model', llm_config: null, auto_execute_tools: false, workspace_root_path: null }

const teamTree = (): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'review-team', team_definition_name: 'Product Review Team', team_run_id: 'team-run',
    coordinator_address: '/researcher', default_launch_configuration: launch,
    members: [{
      kind: 'configured_agent', address: '/researcher', agent_definition_id: 'researcher', role: null, description: null,
      agent_run_id: 'researcher-run', platform_agent_run_id: null, launch_configuration: launch,
    }],
    collaborators: [],
    task_executions: [],
  },
})

const reviewerEntry = {
  kind: 'agent' as const, address: '/code_reviewer', agent_definition_id: 'code-reviewer', launch_configuration: launch,
  added_at: created, added_via_agent_run_id: 'researcher-run',
}
const productTeamEntry = {
  kind: 'agent_team' as const, address: '/product_team', team_definition_id: 'product-team', coordinator_address: '/product_team/prototyper',
  members: [
    { address: '/product_team/prototyper', agent_definition_id: 'prototyper' },
    { address: '/product_team/bootstrapper', agent_definition_id: 'bootstrapper' },
  ],
  handoffs: [], default_launch_configuration: launch, added_at: created, added_via_agent_run_id: 'researcher-run',
}

describe('collaborator-aware sources', () => {
  it('resolves configured placements first, then collaborator Agents and collaborator Team members', () => {
    const tree = teamTree()
    tree.root_team.collaborators = [reviewerEntry, productTeamEntry]
    expect(teamAgentSourceAt(tree, '/researcher')?.agent_definition_id).toBe('researcher')
    expect(teamAgentSourceAt(tree, '/code_reviewer')).toMatchObject({ agent_definition_id: 'code-reviewer', launch_configuration: launch })
    expect(teamAgentSourceAt(tree, '/product_team/bootstrapper')?.agent_definition_id).toBe('bootstrapper')
    expect(teamAgentSourceAt(tree, '/product_team')).toBeNull()
    expect(teamAgentSourceAt(tree, '/code_reviewer/x')).toBeNull()
  })

  it('a Team view accepts COLLABORATOR_ADDED and then a task execution at the collaborator address', () => {
    const tree = teamTree()
    const researcher = createTeamAgentContext({ tree, agentRunId: 'researcher-run', address: parseAgentTeamAddress('/researcher'), workspaceMetadata: null })!
    const state = createTeamExecutionViewState({
      rootTeamRunId: 'team-run', rootActive: true, executionTree: tree, messages: [],
      configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: new Map() }),
      initialFocusedAgentRunId: 'researcher-run',
      agentContexts: [{ agentRunId: 'researcher-run', memberAddress: parseAgentTeamAddress('/researcher'), agentContext: researcher }],
      createAgentContext: (agentRunId, address, nextTree) => createTeamAgentContext({ tree: nextTree, agentRunId, address, workspaceMetadata: null }),
    })
    const added = state.applyMessage({ type: 'COLLABORATOR_ADDED', payload: { change_sequence: 1, collaborator: reviewerEntry } } as TeamStreamServerMessage as never)
    expect(added).toMatchObject({ disposition: 'applied', effects: [{ kind: 'collaborators_changed' }] })
    expect(state.getExecutionTree().root_team.collaborators).toHaveLength(1)
    const started = state.applyMessage({ type: 'TASK_EXECUTION_STARTED', payload: { change_sequence: 2, parent_team_run_id: 'team-run', execution: {
      kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'reviewer-run', platform_agent_run_id: null,
      delegator_agent_run_id: 'researcher-run', started_at: created,
    } } } as never)
    expect(started.disposition).toBe('applied')
    expect(state.getAgentContext('reviewer-run')?.config.agentDefinitionId).toBe('code-reviewer')
    expect(state.applyMessage({ type: 'COLLABORATOR_ADDED', payload: { change_sequence: 3, collaborator: reviewerEntry } } as never).disposition).toBe('rejected')
  })

  it('an Org view index resolves task executions at collaborator addresses', () => {
    const view = JSON.parse(JSON.stringify(taskBearingView())) as AgentOrgExecutionViewDto & { execution_tree: { rootOrg: any } }
    const orgLaunch = view.execution_tree.rootOrg.defaultLaunchConfiguration
    view.execution_tree.rootOrg.collaborators = [
      { kind: 'agent', address: '/code_reviewer', agentDefinitionId: 'code-reviewer', launchConfiguration: orgLaunch, addedAt: created, addedViaAgentRunId: 'agent-director' },
      { kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper',
        members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper' }], handoffs: [],
        defaultLaunchConfiguration: orgLaunch, addedAt: created, addedViaAgentRunId: 'agent-director' },
    ]
    view.execution_tree.rootOrg.taskExecutions.push(
      { address: '/code_reviewer', agentRunId: 'reviewer-run', platformAgentRunId: null, delegatorAgentRunId: 'agent-director', startedAt: created },
      { address: '/product_team', teamRunId: 'product-run', delegatorAgentRunId: 'agent-director', startedAt: created, taskExecutions: [],
        members: [{ address: '/product_team/prototyper', agentRunId: 'prototyper-run', platformAgentRunId: null }] },
    )
    view.agent_statuses.push(
      { agent_run_id: 'reviewer-run', member_address: '/code_reviewer', status: 'offline' },
      { agent_run_id: 'prototyper-run', member_address: '/product_team/prototyper', status: 'offline' },
    )
    const index = new AgentOrgExecutionViewIndex(view)
    expect(index.requireAgent('reviewer-run')).toMatchObject({ kind: 'task', source: { agentDefinitionId: 'code-reviewer' } })
    expect(index.requireAgent('prototyper-run')).toMatchObject({ kind: 'task_team_member', source: { agentDefinitionId: 'prototyper' } })
    expect(index.coordinator('product-run').agentRunId).toBe('prototyper-run')
    expect(collaboratorAgentSourceAt(view.execution_tree.rootOrg.collaborators, '/product_team')).toBeNull()
    expect(collaboratorTeamSourceAt(view.execution_tree.rootOrg.collaborators, '/product_team')?.coordinatorAddress).toBe('/product_team/prototyper')
  })
})
