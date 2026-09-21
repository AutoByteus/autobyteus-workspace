import { AgentStatus } from '~/types/agent/AgentStatus';

export type TeamStatusAuthority = 'live' | 'historical';

const statusRank: Readonly<Record<AgentStatus, number>> = Object.freeze({
  [AgentStatus.Offline]: 0,
  [AgentStatus.Idle]: 1,
  [AgentStatus.Error]: 2,
  [AgentStatus.Initializing]: 3,
  [AgentStatus.Running]: 4,
});

const normalizeAgentStatus = (
  status: AgentStatus | string | null | undefined,
  authority: TeamStatusAuthority,
): AgentStatus => {
  const normalized = typeof status === 'string' ? status.trim().toLowerCase() : '';
  if (normalized === AgentStatus.Running || normalized === AgentStatus.Initializing) {
    return authority === 'live' ? normalized : AgentStatus.Offline;
  }
  if (normalized === AgentStatus.Error) return AgentStatus.Error;
  if (normalized === AgentStatus.Idle) return AgentStatus.Idle;
  return AgentStatus.Offline;
};

export const foldTeamAggregateStatus = (
  statuses: readonly (AgentStatus | string | null | undefined)[],
  authority: TeamStatusAuthority,
): AgentStatus => {
  let aggregate = AgentStatus.Offline;
  for (const candidate of statuses) {
    const status = normalizeAgentStatus(candidate, authority);
    if (statusRank[status] > statusRank[aggregate]) aggregate = status;
    if (aggregate === AgentStatus.Running) break;
  }
  return aggregate;
};
