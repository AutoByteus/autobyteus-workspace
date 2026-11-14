import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import {
  collaborationDelegatedLaunchNodes,
  delegatedRowsByKey,
  teamDelegatedLaunchNodes,
  type DelegatedRowControl,
} from '../delegatedLaunchRows'

/**
 * DS-004 (SR-007), autobyteus-461 CR-461-007: copy rows show the launch each run has, with this edit's unsaved choices
 * applied by the draft rule; a row with a choice shows no origin; a stopped copy's model and settings are editable, a
 * running one is locked and carries the stop target on the copy itself.
 */
const deps = { schemaFor: () => null, sameWorkspace: () => true }
const at = '2026-10-13T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: at, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude,
    members: [{ kind: 'configured_agent', address: '/pm', agent_definition_id: 'pm', role: null, description: null, agent_run_id: 'pm-run', platform_agent_run_id: null, launch_configuration: claude }],
    task_executions: [{
      kind: 'task_agent', address: '/writer', agent_run_id: 'writer-run', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: at,
      source: { kind: 'agent', agent_definition_id: 'writer', launch_configuration: claude, launch_source: { origin: 'agent_default', fallbacks: [] } },
    }, {
      kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: at, task_executions: [],
      members: [
        { kind: 'task_team_agent', address: '/se/lead', agent_run_id: 'lead-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/ie', agent_run_id: 'ie-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/cr', agent_run_id: 'cr-run', platform_agent_run_id: null },
      ],
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/lead', handoffs: [],
        default_launch_configuration: claude, default_launch_source: { origin: 'inherited', fallbacks: [] },
        members: [
          { address: '/se/lead', agent_definition_id: 'lead', launch_configuration: claude },
          { address: '/se/ie', agent_definition_id: 'ie', launch_configuration: codex, launch_source: { origin: 'agent_default', fallbacks: [] } },
          { address: '/se/cr', agent_definition_id: 'cr', launch_configuration: claude },
        ],
      },
    }],
  },
})

const control = (overrides: Partial<DelegatedRowControl> = {}): DelegatedRowControl => ({
  editable: true, isAgentLive: () => false, isStopping: () => false, draftOf: () => null, storedOf: () => null, ...overrides,
})
const rows = (input: Partial<DelegatedRowControl> = {}) => delegatedRowsByKey(teamDelegatedLaunchNodes(tree(), deps, control(input)))

describe('copy rows and this edit\'s choices (SR-007)', () => {
  it('show each row the launch its run has', () => {
    const map = rows()
    expect(map.get('/writer@writer-run')).toMatchObject({ values: { llmModelIdentifier: 'opus' },
      delegated: { target: 'agent:writer-run', stop: { agentRunId: 'writer-run' }, running: false, original: { llmModelIdentifier: 'opus' } } })
    expect(map.get('/se@se-copy')).toMatchObject({ values: { llmModelIdentifier: 'opus' },
      delegated: { target: 'team:se-copy', stop: { teamRunId: 'se-copy' } } })
    expect(map.get('/se/lead@lead-run')?.values.llmModelIdentifier).toBe('opus')
    expect(map.get('/se/ie@ie-run')?.values).toMatchObject({ runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1' })
    // A Team member has no stop of its own: the Team copy stops as one unit.
    expect(map.get('/se/lead@lead-run')?.delegated?.stop).toBeNull()
  })

  it('CR-461-077: a row saved in this Settings session shows what its run now has (its own save answer), and edits start from it', () => {
    const saved = { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku-saved', llmConfig: null }, ownSource: true }
    const map = rows({ storedOf: (target) => target === 'agent:writer-run' ? saved : null })
    expect(map.get('/writer@writer-run')?.delegated?.original).toMatchObject({ llmModelIdentifier: 'haiku-saved' })
    expect(JSON.stringify(map.get('/writer@writer-run'))).toContain('haiku-saved')
    // Another row keeps its record's launch.
    expect(JSON.stringify(map.get('/se/ie@ie-run'))).not.toContain('haiku-saved')
  })

  it('CR-461-086: each row shows its run\'s launch and origin as its own file has them now (read from the run), not its record\'s', () => {
    const stored = {
      // An agent run saved from Settings: its own thinking and the `settings` origin (no origin text, V-11).
      'agent:writer-run': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: { reasoning_effort: 'xhigh' } }, source: { origin: 'settings' as const, fallbacks: [] }, ownSource: true },
      // A team member saved from Settings: its own launch; the Team keeps its default.
      'agent:ie-run': { launch: { runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', llmConfig: { reasoning_effort: 'xhigh' } }, source: { origin: 'settings' as const, fallbacks: [] }, ownSource: true },
      // A member whose run has no source of its own: its Team's, as the run has it.
      'agent:lead-run': { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', llmConfig: null }, source: { origin: 'configured' as const, fallbacks: [] }, ownSource: false },
    } as const
    const map = rows({ storedOf: (target) => (stored as Record<string, unknown>)[target] as never ?? null })
    expect(map.get('/writer@writer-run')?.values.llmConfig).toEqual({ reasoning_effort: 'xhigh' })
    expect(map.get('/writer@writer-run')?.sourceKey).toBe('settings')
    expect(map.get('/se/ie@ie-run')?.values.llmConfig).toEqual({ reasoning_effort: 'xhigh' })
    expect(map.get('/se/ie@ie-run')?.sourceKey).toBe('settings')
    expect(map.get('/se/lead@lead-run')?.sourceKey).toBe('configured')
    // A run not read yet keeps its record's launch and origin.
    expect(map.get('/se@se-copy')?.values.llmModelIdentifier).toBe('opus')
    // Only the save answer known so far: its launch, and its record's origin until the run is read.
    const answered = rows({ storedOf: (target) => target === 'agent:writer-run' ? { launch: { runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'haiku', llmConfig: null }, ownSource: true } : null })
    expect(answered.get('/writer@writer-run')?.values.llmModelIdentifier).toBe('haiku')
    expect(answered.get('/writer@writer-run')?.sourceKey).toBe('agent_default')
  })

  it('hide the origin once a choice applies and keep it otherwise', () => {
    expect(rows().get('/writer@writer-run')?.sourceKey).toBe('agent_default')
    const map = rows({ draftOf: (target) => target === 'agent:writer-run' ? { llmModelIdentifier: 'haiku', llmConfig: null } : null })
    expect(map.get('/writer@writer-run')?.sourceKey).toBeUndefined()
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

  it('apply this edit\'s choices: a Team draft is its Team\'s default only (CR-461-089): each member keeps its own launch; originals stay what ran', () => {
    const draft = { llmModelIdentifier: 'opus-next', llmConfig: null }
    const map = rows({ draftOf: (target) => target === 'team:se-copy' ? draft : null })
    expect(map.get('/se@se-copy')?.values.llmModelIdentifier).toBe('opus-next')
    expect(map.get('/se/lead@lead-run')?.values.llmModelIdentifier).toBe('opus')
    expect(map.get('/se/cr@cr-run')?.values.llmModelIdentifier).toBe('opus')
    expect(map.get('/se/ie@ie-run')?.values.llmModelIdentifier).toBe('sol-6.1')
    expect(map.get('/se@se-copy')?.delegated?.original.llmModelIdentifier).toBe('opus')
    // An agent's own draft is its own.
    const own = rows({ draftOf: (target) => target === 'team:se-copy' ? draft : target === 'agent:cr-run' ? { llmModelIdentifier: 'haiku', llmConfig: null } : null })
    expect(own.get('/se/cr@cr-run')?.values.llmModelIdentifier).toBe('haiku')
  })

  it('a copy of a configured Team placement: a Team draft changes no member, whether it took its Team\'s launch at start or not (CR-461-089)', () => {
    const team = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: '/w' }
    const own = { ...team, llmModelIdentifier: 'opus-own' }
    const configured = { origin: 'configured' as const, fallbacks: [] }
    const nodes = delegatedRowsByKey(collaborationDelegatedLaunchNodes({
      taskExecutions: [{ address: '/target', teamRunId: 'copy', startedAt: at, taskExecutions: [],
        members: [{ address: '/target/lead', agentRunId: 'l', platformAgentRunId: null }, { address: '/target/writer', agentRunId: 'w', platformAgentRunId: null }],
        source: { kind: 'agent_team', teamDefinitionId: 'target', coordinatorAddress: '/target/lead', handoffs: [],
          defaultLaunchConfiguration: team, defaultLaunchSource: configured,
          members: [
            { address: '/target/lead', agentDefinitionId: 'lead', launchConfiguration: team },
            { address: '/target/writer', agentDefinitionId: 'writer', launchConfiguration: own },
          ] } }],
    }, deps, control({ draftOf: (target) => target === 'team:copy' ? { llmModelIdentifier: 'sonnet', llmConfig: null } : null })))
    expect(nodes.get('/target/lead@l')?.values.llmModelIdentifier).toBe('opus')
    expect(nodes.get('/target/writer@w')?.values.llmModelIdentifier).toBe('opus-own')
    // The member without a choice shows its recorded origin.
    expect(nodes.get('/target/writer@w')?.sourceKey).toBe('configured')
  })
})
