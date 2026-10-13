import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto, TeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState'
import { createTeamAgentContext, createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { catalogAgentSourceAt, catalogTeamSourceAt, collaborationInstanceSource, collaboratorAgentSourceAt, collaboratorTeamSourceAt, teamAgentSourceAt } from '../agentSourceSelectors'

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
  kind: 'agent' as const, address: '/code_reviewer', agent_definition_id: 'code-reviewer',
  agent_run_id: 'reviewer-run', platform_agent_run_id: null, launch_configuration: launch,
  added_at: created, added_via_agent_run_id: 'researcher-run',
}
const productTeamEntry = {
  kind: 'agent_team' as const, address: '/product_team', team_definition_id: 'product-team', team_run_id: 'product-run',
  coordinator_address: '/product_team/prototyper',
  members: [
    { address: '/product_team/prototyper', agent_definition_id: 'prototyper', agent_run_id: 'prototyper-run', platform_agent_run_id: null },
    { address: '/product_team/bootstrapper', agent_definition_id: 'bootstrapper', agent_run_id: 'bootstrapper-run', platform_agent_run_id: null },
  ],
  handoffs: [], default_launch_configuration: launch, task_executions: [], added_at: created, added_via_agent_run_id: 'researcher-run',
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

  it('a Team view hosts a collaborator on COLLABORATOR_ADDED: Offline contexts, task-style rows, and its own delegations', () => {
    const tree = teamTree()
    const researcher = createTeamAgentContext({ tree, agentRunId: 'researcher-run', address: parseAgentTeamAddress('/researcher'), workspaceMetadata: null })!
    const state = createTeamExecutionViewState({
      rootTeamRunId: 'team-run', rootActive: true, executionTree: tree, closedTaskExecutions: [], messages: [],
      configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: new Map() }),
      initialFocusedAgentRunId: 'researcher-run',
      agentContexts: [{ agentRunId: 'researcher-run', memberAddress: parseAgentTeamAddress('/researcher'), agentContext: researcher }],
      createAgentContext: (agentRunId, address, nextTree) => createTeamAgentContext({ tree: nextTree, agentRunId, address, workspaceMetadata: null }),
    })
    const added = state.applyMessage({ type: 'COLLABORATOR_ADDED', payload: { change_sequence: 1, collaborator: productTeamEntry } } as TeamStreamServerMessage as never)
    expect(added).toMatchObject({ disposition: 'applied' })
    expect(added.effects.map((effect) => effect.kind)).toEqual(['invalidate_team_member_projection', 'reconcile_team_navigation', 'collaborators_changed'])
    // Each member of the collaborator Team is one Offline context, placed in its TeamRun.
    expect(state.getAgentContext('prototyper-run')?.config.agentDefinitionId).toBe('prototyper')
    expect(state.getAgentContext('bootstrapper-run')?.state.currentStatus).toBe('offline')
    expect(state.getAgentExecutionLocation('bootstrapper-run')?.containingTeamRunId).toBe('product-run')
    // Task-style rows with spaced names (F-03); the Team opens once when it appears (F-02).
    const rows = state.listNavigationRows()
    expect(rows.find((row) => row.key === 'team:product-run')).toMatchObject({ kind: 'task_team', displayName: 'product team', opensOnAppear: true, delegatedBy: 'researcher' })
    expect(rows.find((row) => row.agentRunId === 'prototyper-run')).toMatchObject({ kind: 'task_team_agent', displayName: 'prototyper', coordinator: true })
    expect(state.applyMessage({ type: 'COLLABORATOR_ADDED', payload: { change_sequence: 2, collaborator: reviewerEntry } } as never).disposition).toBe('applied')
    expect(state.listNavigationRows().find((row) => row.agentRunId === 'reviewer-run')).toMatchObject({ kind: 'task_agent', displayName: 'code reviewer' })
    // A collaborator Team member's delegation is hosted by the collaborator TeamRun.
    const started = state.applyMessage({ type: 'TASK_EXECUTION_STARTED', payload: { change_sequence: 3, parent_team_run_id: 'product-run', execution: {
      kind: 'task_agent', address: '/product_team/bootstrapper', agent_run_id: 'bootstrapper-copy-run', platform_agent_run_id: null,
      delegator_agent_run_id: 'prototyper-run', started_at: created,
    } } } as never)
    expect(started.disposition).toBe('applied')
    const team = state.getExecutionTree().root_team.collaborators.find((entry) => entry.address === '/product_team')!
    expect(team.kind === 'agent_team' && team.task_executions.map((task) => task.address)).toEqual(['/product_team/bootstrapper'])
    expect(state.getAgentExecutionLocation('bootstrapper-copy-run')?.containingTeamRunId).toBe('product-run')
    expect(state.applyMessage({ type: 'COLLABORATOR_ADDED', payload: { change_sequence: 4, collaborator: reviewerEntry } } as never).disposition).toBe('rejected')
  })

  it('an Org view index resolves task executions at collaborator addresses', () => {
    const view = JSON.parse(JSON.stringify(taskBearingView())) as AgentOrgExecutionViewDto & { execution_tree: { rootOrg: any } }
    const orgLaunch = view.execution_tree.rootOrg.defaultLaunchConfiguration
    view.execution_tree.rootOrg.collaborators = [
      { kind: 'agent', address: '/code_reviewer', agentDefinitionId: 'code-reviewer', agentRunId: 'reviewer-run', platformAgentRunId: null,
        launchConfiguration: orgLaunch, addedAt: created, addedViaAgentRunId: 'agent-director' },
      { kind: 'agent_team', address: '/product_team', teamDefinitionId: 'product-team', teamRunId: 'product-run', coordinatorAddress: '/product_team/prototyper',
        members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper', agentRunId: 'prototyper-run', platformAgentRunId: null }], handoffs: [],
        defaultLaunchConfiguration: orgLaunch, taskExecutions: [], addedAt: created, addedViaAgentRunId: 'agent-director' },
    ]
    // An extra copy of the collaborator Agent (delegate_task at its address).
    view.execution_tree.rootOrg.taskExecutions.push(
      { address: '/code_reviewer', agentRunId: 'reviewer-copy-run', platformAgentRunId: null, delegatorAgentRunId: 'agent-director', startedAt: created },
    )
    view.agent_statuses.push(
      { agent_run_id: 'reviewer-run', member_address: '/code_reviewer', status: 'offline' },
      { agent_run_id: 'prototyper-run', member_address: '/product_team/prototyper', status: 'offline' },
      { agent_run_id: 'reviewer-copy-run', member_address: '/code_reviewer', status: 'offline' },
    )
    const index = new AgentOrgExecutionViewIndex(view)
    // Collaborators are hosted instances shown with the delegated-child presentation.
    expect(index.requireAgent('reviewer-run')).toMatchObject({ kind: 'task', source: { agentDefinitionId: 'code-reviewer' }, delegation: { delegatorAgentRunId: 'agent-director' } })
    expect(index.requireAgent('reviewer-copy-run')).toMatchObject({ kind: 'task', source: { agentDefinitionId: 'code-reviewer' } })
    expect(index.requireAgent('prototyper-run')).toMatchObject({ kind: 'task_team_member', source: { agentDefinitionId: 'prototyper' } })
    expect(index.coordinator('product-run').agentRunId).toBe('prototyper-run')
    expect(collaboratorAgentSourceAt(view.execution_tree.rootOrg.collaborators, '/product_team')).toBeNull()
    expect(collaboratorTeamSourceAt(view.execution_tree.rootOrg.collaborators, '/product_team')?.coordinatorAddress).toBe('/product_team/prototyper')
  })

  it('a catalog copy and its members take their source from the copy (REQ-011)', () => {
    const tree = teamTree()
    const productSource = {
      kind: 'agent_team' as const, team_definition_id: 'product-team', coordinator_address: '/product_team/product_prototyper',
      members: [
        { address: '/product_team/product_prototyper', agent_definition_id: 'prototyper' },
        { address: '/product_team/prototype_bootstrapper', agent_definition_id: 'bootstrapper' },
      ],
      handoffs: [], default_launch_configuration: launch,
    }
    const researcher = createTeamAgentContext({ tree, agentRunId: 'researcher-run', address: parseAgentTeamAddress('/researcher'), workspaceMetadata: null })!
    const state = createTeamExecutionViewState({
      rootTeamRunId: 'team-run', rootActive: true, executionTree: tree, closedTaskExecutions: [], messages: [],
      configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: new Map() }),
      initialFocusedAgentRunId: 'researcher-run',
      agentContexts: [{ agentRunId: 'researcher-run', memberAddress: parseAgentTeamAddress('/researcher'), agentContext: researcher }],
      createAgentContext: (agentRunId, address, nextTree) => createTeamAgentContext({ tree: nextTree, agentRunId, address, workspaceMetadata: null }),
    })
    const started = state.applyMessage({ type: 'TASK_EXECUTION_STARTED', payload: { change_sequence: 1, parent_team_run_id: 'team-run', execution: {
      kind: 'task_team', address: '/product_team', team_run_id: 'copy-run',
      members: [
        { kind: 'task_team_agent', address: '/product_team/product_prototyper', agent_run_id: 'copy-prototyper', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/product_team/prototype_bootstrapper', agent_run_id: 'copy-bootstrapper', platform_agent_run_id: null },
      ],
      task_executions: [], delegator_agent_run_id: 'researcher-run', started_at: created, source: productSource,
    } } } as never)
    expect(started.disposition).toBe('applied')
    expect(state.getAgentContext('copy-bootstrapper')?.config.agentDefinitionId).toBe('bootstrapper')
    const rows = state.listNavigationRows()
    // CR-002: a catalog copy and its members read as spaced names, like collaborators.
    expect(rows.find((row) => row.key === 'team:copy-run')).toMatchObject({ kind: 'task_team', delegatedBy: 'researcher', displayName: 'product team' })
    expect(rows.find((row) => row.agentRunId === 'copy-prototyper')).toMatchObject({ coordinator: true, displayName: 'product prototyper' })
    expect(rows.find((row) => row.agentRunId === 'copy-bootstrapper')).toMatchObject({ displayName: 'prototype bootstrapper' })
    // A configured member keeps its address basename.
    expect(rows.find((row) => row.agentRunId === 'researcher-run')).toMatchObject({ displayName: 'researcher' })
    expect(teamAgentSourceAt(state.getExecutionTree(), '/product_team/product_prototyper')).toMatchObject({ agent_definition_id: 'prototyper', launch_configuration: launch })
    expect(state.getExecutionTree().root_team.collaborators).toEqual([])
  })

  it('an Org view index resolves catalog copies and their members from source', () => {
    const view = JSON.parse(JSON.stringify(taskBearingView())) as AgentOrgExecutionViewDto & { execution_tree: { rootOrg: any } }
    const orgLaunch = view.execution_tree.rootOrg.defaultLaunchConfiguration
    view.execution_tree.rootOrg.taskExecutions.push(
      { address: '/writer', agentRunId: 'writer-copy', platformAgentRunId: null, delegatorAgentRunId: 'agent-director', startedAt: created,
        source: { kind: 'agent', agentDefinitionId: 'writer', launchConfiguration: orgLaunch } },
      { address: '/product_team', teamRunId: 'product-copy', delegatorAgentRunId: 'agent-director', startedAt: created, taskExecutions: [],
        members: [{ address: '/product_team/prototyper', agentRunId: 'copy-prototyper', platformAgentRunId: null }],
        source: { kind: 'agent_team', teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper',
          members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper' }], handoffs: [], defaultLaunchConfiguration: orgLaunch } },
    )
    view.agent_statuses.push(
      { agent_run_id: 'writer-copy', member_address: '/writer', status: 'offline' },
      { agent_run_id: 'copy-prototyper', member_address: '/product_team/prototyper', status: 'offline' },
    )
    const index = new AgentOrgExecutionViewIndex(view)
    expect(index.requireAgent('writer-copy')).toMatchObject({ kind: 'task', source: { agentDefinitionId: 'writer' } })
    expect(index.requireAgent('copy-prototyper')).toMatchObject({ kind: 'task_team_member', source: { agentDefinitionId: 'prototyper' } })
    expect(index.coordinator('product-copy').agentRunId).toBe('copy-prototyper')
    const tasks = view.execution_tree.rootOrg.taskExecutions
    expect(catalogTeamSourceAt(tasks, '/product_team')).toEqual({ address: '/product_team', coordinatorAddress: '/product_team/prototyper' })
    expect(catalogAgentSourceAt(tasks, '/product_team')).toBeNull()
    expect(catalogAgentSourceAt(tasks, '/nobody')).toBeNull()
  })
})

describe('per-member launch of collaborator Teams and catalog Team copies (DS-005, AC-001, AC-007)', () => {
  const sol = { ...launch, llm_model_identifier: 'sol-6.1', llm_config: { effort: 'high' } }
  const mixedTeam = {
    ...productTeamEntry,
    members: [
      productTeamEntry.members[0]!,
      { ...productTeamEntry.members[1]!, launch_configuration: sol, launch_source: { origin: 'agent_default' as const, fallbacks: [] } },
    ],
  }

  it('Team root: a collaborator member and a catalog copy member show the launch they actually ran on', () => {
    const tree = teamTree()
    tree.root_team.collaborators = [mixedTeam]
    tree.root_team.task_executions = [{
      kind: 'task_team', address: '/se_team', team_run_id: 'copy-run', members: [], task_executions: [],
      delegator_agent_run_id: 'researcher-run', started_at: created,
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se_team/lead', handoffs: [],
        members: [{ address: '/se_team/lead', agent_definition_id: 'lead' }, { address: '/se_team/ie', agent_definition_id: 'ie', launch_configuration: sol }],
        default_launch_configuration: launch,
      },
    }]
    expect(teamAgentSourceAt(tree, '/product_team/bootstrapper')?.launch_configuration).toEqual(sol)
    expect(teamAgentSourceAt(tree, '/product_team/prototyper')?.launch_configuration).toEqual(launch)
    expect(teamAgentSourceAt(tree, '/se_team/ie')?.launch_configuration).toEqual(sol)
    expect(teamAgentSourceAt(tree, '/se_team/lead')?.launch_configuration).toEqual(launch)
  })

  it('Org and Agent roots: the camelCase selectors use the same rule', () => {
    const camel = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const solCamel = { ...camel, llmModelIdentifier: 'sol-6.1' }
    const collaborator = {
      kind: 'agent_team' as const, address: '/se', teamDefinitionId: 'se', teamRunId: 'se-run', coordinatorAddress: '/se/lead',
      members: [
        { address: '/se/lead', agentDefinitionId: 'lead', agentRunId: 'lead-run', platformAgentRunId: null },
        { address: '/se/ie', agentDefinitionId: 'ie', agentRunId: 'ie-run', platformAgentRunId: null, launchConfiguration: solCamel },
      ],
      handoffs: [], defaultLaunchConfiguration: camel, taskExecutions: [], addedAt: created, addedViaAgentRunId: 'host',
    }
    expect(collaboratorAgentSourceAt([collaborator], '/se/ie')?.launchConfiguration).toEqual(solCamel)
    expect(collaboratorAgentSourceAt([collaborator], '/se/lead')?.launchConfiguration).toEqual(camel)
    const copy = {
      address: '/se_copy', teamRunId: 'copy', members: [], taskExecutions: [], startedAt: created,
      source: {
        kind: 'agent_team' as const, teamDefinitionId: 'se', coordinatorAddress: '/se_copy/lead', handoffs: [],
        members: [{ address: '/se_copy/lead', agentDefinitionId: 'lead' }, { address: '/se_copy/ie', agentDefinitionId: 'ie', launchConfiguration: solCamel }],
        defaultLaunchConfiguration: camel,
      },
    }
    expect(catalogAgentSourceAt([copy], '/se_copy/ie')?.launchConfiguration).toEqual(solCamel)
    expect(catalogAgentSourceAt([copy], '/se_copy/lead')?.launchConfiguration).toEqual(camel)
  })
})

describe('what each copy or collaborator agent runs with: its choice, else its Team\'s when it follows (CR-001, DS-003)', () => {
  const sol = { ...launch, llm_model_identifier: 'sol-6.1', llm_config: { effort: 'high' } }
  const choice = (model: string) => ({ llm_model_identifier: model, llm_config: { thinking: 'low' }, selected_at: created })
  /** A mutable view of the fixture's root Team (the DTO types are readonly). */
  const rootOf = (tree: TeamRunExecutionTreeDto) => tree.root_team as { -readonly [K in keyof TeamRunExecutionTreeDto['root_team']]: TeamRunExecutionTreeDto['root_team'][K] }
  const ran = (model: string) => ({ ...launch, llm_model_identifier: model, llm_config: { thinking: 'low' } })

  it('Team root (snake_case): agent copies, Team followers, non-followers and collaborator members', () => {
    const tree = teamTree()
    rootOf(tree).collaborators = [reviewerEntry, {
      ...productTeamEntry, user_team_launch_selection: choice('team-model'),
      members: [
        productTeamEntry.members[0]!,
        { ...productTeamEntry.members[1]!, launch_configuration: sol },
      ],
    }]
    rootOf(tree).task_executions = [
      { kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'copy-1', platform_agent_run_id: null,
        delegator_agent_run_id: 'researcher-run', started_at: created, user_launch_selection: choice('copy-model') },
      { kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'copy-2', platform_agent_run_id: null,
        delegator_agent_run_id: 'researcher-run', started_at: created },
      { kind: 'task_team', address: '/se_team', team_run_id: 'se-copy', task_executions: [], delegator_agent_run_id: 'researcher-run',
        started_at: created, user_team_launch_selection: choice('se-team-model'),
        members: [
          { kind: 'task_team_agent', address: '/se_team/lead', agent_run_id: 'se-lead', platform_agent_run_id: null },
          { kind: 'task_team_agent', address: '/se_team/ie', agent_run_id: 'se-ie', platform_agent_run_id: null },
        ],
        source: {
          kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se_team/lead', handoffs: [],
          members: [{ address: '/se_team/lead', agent_definition_id: 'lead' }, { address: '/se_team/ie', agent_definition_id: 'ie', launch_configuration: sol }],
          default_launch_configuration: launch,
        } },
    ]
    const at = (address: string, agentRunId?: string) => teamAgentSourceAt(tree, address, agentRunId)?.launch_configuration
    // An agent copy's own choice is per instance: another copy at the same address and the collaborator keep their started launch.
    expect(at('/code_reviewer', 'copy-1')).toEqual(ran('copy-model'))
    expect(at('/code_reviewer', 'copy-2')).toEqual(launch)
    expect(at('/code_reviewer', 'reviewer-run')).toEqual(launch)
    // A collaborator Team member that follows takes the Team's choice; one with its own recorded launch does not.
    expect(at('/product_team/prototyper', 'prototyper-run')).toEqual(ran('team-model'))
    expect(at('/product_team/bootstrapper', 'bootstrapper-run')).toEqual(sol)
    // A catalog Team copy: same rule over its recorded source.
    expect(at('/se_team/lead', 'se-lead')).toEqual(ran('se-team-model'))
    expect(at('/se_team/ie', 'se-ie')).toEqual(sol)
    // A configured member is never a copy; without a run ID the started source is returned.
    expect(at('/researcher', 'researcher-run')).toEqual(launch)
    expect(at('/product_team/prototyper')).toEqual(launch)
  })

  it('a member context shows the model its agent runs on', () => {
    const tree = teamTree()
    rootOf(tree).collaborators = [{ ...reviewerEntry, user_launch_selection: choice('chosen') }]
    const context = createTeamAgentContext({ tree, agentRunId: 'reviewer-run', address: parseAgentTeamAddress('/code_reviewer'), workspaceMetadata: null })!
    expect(context.config.llmModelIdentifier).toBe('chosen')
    expect(context.state.conversation.llmModelIdentifier).toBe('chosen')
  })

  it('a live Team view records a Save\'s choices in place and its member contexts take the model they now run on (CR-002)', () => {
    const tree = teamTree()
    rootOf(tree).collaborators = [reviewerEntry, productTeamEntry]
    const researcher = createTeamAgentContext({ tree, agentRunId: 'researcher-run', address: parseAgentTeamAddress('/researcher'), workspaceMetadata: null })!
    const state = createTeamExecutionViewState({
      rootTeamRunId: 'team-run', rootActive: true, executionTree: tree, closedTaskExecutions: [], messages: [],
      configuration: createTeamConfigurationView({ tree, workspaceMetadataByAddress: new Map() }),
      initialFocusedAgentRunId: 'researcher-run',
      agentContexts: [{ agentRunId: 'researcher-run', memberAddress: parseAgentTeamAddress('/researcher'), agentContext: researcher }],
      createAgentContext: (agentRunId, address, nextTree) => createTeamAgentContext({ tree: nextTree, agentRunId, address, workspaceMetadata: null }),
    })
    const applied = state.applyMessage({ type: 'DELEGATED_LAUNCH_SELECTIONS_CHANGED', payload: { change_sequence: 1, selections: [
      { team_run_id: 'product-run', selection: choice('team-model') }, { agent_run_id: 'reviewer-run', selection: choice('mine') },
    ] } } as never)
    expect(applied).toMatchObject({ disposition: 'applied' })
    const collaborators = state.getExecutionTree().root_team.collaborators ?? []
    expect(collaborators.find((entry) => entry.address === '/product_team')).toMatchObject({ user_team_launch_selection: choice('team-model') })
    expect(collaborators.find((entry) => entry.address === '/code_reviewer')).toMatchObject({ user_launch_selection: choice('mine') })
    expect(state.getAgentContext('prototyper-run')?.config.llmModelIdentifier).toBe('team-model')
    expect(state.getAgentContext('reviewer-run')?.state.conversation.llmModelIdentifier).toBe('mine')
    expect(state.getAgentContext('researcher-run')?.config.llmModelIdentifier).toBe('root-model')
    // A choice for a run the view does not know asks for a fresh view.
    expect(state.applyMessage({ type: 'DELEGATED_LAUNCH_SELECTIONS_CHANGED', payload: { change_sequence: 2, selections: [
      { agent_run_id: 'ghost', selection: choice('x') },
    ] } } as never).disposition).toBe('rejected')
  })

  it('Org and Agent roots (camelCase): the same rule, with configured-placement followers by launch equality (AR-003)', () => {
    const camel = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const solCamel = { ...camel, llmModelIdentifier: 'sol-6.1' }
    const pick = (model: string) => ({ llmModelIdentifier: model, llmConfig: null, selectedAt: created })
    const chosen = (model: string) => ({ ...camel, llmModelIdentifier: model })
    const collaborator = {
      kind: 'agent_team' as const, address: '/se', teamDefinitionId: 'se', teamRunId: 'se-run', coordinatorAddress: '/se/lead',
      userTeamLaunchSelection: pick('team-model'),
      members: [
        { address: '/se/lead', agentDefinitionId: 'lead', agentRunId: 'lead-run', platformAgentRunId: null },
        { address: '/se/ie', agentDefinitionId: 'ie', agentRunId: 'ie-run', platformAgentRunId: null, launchConfiguration: solCamel },
        { address: '/se/qa', agentDefinitionId: 'qa', agentRunId: 'qa-run', platformAgentRunId: null, launchConfiguration: solCamel, userLaunchSelection: pick('qa-model') },
      ],
      handoffs: [], defaultLaunchConfiguration: camel, taskExecutions: [], addedAt: created, addedViaAgentRunId: 'host',
    }
    const taskExecutions = [
      { address: '/se/ie', agentRunId: 'ie-copy', platformAgentRunId: null, delegatorAgentRunId: 'host', startedAt: created, userLaunchSelection: pick('copy-model') },
      { address: '/mounted', teamRunId: 'mounted-copy', taskExecutions: [], startedAt: created, delegatorAgentRunId: 'host',
        userTeamLaunchSelection: pick('mounted-model'),
        members: [
          { address: '/mounted/a', agentRunId: 'a-copy', platformAgentRunId: null },
          { address: '/mounted/b', agentRunId: 'b-copy', platformAgentRunId: null },
        ] },
    ]
    const instances = { collaborators: [collaborator], taskExecutions, configuredTeamLaunchAt: (address: string) => address === '/mounted' ? camel : null }
    const at = (agentRunId: string, address: string, started = collaboratorAgentSourceAt([collaborator], address)!) =>
      collaborationInstanceSource(instances, agentRunId, started).launchConfiguration
    expect(at('lead-run', '/se/lead')).toEqual(chosen('team-model'))
    expect(at('ie-run', '/se/ie')).toEqual(solCamel)
    expect(at('qa-run', '/se/qa')).toEqual(chosen('qa-model'))
    expect(at('ie-copy', '/se/ie')).toEqual(chosen('copy-model'))
    // A copy of a configured Team: a member whose launch equals the Team's default follows its choice.
    const configuredAt = (address: string, launchConfiguration: typeof camel) => ({ address, agentDefinitionId: 'x', launchConfiguration })
    expect(at('a-copy', '/mounted/a', configuredAt('/mounted/a', camel))).toEqual(chosen('mounted-model'))
    expect(at('b-copy', '/mounted/b', configuredAt('/mounted/b', solCamel))).toEqual(solCamel)
    // Any other agent keeps its started source.
    expect(at('unknown', '/se/lead')).toEqual(camel)
  })
})
