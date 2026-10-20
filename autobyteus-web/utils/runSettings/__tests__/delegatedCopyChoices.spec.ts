import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import {
  collaborationDelegatedLaunchNodes,
  delegatedRowsByKey,
  teamDelegatedLaunchNodes,
  type DelegatedRowControl,
} from '../delegatedLaunchRows'

/**
 * DS-004 (SR-007): copy rows show what they run with by the single launch rule,
 * with this edit's choices applied; a row with a choice shows no origin; a stopped copy's model and
 * settings are editable, a running one is locked and carries the stop target on the copy itself.
 */
const deps = { schemaFor: () => null, sameWorkspace: () => true }
const at = '2026-10-13T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }
const sonnet = { llm_model_identifier: 'sonnet', llm_config: { thinking: 'low' }, selected_at: at }
const haiku = { llm_model_identifier: 'haiku', llm_config: null, selected_at: at }

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: at, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude,
    members: [{ kind: 'configured_agent', address: '/pm', agent_definition_id: 'pm', role: null, description: null, agent_run_id: 'pm-run', platform_agent_run_id: null, launch_configuration: claude }],
    task_executions: [{
      kind: 'task_agent', address: '/writer', agent_run_id: 'writer-run', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: at,
      user_launch_selection: haiku,
      source: { kind: 'agent', agent_definition_id: 'writer', launch_configuration: claude, launch_source: { origin: 'agent_default', fallbacks: [] } },
    }, {
      kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: at, task_executions: [],
      user_team_launch_selection: sonnet,
      members: [
        { kind: 'task_team_agent', address: '/se/lead', agent_run_id: 'lead-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/ie', agent_run_id: 'ie-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/cr', agent_run_id: 'cr-run', platform_agent_run_id: null, user_launch_selection: haiku },
      ],
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/lead', handoffs: [],
        default_launch_configuration: claude, default_launch_source: { origin: 'inherited', fallbacks: [] },
        members: [
          { address: '/se/lead', agent_definition_id: 'lead', launch_configuration: claude, follows_team: true },
          { address: '/se/ie', agent_definition_id: 'ie', launch_configuration: codex, follows_team: false, launch_source: { origin: 'agent_default', fallbacks: [] } },
          { address: '/se/cr', agent_definition_id: 'cr', launch_configuration: claude, follows_team: true },
        ],
      },
    }],
  },
})

const control = (overrides: Partial<DelegatedRowControl> = {}): DelegatedRowControl => ({
  editable: true, isAgentLive: () => false, isStopping: () => false, draftOf: () => null, ...overrides,
})
const rows = (input: Partial<DelegatedRowControl> = {}) => delegatedRowsByKey(teamDelegatedLaunchNodes(tree(), [], deps, control(input)))

describe('copy rows with user choices (SR-007)', () => {
  it('show each row on its own choice, else its Team\'s when it follows the Team, else its started value', () => {
    const map = rows()
    expect(map.get('/writer@writer-run')).toMatchObject({ values: { llmModelIdentifier: 'haiku' },
      delegated: { target: 'agent:writer-run', stop: { agentRunId: 'writer-run' }, running: false, original: { llmModelIdentifier: 'haiku' } } })
    expect(map.get('/se@se-copy')).toMatchObject({ values: { llmModelIdentifier: 'sonnet', llmConfig: { thinking: 'low' } },
      delegated: { target: 'team:se-copy', stop: { teamRunId: 'se-copy' } } })
    expect(map.get('/se/lead@lead-run')?.values.llmModelIdentifier).toBe('sonnet')
    expect(map.get('/se/ie@ie-run')?.values).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1' })
    expect(map.get('/se/cr@cr-run')?.values.llmModelIdentifier).toBe('haiku')
    // A Team member has no stop of its own: the Team copy stops as one unit.
    expect(map.get('/se/lead@lead-run')?.delegated?.stop).toBeNull()
  })

  it('hide the origin once a choice applies and keep it otherwise', () => {
    const map = rows()
    expect(map.get('/writer@writer-run')?.sourceKey).toBeUndefined()
    expect(map.get('/se/lead@lead-run')?.sourceKey).toBeUndefined()
    expect(map.get('/se/ie@ie-run')?.sourceKey).toBe('agent_default')
  })

  it('unlock the model and its settings only while the copy is stopped and the run allows it', () => {
    expect(rows().get('/se/lead@lead-run')?.locked).toEqual({ workspace: true, model: false, thinking: false, approval: true })
    const running = rows({ isAgentLive: (id) => id === 'ie-run' })
    expect(running.get('/se@se-copy')).toMatchObject({ locked: { model: true }, delegated: { running: true } })
    expect(running.get('/se/lead@lead-run')).toMatchObject({ locked: { model: true }, delegated: { running: true } })
    expect(running.get('/writer@writer-run')).toMatchObject({ locked: { model: false }, delegated: { running: false } })
    expect(rows({ editable: false }).get('/writer@writer-run')?.locked?.model).toBe(true)
    expect(rows({ isStopping: (reference) => 'agentRunId' in reference }).get('/writer@writer-run')?.locked?.model).toBe(true)
  })

  it('apply this edit\'s choices: a Team draft reaches its followers only; originals stay what ran', () => {
    const draft = { llmModelIdentifier: 'opus-next', llmConfig: null }
    const map = rows({ draftOf: (target) => target === 'team:se-copy' ? draft : null })
    expect(map.get('/se@se-copy')?.values.llmModelIdentifier).toBe('opus-next')
    expect(map.get('/se/lead@lead-run')?.values.llmModelIdentifier).toBe('opus-next')
    expect(map.get('/se/cr@cr-run')?.values.llmModelIdentifier).toBe('haiku')
    expect(map.get('/se/ie@ie-run')?.values.llmModelIdentifier).toBe('sol-6.1')
    expect(map.get('/se@se-copy')?.delegated?.original.llmModelIdentifier).toBe('sonnet')
  })

  it('a copy of a configured Team placement: members follow its Team as recorded in its source (AR-003, D-5)', () => {
    const team = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/w' }
    const own = { ...team, llmModelIdentifier: 'opus-own' }
    const configured = { origin: 'configured' as const, fallbacks: [] }
    const nodes = delegatedRowsByKey(collaborationDelegatedLaunchNodes({
      taskExecutions: [{ address: '/target', teamRunId: 'copy', startedAt: at, taskExecutions: [], userTeamLaunchSelection: { llmModelIdentifier: 'sonnet', llmConfig: null, selectedAt: at },
        members: [{ address: '/target/lead', agentRunId: 'l', platformAgentRunId: null }, { address: '/target/writer', agentRunId: 'w', platformAgentRunId: null }],
        source: { kind: 'agent_team', teamDefinitionId: 'target', coordinatorAddress: '/target/lead', handoffs: [],
          defaultLaunchConfiguration: team, defaultLaunchSource: configured,
          members: [
            { address: '/target/lead', agentDefinitionId: 'lead', launchConfiguration: team, followsTeam: true },
            { address: '/target/writer', agentDefinitionId: 'writer', launchConfiguration: own, followsTeam: false },
          ] } }],
    }, deps, control()))
    expect(nodes.get('/target/lead@l')?.values.llmModelIdentifier).toBe('sonnet')
    expect(nodes.get('/target/writer@w')?.values.llmModelIdentifier).toBe('opus-own')
    // The member without a choice shows its recorded origin.
    expect(nodes.get('/target/writer@w')?.sourceKey).toBe('configured')
  })
})
