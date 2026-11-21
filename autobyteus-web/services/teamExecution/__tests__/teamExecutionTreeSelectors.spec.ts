import { describe, expect, it } from 'vitest';
import type { TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';
import type { AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { findConfiguredAgentByAddress, projectNavigationRows } from '../teamExecutionTreeSelectors';

const launch = { runtime_kind: 'autobyteus' as const, llm_model_identifier: 'provider:model', llm_config: null, auto_execute_tools: false, workspace_root_path: null };
const member = (address: string, agentRunId: string, leaving?: true) => ({
  kind: 'configured_agent' as const, address, agent_definition_id: `${agentRunId}-definition`, role: null, description: null,
  agent_run_id: agentRunId, platform_agent_run_id: null, launch_configuration: launch, ...(leaving ? { leaving } : {}),
});
/** A Team whose /writer was swapped for another agent while the old writer finishes its turn (DEC-006). */
const tree = (): TeamRunExecutionTreeDto => ({
  created_at: '2026-11-21T00:00:00.000Z', archived_at: null, application_binding: null, handoffs: [],
  root_team: {
    address: '/', team_definition_id: 'team', team_definition_name: 'Team', team_run_id: 'team-1', coordinator_address: '/writer',
    default_launch_configuration: launch,
    members: [member('/writer', 'old-writer', true), member('/writer', 'new-writer')],
  },
}) as TeamRunExecutionTreeDto;

describe('teamExecutionTreeSelectors with a leaving member', () => {
  it('finds the current member at an address a leaving member still has', () => {
    expect(findConfiguredAgentByAddress(tree(), '/writer' as AgentTeamAddress)?.agent_run_id).toBe('new-writer');
  });

  it('never marks the leaving member\'s row as the coordinator', () => {
    const rows = projectNavigationRows({ tree: tree(), contexts: new Map() });
    expect(rows.map((row) => [row.agentRunId, row.coordinator])).toEqual([
      [null, false], ['old-writer', false], ['new-writer', true]]);
  });
});
