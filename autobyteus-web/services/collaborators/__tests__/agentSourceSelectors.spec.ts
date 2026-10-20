import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto, TeamStreamServerMessage } from '@autobyteus/team-stream-contracts'
import type { AgentOrgExecutionViewDto } from '@autobyteus/collaboration-stream-contracts'
import { createTeamExecutionViewState } from '~/services/teamExecution/teamExecutionViewState'
import { createTeamAgentContext, createTeamConfigurationView } from '~/services/teamExecution/teamExecutionContextFactory'
import { AgentOrgExecutionViewIndex } from '~/services/agentOrgExecution/agentOrgExecutionViewIndex'
import { taskBearingView } from '~/services/agentOrgExecution/__tests__/taskBearingOrgFixture'
import { parseAgentTeamAddress } from '~/types/agent/AgentTeamAddress'
import { copyAgentSourceOf, copyTeamSourceOf, teamAgentSourceOf } from '../agentSourceSelectors'
import { readsAsDisplayName } from '~/services/teamExecution/teamExecutionTreeSelectors'

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
    task_executions: [],
  },
})

/** Catalog copies of the researcher's Team root: an Agent copy and a Team copy, each recording its source. */
const reviewerCopy = {
  kind: 'task_agent' as const, address: '/code_reviewer', agent_run_id: 'reviewer-run', platform_agent_run_id: null,
  delegator_agent_run_id: 'researcher-run', started_at: created,
  source: { kind: 'agent' as const, agent_definition_id: 'code-reviewer', launch_configuration: launch },
}
const productTeamCopy = {
  kind: 'task_team' as const, address: '/product_team', team_run_id: 'product-run', task_executions: [],
  delegator_agent_run_id: 'researcher-run', started_at: created,
  members: [
    { kind: 'task_team_agent' as const, address: '/product_team/prototyper', agent_run_id: 'prototyper-run', platform_agent_run_id: null },
    { kind: 'task_team_agent' as const, address: '/product_team/bootstrapper', agent_run_id: 'bootstrapper-run', platform_agent_run_id: null },
  ],
  source: {
    kind: 'agent_team' as const, team_definition_id: 'product-team', coordinator_address: '/product_team/prototyper', handoffs: [],
    members: [
      { address: '/product_team/prototyper', agent_definition_id: 'prototyper', launch_configuration: launch, follows_team: true },
      { address: '/product_team/bootstrapper', agent_definition_id: 'bootstrapper', launch_configuration: launch, follows_team: true },
    ],
    default_launch_configuration: launch,
  },
}

describe('copy sources', () => {
  it('resolves an execution by run ID: a configured member, a copied Agent, a Team copy member; nothing else', () => {
    const tree = teamTree()
    tree.root_team.task_executions = [reviewerCopy, productTeamCopy]
    expect(teamAgentSourceOf(tree, 'researcher-run')?.agent_definition_id).toBe('researcher')
    expect(teamAgentSourceOf(tree, 'reviewer-run')).toMatchObject({ address: '/code_reviewer', agent_definition_id: 'code-reviewer', launch_configuration: launch })
    expect(teamAgentSourceOf(tree, 'bootstrapper-run')).toMatchObject({ address: '/product_team/bootstrapper', agent_definition_id: 'bootstrapper' })
    expect(teamAgentSourceOf(tree, 'product-run')).toBeNull()
    expect(teamAgentSourceOf(tree, 'unknown-run')).toBeNull()
  })

  it('a copy of a configured member shows its own recorded source, not the member\'s current settings (AC-004)', () => {
    const tree = teamTree()
    const edited = { ...launch, llm_model_identifier: 'edited-model' }
    tree.root_team.members = [{ ...tree.root_team.members[0]!, launch_configuration: edited }]
    tree.root_team.task_executions = [{
      kind: 'task_agent', address: '/researcher', agent_run_id: 'researcher-copy', platform_agent_run_id: null,
      delegator_agent_run_id: 'researcher-run', started_at: created,
      source: { kind: 'agent', agent_definition_id: 'researcher', launch_configuration: launch, launch_source: { origin: 'configured', fallbacks: [] } },
    }]
    expect(teamAgentSourceOf(tree, 'researcher-run')?.launch_configuration).toEqual(edited)
    expect(teamAgentSourceOf(tree, 'researcher-copy')?.launch_configuration).toEqual(launch)
  })

  it('display names (D-7): a configured member, its copies and the root keep basenames; a catalog copy reads as a spaced name', () => {
    const tree = teamTree()
    tree.root_team.task_executions = [reviewerCopy, productTeamCopy]
    expect(readsAsDisplayName(tree, '/researcher')).toBe(false)
    expect(readsAsDisplayName(tree, '/researcher/nested')).toBe(false)
    expect(readsAsDisplayName(tree, '/')).toBe(false)
    expect(readsAsDisplayName(tree, '/code_reviewer')).toBe(true)
    expect(readsAsDisplayName(tree, '/product_team/prototyper')).toBe(true)
  })

  it('a catalog copy and its members take their source from the copy (REQ-011)', () => {
    const tree = teamTree()
    const productSource = {
      kind: 'agent_team' as const, team_definition_id: 'product-team', coordinator_address: '/product_team/product_prototyper',
      members: [
        { address: '/product_team/product_prototyper', agent_definition_id: 'prototyper', launch_configuration: launch, follows_team: true },
        { address: '/product_team/prototype_bootstrapper', agent_definition_id: 'bootstrapper', launch_configuration: launch, follows_team: true },
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
    // CR-002: a catalog copy and its members read as spaced names.
    expect(rows.find((row) => row.key === 'team:copy-run')).toMatchObject({ kind: 'task_team', delegatedBy: 'researcher', displayName: 'product team' })
    expect(rows.find((row) => row.agentRunId === 'copy-prototyper')).toMatchObject({ coordinator: true, displayName: 'product prototyper' })
    expect(rows.find((row) => row.agentRunId === 'copy-bootstrapper')).toMatchObject({ displayName: 'prototype bootstrapper' })
    // A configured member keeps its address basename.
    expect(rows.find((row) => row.agentRunId === 'researcher-run')).toMatchObject({ displayName: 'researcher' })
    expect(teamAgentSourceOf(state.getExecutionTree(), 'copy-prototyper')).toMatchObject({ agent_definition_id: 'prototyper', launch_configuration: launch })
  })

  it('an Org view index resolves copies and their members from their own source, by execution kind', () => {
    const view = JSON.parse(JSON.stringify(taskBearingView())) as AgentOrgExecutionViewDto & { execution_tree: { rootOrg: any } }
    const orgLaunch = view.execution_tree.rootOrg.defaultLaunchConfiguration
    view.execution_tree.rootOrg.taskExecutions.push(
      { address: '/writer', agentRunId: 'writer-copy', platformAgentRunId: null, delegatorAgentRunId: 'agent-director', startedAt: created,
        source: { kind: 'agent', agentDefinitionId: 'writer', launchConfiguration: orgLaunch } },
      { address: '/product_team', teamRunId: 'product-copy', delegatorAgentRunId: 'agent-director', startedAt: created, taskExecutions: [],
        members: [{ address: '/product_team/prototyper', agentRunId: 'copy-prototyper', platformAgentRunId: null }],
        source: { kind: 'agent_team', teamDefinitionId: 'product-team', coordinatorAddress: '/product_team/prototyper',
          members: [{ address: '/product_team/prototyper', agentDefinitionId: 'prototyper', launchConfiguration: orgLaunch, followsTeam: true }],
          handoffs: [], defaultLaunchConfiguration: orgLaunch } },
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
    expect(copyTeamSourceOf(tasks, 'product-copy')).toEqual({ address: '/product_team', coordinatorAddress: '/product_team/prototyper' })
    expect(copyAgentSourceOf(tasks, 'product-copy')).toBeNull()
    expect(copyAgentSourceOf(tasks, 'nobody')).toBeNull()
  })
})

describe('per-member launch of Team copies (D-5, AC-011)', () => {
  const sol = { ...launch, llm_model_identifier: 'sol-6.1', llm_config: { effort: 'high' } }
  const mixedTeam = {
    ...productTeamCopy,
    source: {
      ...productTeamCopy.source,
      members: [
        productTeamCopy.source.members[0]!,
        { ...productTeamCopy.source.members[1]!, launch_configuration: sol, follows_team: false, launch_source: { origin: 'agent_default' as const, fallbacks: [] } },
      ],
    },
  }

  it('Team root: copy members show the launch they actually ran on', () => {
    const tree = teamTree()
    tree.root_team.task_executions = [mixedTeam, {
      kind: 'task_team', address: '/se_team', team_run_id: 'copy-run', task_executions: [],
      delegator_agent_run_id: 'researcher-run', started_at: created,
      members: [
        { kind: 'task_team_agent', address: '/se_team/lead', agent_run_id: 'se-lead', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se_team/ie', agent_run_id: 'se-ie', platform_agent_run_id: null },
      ],
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se_team/lead', handoffs: [],
        members: [
          { address: '/se_team/lead', agent_definition_id: 'lead', launch_configuration: launch, follows_team: true },
          { address: '/se_team/ie', agent_definition_id: 'ie', launch_configuration: sol, follows_team: false },
        ],
        default_launch_configuration: launch,
      },
    }]
    expect(teamAgentSourceOf(tree, 'bootstrapper-run')?.launch_configuration).toEqual(sol)
    expect(teamAgentSourceOf(tree, 'prototyper-run')?.launch_configuration).toEqual(launch)
    expect(teamAgentSourceOf(tree, 'se-ie')?.launch_configuration).toEqual(sol)
    expect(teamAgentSourceOf(tree, 'se-lead')?.launch_configuration).toEqual(launch)
  })

  it('Org and Agent roots: the camelCase selectors use the same rule', () => {
    const camel = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const solCamel = { ...camel, llmModelIdentifier: 'sol-6.1' }
    const copy = {
      address: '/se_copy', teamRunId: 'copy', taskExecutions: [], startedAt: created,
      members: [
        { address: '/se_copy/lead', agentRunId: 'lead-run', platformAgentRunId: null },
        { address: '/se_copy/ie', agentRunId: 'ie-run', platformAgentRunId: null },
      ],
      source: {
        kind: 'agent_team' as const, teamDefinitionId: 'se', coordinatorAddress: '/se_copy/lead', handoffs: [],
        members: [
          { address: '/se_copy/lead', agentDefinitionId: 'lead', launchConfiguration: camel, followsTeam: true },
          { address: '/se_copy/ie', agentDefinitionId: 'ie', launchConfiguration: solCamel, followsTeam: false },
        ],
        defaultLaunchConfiguration: camel,
      },
    }
    expect(copyAgentSourceOf([copy], 'ie-run')?.launchConfiguration).toEqual(solCamel)
    expect(copyAgentSourceOf([copy], 'lead-run')?.launchConfiguration).toEqual(camel)
  })
})

describe('what each copy agent runs with: its choice, else its Team\'s when it follows (CR-001, DS-003)', () => {
  const sol = { ...launch, llm_model_identifier: 'sol-6.1', llm_config: { effort: 'high' } }
  const choice = (model: string) => ({ llm_model_identifier: model, llm_config: { thinking: 'low' }, selected_at: created })
  /** A mutable view of the fixture's root Team (the DTO types are readonly). */
  const rootOf = (tree: TeamRunExecutionTreeDto) => tree.root_team as { -readonly [K in keyof TeamRunExecutionTreeDto['root_team']]: TeamRunExecutionTreeDto['root_team'][K] }
  const ran = (model: string) => ({ ...launch, llm_model_identifier: model, llm_config: { thinking: 'low' } })

  it('Team root (snake_case): agent copies, Team followers and non-followers', () => {
    const tree = teamTree()
    rootOf(tree).task_executions = [
      { ...reviewerCopy, agent_run_id: 'reviewer-run' },
      { kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'copy-1', platform_agent_run_id: null,
        delegator_agent_run_id: 'researcher-run', started_at: created, user_launch_selection: choice('copy-model'),
        source: reviewerCopy.source },
      { kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'copy-2', platform_agent_run_id: null,
        delegator_agent_run_id: 'researcher-run', started_at: created, source: reviewerCopy.source },
      { ...productTeamCopy, user_team_launch_selection: choice('team-model'),
        source: { ...productTeamCopy.source, members: [productTeamCopy.source.members[0]!, { ...productTeamCopy.source.members[1]!, launch_configuration: sol, follows_team: false }] } },
      { kind: 'task_team', address: '/se_team', team_run_id: 'se-copy', task_executions: [], delegator_agent_run_id: 'researcher-run',
        started_at: created, user_team_launch_selection: choice('se-team-model'),
        members: [
          { kind: 'task_team_agent', address: '/se_team/lead', agent_run_id: 'se-lead', platform_agent_run_id: null },
          { kind: 'task_team_agent', address: '/se_team/ie', agent_run_id: 'se-ie', platform_agent_run_id: null },
        ],
        source: {
          kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se_team/lead', handoffs: [],
          members: [
            { address: '/se_team/lead', agent_definition_id: 'lead', launch_configuration: launch, follows_team: true },
            { address: '/se_team/ie', agent_definition_id: 'ie', launch_configuration: sol, follows_team: false },
          ],
          default_launch_configuration: launch,
        } },
    ]
    const at = (_address: string, agentRunId: string) => teamAgentSourceOf(tree, agentRunId)?.launch_configuration
    // An agent copy's own choice is per instance: another copy at the same address keeps its started launch.
    expect(at('/code_reviewer', 'copy-1')).toEqual(ran('copy-model'))
    expect(at('/code_reviewer', 'copy-2')).toEqual(launch)
    expect(at('/code_reviewer', 'reviewer-run')).toEqual(launch)
    // A copy Team member that follows takes the Team's choice; one with its own recorded launch does not.
    expect(at('/product_team/prototyper', 'prototyper-run')).toEqual(ran('team-model'))
    expect(at('/product_team/bootstrapper', 'bootstrapper-run')).toEqual(sol)
    expect(at('/se_team/lead', 'se-lead')).toEqual(ran('se-team-model'))
    expect(at('/se_team/ie', 'se-ie')).toEqual(sol)
    // A configured member is never a copy.
    expect(at('/researcher', 'researcher-run')).toEqual(launch)
  })

  it('a member context shows the model its agent runs on', () => {
    const tree = teamTree()
    rootOf(tree).task_executions = [{ ...reviewerCopy, user_launch_selection: choice('chosen') }]
    const context = createTeamAgentContext({ tree, agentRunId: 'reviewer-run', address: parseAgentTeamAddress('/code_reviewer'), workspaceMetadata: null })!
    expect(context.config.llmModelIdentifier).toBe('chosen')
    expect(context.state.conversation.llmModelIdentifier).toBe('chosen')
  })

  it('a live Team view records a Save\'s choices in place and its member contexts take the model they now run on (CR-002)', () => {
    const tree = teamTree()
    rootOf(tree).task_executions = [reviewerCopy, productTeamCopy]
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
    const copies = state.getExecutionTree().root_team.task_executions
    expect(copies.find((entry) => entry.address === '/product_team')).toMatchObject({ user_team_launch_selection: choice('team-model') })
    expect(copies.find((entry) => entry.address === '/code_reviewer')).toMatchObject({ user_launch_selection: choice('mine') })
    expect(state.getAgentContext('prototyper-run')?.config.llmModelIdentifier).toBe('team-model')
    expect(state.getAgentContext('reviewer-run')?.state.conversation.llmModelIdentifier).toBe('mine')
    expect(state.getAgentContext('researcher-run')?.config.llmModelIdentifier).toBe('root-model')
    // A choice for a run the view does not know asks for a fresh view.
    expect(state.applyMessage({ type: 'DELEGATED_LAUNCH_SELECTIONS_CHANGED', payload: { change_sequence: 2, selections: [
      { agent_run_id: 'ghost', selection: choice('x') },
    ] } } as never).disposition).toBe('rejected')
  })

  it('Org and Agent roots (camelCase): the same rule, with each member\'s recorded follower fact (D-5)', () => {
    const camel = { runtimeKind: 'codex_app_server' as const, llmModelIdentifier: 'root-model', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const solCamel = { ...camel, llmModelIdentifier: 'sol-6.1' }
    const pick = (model: string) => ({ llmModelIdentifier: model, llmConfig: null, selectedAt: created })
    const chosen = (model: string) => ({ ...camel, llmModelIdentifier: model })
    const seCopy = {
      address: '/se', teamRunId: 'se-run', userTeamLaunchSelection: pick('team-model'), taskExecutions: [], startedAt: created, delegatorAgentRunId: 'host',
      members: [
        { address: '/se/lead', agentRunId: 'lead-run', platformAgentRunId: null },
        { address: '/se/ie', agentRunId: 'ie-run', platformAgentRunId: null },
        { address: '/se/qa', agentRunId: 'qa-run', platformAgentRunId: null, userLaunchSelection: pick('qa-model') },
      ],
      source: {
        kind: 'agent_team' as const, teamDefinitionId: 'se', coordinatorAddress: '/se/lead', handoffs: [], defaultLaunchConfiguration: camel,
        members: [
          { address: '/se/lead', agentDefinitionId: 'lead', launchConfiguration: camel, followsTeam: true },
          { address: '/se/ie', agentDefinitionId: 'ie', launchConfiguration: solCamel, followsTeam: false },
          { address: '/se/qa', agentDefinitionId: 'qa', launchConfiguration: solCamel, followsTeam: false },
        ],
      },
    }
    const taskExecutions = [
      seCopy,
      { address: '/se/ie', agentRunId: 'ie-copy', platformAgentRunId: null, delegatorAgentRunId: 'host', startedAt: created, userLaunchSelection: pick('copy-model'),
        source: { kind: 'agent' as const, agentDefinitionId: 'ie', launchConfiguration: solCamel } },
      // A copy of a configured Team: a member with its own auto-approve but the Team's model still follows (configured rule, AC-011 a).
      { address: '/mounted', teamRunId: 'mounted-copy', taskExecutions: [], startedAt: created, delegatorAgentRunId: 'host',
        userTeamLaunchSelection: pick('mounted-model'),
        members: [
          { address: '/mounted/a', agentRunId: 'a-copy', platformAgentRunId: null },
          { address: '/mounted/b', agentRunId: 'b-copy', platformAgentRunId: null },
        ],
        source: {
          kind: 'agent_team' as const, teamDefinitionId: 'm', coordinatorAddress: '/mounted/a', handoffs: [], defaultLaunchConfiguration: camel,
          defaultLaunchSource: { origin: 'configured' as const, fallbacks: [] },
          members: [
            { address: '/mounted/a', agentDefinitionId: 'a', launchConfiguration: { ...camel, autoExecuteTools: true }, followsTeam: true },
            { address: '/mounted/b', agentDefinitionId: 'b', launchConfiguration: solCamel, followsTeam: false },
          ],
        } },
    ]
    const at = (agentRunId: string) => copyAgentSourceOf(taskExecutions, agentRunId)?.launchConfiguration
    expect(at('lead-run')).toEqual(chosen('team-model'))
    expect(at('ie-run')).toEqual(solCamel)
    expect(at('qa-run')).toEqual(chosen('qa-model'))
    expect(at('ie-copy')).toEqual(chosen('copy-model'))
    expect(at('a-copy')).toEqual({ ...chosen('mounted-model'), autoExecuteTools: true })
    expect(at('b-copy')).toEqual(solCamel)
    // Any other agent is not a copy.
    expect(at('unknown')).toBeUndefined()
  })
})
