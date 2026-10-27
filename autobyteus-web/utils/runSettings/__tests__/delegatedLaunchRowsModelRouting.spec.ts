import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import type { RemoteTaskExecutionDto } from '@autobyteus/agent-presentation-contracts'
import { agentRunIdsOf, remoteDelegatedLaunchNodes, teamDelegatedLaunchNodes } from '../delegatedLaunchRows'

/**
 * autobyteus-32 REQ-009 / VIS-016, VIS-017: run Settings rows of copies the Model Router chose for (source "Model
 * Router", its task kind, its reason and where its decision is), and read-only rows of copies another node runs, with
 * that node's launches. Synthesized trees.
 */
const deps = { schemaFor: () => null, sameWorkspace: () => true }
const created = '2026-10-26T09:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'sonnet', llm_config: null, auto_execute_tools: true, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'gpt-sol' }
const routed = { origin: 'model_router' as const, choice_reason: 'Codex fits a server change.', task_kind: 'implementation',
  fallbacks: [
    { layer: 'agent_default' as const, runtime_kind: 'claude_agent_sdk', llm_model_identifier: 'opus', reason: 'blocked' as const, detail: 'opus is blocked.' },
  ] }

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude,
    members: [{ kind: 'configured_agent', address: '/pm', agent_definition_id: 'pm', role: null, description: null, agent_run_id: 'pm-run', platform_agent_run_id: null, launch_configuration: claude }],
    task_executions: [{
      kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: created, task_executions: [],
      members: [
        { kind: 'task_team_agent', address: '/se/sd', agent_run_id: 'sd-run', platform_agent_run_id: null },
        { kind: 'task_team_agent', address: '/se/ie', agent_run_id: 'ie-run', platform_agent_run_id: null },
      ],
      source: {
        kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/sd', handoffs: [],
        default_launch_configuration: claude, default_launch_source: { origin: 'inherited', fallbacks: [] },
        members: [
          { address: '/se/sd', agent_definition_id: 'sd', launch_configuration: claude, follows_team: false, launch_source: { origin: 'agent_default', fallbacks: [] } },
          { address: '/se/ie', agent_definition_id: 'ie', launch_configuration: codex, follows_team: false, launch_source: routed },
        ],
      },
    }],
  },
})

describe('run Settings rows with Model Routing (autobyteus-32)', () => {
  it('a routed member says "Model Router" with its task kind and reason, and where its decision is; its skipped default stays a note', () => {
    const [team] = teamDelegatedLaunchNodes(tree(), [], deps)
    const ie = team!.children.find((child) => child.key === '/se/ie@ie-run')!
    expect(ie.sourceKey).toBe('model_router')
    expect(ie.routing).toEqual({ decision: { runId: 'pm-run', copy: '/se', agent: '/se/ie' }, taskKind: 'implementation', reason: 'Codex fits a server change.' })
    expect(ie.launchNotes).toEqual([{ kind: 'fallback', layer: 'agent_default', runtimeKind: 'claude_agent_sdk', llmModelIdentifier: 'opus', detail: 'opus is blocked.' }])
    expect(team!.children.find((child) => child.key === '/se/sd@sd-run')!.routing).toBeUndefined()
  })

  it('a user\'s model choice hides the origin and the router\'s reason (SR-007)', () => {
    const control = { editable: true, isAgentLive: () => false, isStopping: () => false,
      draftOf: (target: string) => (target === 'agent:ie-run' ? { llmModelIdentifier: 'gpt-mini', llmConfig: null } : null) }
    const [team] = teamDelegatedLaunchNodes(tree(), [], deps, control)
    const ie = team!.children.find((child) => child.key === '/se/ie@ie-run')!
    expect(ie.sourceKey).toBeUndefined()
    expect(ie.routing).toBeUndefined()
  })

  it('copies another node runs: read-only rows with that node\'s launches and name; no "View decision"; old links without launches show nothing', () => {
    const remote: RemoteTaskExecutionDto[] = [
      { kind: 'agent_team', address: '/marketing', team_run_id: 'mkt', node_id: 'srv_b', node_name: 'docker', coordinator_address: '/marketing/lead',
        members: [{ address: '/marketing/lead', agent_run_id: 'lead_b' }, { address: '/marketing/writer', agent_run_id: 'writer_b' }],
        delegator_agent_run_id: 'pm-run', started_at: created,
        launches: [
          { address: '/marketing/lead', runtime_kind: 'antigravity_cli', llm_model_identifier: 'gemini', source: { origin: 'agent_default', fallbacks: [] } },
          { address: '/marketing/writer', runtime_kind: 'antigravity_cli', llm_model_identifier: 'gemini',
            source: { origin: 'model_router', fallbacks: [], choice_reason: 'Writing goes to Antigravity.', task_kind: 'writing' } },
        ] },
      { kind: 'agent', address: '/old', agent_run_id: 'old_b', node_id: 'srv_b', node_name: 'docker', delegator_agent_run_id: 'pm-run', started_at: created },
    ]
    const rows = remoteDelegatedLaunchNodes(remote, deps)
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ kind: 'team', remoteNode: 'docker', badge: 'delegated_copy', locked: { model: true } })
    expect(rows[0]!.children.map((child) => [child.name, child.values.runtimeKind, child.sourceKey, child.routing?.reason ?? null, child.routing?.decision ?? null])).toEqual([
      ['lead', 'antigravity_cli', 'agent_default', null, null],
      ['writer', 'antigravity_cli', 'model_router', 'Writing goes to Antigravity.', null],
    ])
    expect(rows[0]!.children[0]!.isCoordinator).toBe(true)
  })

  it('a Team or Org root\'s agent run IDs (both casings) find the remote runs its agents delegated', () => {
    expect([...agentRunIdsOf(tree())].sort()).toEqual(['ie-run', 'pm-run', 'sd-run'])
    expect([...agentRunIdsOf({ rootOrg: { members: [{ agentRunId: 'director' }] } })]).toEqual(['director'])
  })
})
