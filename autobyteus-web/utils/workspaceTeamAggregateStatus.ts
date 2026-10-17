import { foldTeamAggregateStatus as foldSharedTeamAggregateStatus, type TeamStatusAuthority } from '@autobyteus/collaboration-stream-contracts';
import { AgentStatus } from '~/types/agent/AgentStatus';

export type { TeamStatusAuthority };

/** The universal status of a Team row: busy (running or starting), error, idle or offline. */
export type TeamStatus = AgentStatus.Running | AgentStatus.Error | AgentStatus.Idle | AgentStatus.Offline;

/**
 * The shared status fold (`@autobyteus/collaboration-stream-contracts`), typed as the web's AgentStatus.
 * Used to normalize a single agent's status; a Team row's status comes from `resolveTeamStatus`.
 */
export const foldTeamAggregateStatus = (
  statuses: readonly (AgentStatus | string | null | undefined)[],
  authority: TeamStatusAuthority,
): AgentStatus => foldSharedTeamAggregateStatus(statuses, authority) as AgentStatus;

/**
 * The universal Team status: the highest state among the counted agents,
 * busy (running or starting) > error > idle > offline. A Team in a run that is not alive is offline.
 */
export const resolveTeamStatus = (
  agentStatuses: readonly (AgentStatus | string | null | undefined)[],
  runAlive: boolean,
): TeamStatus => {
  if (!runAlive) return AgentStatus.Offline;
  const highest = foldSharedTeamAggregateStatus(agentStatuses, 'live');
  return (highest === 'initializing' ? AgentStatus.Running : highest) as TeamStatus;
};
