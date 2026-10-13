import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { collaborationDelegatedLaunchNodes, teamDelegatedLaunchNodes } from '../delegatedLaunchRows'
import { countRunMemberNotes, type RunMemberNode } from '../runMemberTree'

const deps = { schemaFor: () => null, sameWorkspace: () => true }
const flat = (nodes: readonly RunMemberNode[], depth = 0): Array<[string, number, string | undefined, string | undefined, string, string]> =>
  nodes.flatMap((node) => [[node.key, depth, node.badge, node.sourceKey, node.values.runtimeKind, node.values.llmModelIdentifier] as [string, number, string | undefined, string | undefined, string, string], ...flat(node.children, depth + 1)])

const created = '2026-10-12T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const codex = { ...claude, runtime_kind: 'codex_app_server' as const, llm_model_identifier: 'sol-6.1' }
const teamFallback = { layer: 'team_default' as const, runtime_kind: 'grok_build', llm_model_identifier: 'grok-4', reason: 'runtime_unavailable' as const, detail: 'no grok' }
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
          default_launch_configuration: claude, default_launch_source: { origin: 'inherited', fallbacks: [teamFallback] },
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

describe('delegated launch nodes (REQ-007, AC-010, SR-006)', () => {
  it('Team root: one read-only row per collaborator and open copy; a Team copy has its agents as child rows', () => {
    const nodes = teamDelegatedLaunchNodes(tree(), [{ agentRunId: 'closed-run' }], deps)
    expect(flat(nodes)).toEqual([
      ['/writer@writer-run', 0, 'collaborator', 'not_recorded', 'claude_agent_sdk', 'opus'],
      ['/se@se-copy', 0, 'delegated_copy', 'inherited', 'claude_agent_sdk', 'opus'],
      ['/se/lead@lead-run', 1, undefined, 'inherited', 'claude_agent_sdk', 'opus'],
      ['/se/ie@ie-run', 1, undefined, 'agent_default', 'codex_app_server', 'sol-6.1'],
      ['/se/cr@cr-run', 1, undefined, 'inherited', 'claude_agent_sdk', 'opus'],
      // A copy of a configured placement runs as that placement is configured.
      ['/pm@pm-copy', 0, 'delegated_copy', 'configured', 'claude_agent_sdk', 'opus'],
    ])
    const team = nodes[1]!
    expect(team.kind).toBe('team')
    // Same shape as the run's own Members: the Team has its read-only settings card, its coordinator the chip.
    expect(team.fields).toEqual(['model', 'thinking', 'approval'])
    expect(team.children.find((child) => child.key === '/se/lead@lead-run')!.isCoordinator).toBe(true)
    expect(nodes.every((node) => !node.modelRequired && !Object.values(node.customized).some(Boolean))).toBe(true)
  })

  it('a Team-level fallback is noted once, on the Team row; a member\'s own fallback stays on the member', () => {
    const team = teamDelegatedLaunchNodes(tree(), [], deps).find((node) => node.key === '/se@se-copy')!
    expect(team.launchNotes).toEqual([{ kind: 'fallback', layer: 'team_default', runtimeKind: 'grok_build', llmModelIdentifier: 'grok-4', detail: 'no grok' }])
    const notesOf = (key: string) => team.children.find((child) => child.key === key)!.launchNotes
    expect(notesOf('/se/lead@lead-run')).toEqual([])
    expect(notesOf('/se/cr@cr-run')).toEqual([{ kind: 'fallback', layer: 'agent_default', runtimeKind: 'codex_app_server', llmModelIdentifier: 'sol-6.1', detail: 'no codex' }])
    expect(countRunMemberNotes(team)).toBe(2)
  })

  it('Org and Agent roots (camelCase): the same rules, with a launch lookup for copies without a recorded source', () => {
    const camel = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const nodes = collaborationDelegatedLaunchNodes({
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
      taskExecutions: [
        { address: '/se', agentRunId: 'extra', platformAgentRunId: null, startedAt: created } as never,
        { address: '/se', teamRunId: 'team-extra', members: [{ address: '/se/lead', agentRunId: 'l2', platformAgentRunId: null }], taskExecutions: [], startedAt: created } as never,
      ],
      launchAt: (address) => address === '/se' || address === '/se/lead' ? camel : null,
      coordinatorAt: (address) => address === '/se' ? '/se/lead' : null,
    }, deps)
    // A Team copy without a recorded source is led like the in-run Team at its address.
    expect(nodes.find((node) => node.key === '/se@team-extra')!.children[0]!.isCoordinator).toBe(true)
    expect(flat(nodes)).toEqual([
      ['/se@se-run', 0, 'collaborator', 'team_default', 'claude_agent_sdk', 'opus'],
      ['/se/lead@l', 1, undefined, 'team_default', 'claude_agent_sdk', 'opus'],
      ['/se/ie@i', 1, undefined, 'agent_default', 'claude_agent_sdk', 'sol-6.1'],
      ['/se@extra', 0, 'delegated_copy', 'configured', 'claude_agent_sdk', 'opus'],
      // A Team copy without a recorded source shows its in-run Team's launch (not an empty model).
      ['/se@team-extra', 0, 'delegated_copy', 'configured', 'claude_agent_sdk', 'opus'],
      ['/se/lead@l2', 1, undefined, 'configured', 'claude_agent_sdk', 'opus'],
    ])
  })
})
