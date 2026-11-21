import type { ConfiguredAgentExecutionDto, TeamRunExecutionTreeDto } from '@autobyteus/team-stream-contracts';
import type { AgentContext } from '~/types/agent/AgentContext';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { memberAddressBasename, type AgentTeamAddress } from '~/types/agent/AgentTeamAddress';
import { memberDisplayName } from '~/utils/collaboration/memberDisplayName';
import type {
  TeamAgentExecutionLocation,
  TeamExecutionNavigationRow,
} from './teamExecutionViewModels';

export const agentRowKey = (agentRunId: string): string => `agent:${agentRunId}`;
export const teamRowKey = (teamRunId: string): string => `team:${teamRunId}`;

const firstSegment = (address: string): string | undefined => address.split('/').filter(Boolean)[0];

/**
 * F-03 / CR-002 (D-7): a catalog copy (and its members and copies) is not at a configured member of the
 * root Team, so it reads as a spaced name (`product team`) in rows and contexts. A configured member,
 * and every copy started from it, keeps its address basename; the root never reads as a display name.
 */
export const readsAsDisplayName = (tree: TeamRunExecutionTreeDto, address: string): boolean => {
  const segment = firstSegment(address);
  return segment !== undefined && !tree.root_team.members.some((member) => firstSegment(member.address) === segment);
};

/** The name a Team run shows for the agent or Team at `address` (F-03 / D-7): rows, contexts and Settings. */
export const teamMemberName = (tree: TeamRunExecutionTreeDto, address: string): string =>
  readsAsDisplayName(tree, address) ? memberDisplayName(address) : memberAddressBasename(address);

/** Teams are flat: the root Team's configured members are its Agents. */
export const collectConfiguredAgents = (
  tree: TeamRunExecutionTreeDto,
): readonly ConfiguredAgentExecutionDto[] => Object.freeze([...tree.root_team.members]);

/** Where each of the Team's own members runs: in the Team run (a run it delegated is its own, SR-084). */
export const collectAgentExecutionLocations = (
  tree: TeamRunExecutionTreeDto,
): readonly TeamAgentExecutionLocation[] => Object.freeze(tree.root_team.members.map((member) => Object.freeze({
  agentRunId: member.agent_run_id, memberAddress: member.address, containingTeamRunId: tree.root_team.team_run_id,
})));

/**
 * The member at `address`: the current one when a member that is leaving still has the same address (another agent
 * took its place in the definition); prefer run IDs wherever both can appear.
 */
export const findConfiguredAgentByAddress = (
  tree: TeamRunExecutionTreeDto,
  address: AgentTeamAddress,
): ConfiguredAgentExecutionDto | null => {
  const atAddress = collectConfiguredAgents(tree).filter((agent) => agent.address === address);
  return atAddress.find((agent) => !agent.leaving) ?? atAddress[0] ?? null;
};

/** The Team's own rows: the Team, then its members (the runs it delegated are its tree's rows, SR-084). */
export const projectNavigationRows = (input: {
  tree: TeamRunExecutionTreeDto;
  contexts: ReadonlyMap<string, AgentContext>;
}): readonly TeamExecutionNavigationRow[] => {
  const root = input.tree.root_team;
  const rootKey = teamRowKey(root.team_run_id);
  const status = (agentRunId: string): AgentStatus => input.contexts.get(agentRunId)?.state.currentStatus ?? AgentStatus.Offline;
  return Object.freeze([
    Object.freeze({
      key: rootKey, kind: 'configured_team' as const, address: '/' as AgentTeamAddress,
      displayName: root.team_definition_name, accessibleName: root.team_definition_name,
      depth: 0, parentKey: null, agentRunId: null, teamRunId: root.team_run_id,
      currentStatus: null, backgroundTasksRunning: 0, focusable: false, expandable: root.members.length > 0, coordinator: false,
      leaving: false,
    }),
    ...root.members.map((member) => {
      const label = teamMemberName(input.tree, member.address);
      return Object.freeze({
        key: agentRowKey(member.agent_run_id), kind: 'configured_agent' as const, address: member.address,
        displayName: label, accessibleName: label, depth: 1, parentKey: rootKey, agentRunId: member.agent_run_id,
        teamRunId: null, currentStatus: status(member.agent_run_id),
        backgroundTasksRunning: input.contexts.get(member.agent_run_id)?.state.backgroundTasksRunning ?? 0, focusable: true, expandable: false,
        coordinator: member.address === root.coordinator_address && member.leaving !== true,
        leaving: member.leaving === true,
      });
    }),
  ]);
};
