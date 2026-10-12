import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { collaborationDelegatedLaunchRows, teamDelegatedLaunchRows } from '../delegatedLaunchRows'

const created = '2026-10-12T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }
const fallback = { layer: 'agent_default' as const, runtime_kind: 'codex_app_server', llm_model_identifier: 'sol-6.1', reason: 'runtime_unavailable' as const, detail: 'no codex' }

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/pm',
    default_launch_configuration: claude,
    members: [{ kind: 'configured_agent', address: '/pm', agent_definition_id: 'pm', role: null, description: null, agent_run_id: 'pm-run', platform_agent_run_id: null, launch_configuration: claude }],
    collaborators: [{
      kind: 'agent', address: '/writer', agent_definition_id: 'writer', agent_run_id: 'writer-run', platform_agent_run_id: null,
      launch_configuration: claude, added_at: created, added_via_agent_run_id: 'pm-run',
    }],
    task_executions: [
      {
        kind: 'task_team', address: '/se', team_run_id: 'se-copy', delegator_agent_run_id: 'pm-run', started_at: created, task_executions: [],
        members: [
          { kind: 'task_team_agent', address: '/se/lead', agent_run_id: 'lead-run', platform_agent_run_id: null },
          { kind: 'task_team_agent', address: '/se/ie', agent_run_id: 'ie-run', platform_agent_run_id: null },
          { kind: 'task_team_agent', address: '/se/cr', agent_run_id: 'cr-run', platform_agent_run_id: null },
        ],
        source: {
          kind: 'agent_team', team_definition_id: 'se', coordinator_address: '/se/lead', handoffs: [],
          default_launch_configuration: claude, default_launch_source: { origin: 'inherited', fallbacks: [] },
          members: [
            { address: '/se/lead', agent_definition_id: 'lead' },
            { address: '/se/ie', agent_definition_id: 'ie', launch_configuration: codex, launch_source: { origin: 'agent_default', fallbacks: [] } },
            { address: '/se/cr', agent_definition_id: 'cr', launch_source: { origin: 'inherited', fallbacks: [fallback] } },
          ],
        },
      },
      { kind: 'task_agent', address: '/pm', agent_run_id: 'pm-copy', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: created },
      { kind: 'task_agent', address: '/closed', agent_run_id: 'closed-run', platform_agent_run_id: null, delegator_agent_run_id: 'pm-run', started_at: created,
        source: { kind: 'agent', agent_definition_id: 'x', launch_configuration: claude } },
    ],
  },
})

describe('delegatedLaunchRows (REQ-007, AC-010)', () => {
  it('Team root: collaborators and open copies, each agent with its runtime, model, source and fallbacks', () => {
    const rows = teamDelegatedLaunchRows(tree(), [{ agentRunId: 'closed-run' }])
    expect(rows.map((row) => [row.address, row.entry, row.member, row.runtimeKind, row.llmModelIdentifier, row.source])).toEqual([
      ['/writer', 'collaborator', false, 'claude_agent_sdk', 'opus', 'not_recorded'],
      ['/se', 'copy', false, 'claude_agent_sdk', 'opus', 'inherited'],
      ['/se/lead', 'copy', true, 'claude_agent_sdk', 'opus', 'inherited'],
      ['/se/ie', 'copy', true, 'codex_app_server', 'sol-6.1', 'agent_default'],
      ['/se/cr', 'copy', true, 'claude_agent_sdk', 'opus', 'inherited'],
      // A copy of a configured placement runs as that placement is configured.
      ['/pm', 'copy', false, 'claude_agent_sdk', 'opus', 'configured'],
    ])
    expect(rows.find((row) => row.address === '/se/cr')!.fallbacks).toEqual([
      { layer: 'agent_default', runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', detail: 'no codex' },
    ])
  })

  it('Org and Agent roots (camelCase): the same rules, with a launch lookup for copies without a recorded source', () => {
    const camel = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const rows = collaborationDelegatedLaunchRows({
      collaborators: [{
        kind: 'agent_team', address: '/se', teamDefinitionId: 'se', teamRunId: 'se-run', coordinatorAddress: '/se/lead', handoffs: [],
        members: [
          { address: '/se/lead', agentDefinitionId: 'lead', agentRunId: 'l', platformAgentRunId: null },
          { address: '/se/ie', agentDefinitionId: 'ie', agentRunId: 'i', platformAgentRunId: null,
            launchConfiguration: { ...camel, llmModelIdentifier: 'sol-6.1' }, launchSource: { origin: 'agent_default', fallbacks: [] } },
        ],
        defaultLaunchConfiguration: camel, defaultLaunchSource: { origin: 'team_default', fallbacks: [] },
        taskExecutions: [], addedAt: created, addedViaAgentRunId: 'h',
      }],
      taskExecutions: [{ address: '/se', agentRunId: 'extra', platformAgentRunId: null, startedAt: created } as never],
      launchAt: (address) => address === '/se' ? camel : null,
    })
    expect(rows.map((row) => [row.address, row.llmModelIdentifier, row.source])).toEqual([
      ['/se', 'opus', 'team_default'], ['/se/lead', 'opus', 'team_default'], ['/se/ie', 'sol-6.1', 'agent_default'], ['/se', 'opus', 'configured'],
    ])
  })
})
