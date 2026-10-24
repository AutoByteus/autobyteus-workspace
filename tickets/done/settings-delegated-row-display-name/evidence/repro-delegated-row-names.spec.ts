// TEMPORARY reproduction probe (autobyteus-208); not committed in the test tree.
import { describe, expect, it } from 'vitest'
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts'
import { collaborationDelegatedLaunchNodes, teamDelegatedLaunchNodes } from '../delegatedLaunchRows'
import { readsAsDisplayName } from '~/services/teamExecution/teamExecutionTreeSelectors'
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName'
import { memberAddressBasename } from '~/types/agent/AgentTeamAddress'
import type { RunMemberNode } from '../runMemberTree'

const deps = { schemaFor: () => null, sameWorkspace: () => true }
const created = '2026-10-12T00:00:00.000Z'
const claude = { runtime_kind: 'claude_agent_sdk' as const, llm_model_identifier: 'opus', llm_config: null, auto_execute_tools: false, workspace_root_path: '/w' }
const names = (nodes: readonly RunMemberNode[]): Array<[string, string]> =>
  nodes.flatMap((node) => [[node.key, node.name] as [string, string], ...names(node.children)])

const tree = (): TeamRunExecutionTreeDto => ({
  created_at: created, archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'pm', team_definition_name: 'PM', team_run_id: 'root', coordinator_address: '/code_reviewer',
    default_launch_configuration: claude,
    members: [{ kind: 'configured_agent', address: '/code_reviewer', agent_definition_id: 'cr', role: null, description: null, agent_run_id: 'cr-run', platform_agent_run_id: null, launch_configuration: claude }],
    task_executions: [
      // A catalog copy (not a configured member): the sidebar and conversation read "scribe 5083".
      { kind: 'task_agent', address: '/scribe_5083', agent_run_id: 'scribe-run', platform_agent_run_id: null, delegator_agent_run_id: 'cr-run', started_at: created,
        source: { kind: 'agent', agent_definition_id: 'scribe', launch_configuration: claude } },
      // A copy of the configured member keeps its address basename ("code_reviewer").
      { kind: 'task_agent', address: '/code_reviewer', agent_run_id: 'cr-copy', platform_agent_run_id: null, delegator_agent_run_id: 'cr-run', started_at: created,
        source: { kind: 'agent', agent_definition_id: 'cr', launch_configuration: claude, launch_source: { origin: 'configured', fallbacks: [] } } },
    ],
  },
})
const sidebarName = (address: string) => readsAsDisplayName(tree(), address) ? memberDisplayName(address) : memberAddressBasename(address)

describe('probe: Settings delegated rows use the sidebar name', () => {
  it('Team root', () => {
    expect(names(teamDelegatedLaunchNodes(tree(), [], deps))).toEqual([
      ['/scribe_5083@scribe-run', sidebarName('/scribe_5083')],
      ['/code_reviewer@cr-copy', sidebarName('/code_reviewer')],
    ])
  })
  it('Org and Agent roots', () => {
    const camel = { runtimeKind: 'claude_agent_sdk' as const, llmModelIdentifier: 'opus', llmConfig: null, autoExecuteTools: false, workspaceRootPath: null }
    const nodes = collaborationDelegatedLaunchNodes({ taskExecutions: [
      { address: '/scribe_5083', agentRunId: 'scribe-run', platformAgentRunId: null, startedAt: created,
        source: { kind: 'agent', agentDefinitionId: 'scribe', launchConfiguration: camel } },
    ] }, deps)
    expect(names(nodes)).toEqual([['/scribe_5083@scribe-run', memberDisplayName('/scribe_5083')]])
  })
})
