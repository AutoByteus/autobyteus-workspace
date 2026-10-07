import { foldTeamAggregateStatus as foldSharedTeamAggregateStatus, type TeamStatusAuthority } from '@autobyteus/collaboration-stream-contracts';
import type { AgentStatus } from '~/types/agent/AgentStatus';

export type { TeamStatusAuthority };

/** The shared team status rule (`@autobyteus/collaboration-stream-contracts`), typed as the web's AgentStatus. */
export const foldTeamAggregateStatus = (
  statuses: readonly (AgentStatus | string | null | undefined)[],
  authority: TeamStatusAuthority,
): AgentStatus => foldSharedTeamAggregateStatus(statuses, authority) as AgentStatus;
