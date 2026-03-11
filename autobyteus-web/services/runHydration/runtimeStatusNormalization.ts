import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

const AGENT_STATUS_VALUES = new Set(Object.values(AgentStatus));
const TEAM_STATUS_VALUES = new Set(Object.values(AgentTeamStatus));

const normalizeToken = (status?: string | null): string =>
  String(status || '')
    .trim()
    .toLowerCase();

export const normalizeAgentRuntimeStatus = (
  status?: string | null,
  fallback: AgentStatus = AgentStatus.Uninitialized,
): AgentStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) {
    return fallback;
  }

  if (AGENT_STATUS_VALUES.has(normalized as AgentStatus)) {
    return normalized as AgentStatus;
  }

  switch (normalized) {
    case 'active':
    case 'processing':
    case 'running':
      return AgentStatus.ProcessingUserInput;
    case 'idle':
      return AgentStatus.Idle;
    case 'error':
      return AgentStatus.Error;
    case 'bootstrapping':
      return AgentStatus.Bootstrapping;
    case 'uninitialized':
      return AgentStatus.Uninitialized;
    case 'shutdown_complete':
    case 'offline':
    case 'terminated':
      return AgentStatus.ShutdownComplete;
    case 'shutting_down':
      return AgentStatus.ShuttingDown;
    default:
      return fallback;
  }
};

export const normalizeTeamRuntimeStatus = (
  status?: string | null,
  fallback: AgentTeamStatus = AgentTeamStatus.Uninitialized,
): AgentTeamStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) {
    return fallback;
  }

  if (TEAM_STATUS_VALUES.has(normalized as AgentTeamStatus)) {
    return normalized as AgentTeamStatus;
  }

  switch (normalized) {
    case 'active':
    case 'processing':
    case 'running':
      return AgentTeamStatus.Processing;
    case 'idle':
      return AgentTeamStatus.Idle;
    case 'error':
      return AgentTeamStatus.Error;
    case 'bootstrapping':
      return AgentTeamStatus.Bootstrapping;
    case 'uninitialized':
      return AgentTeamStatus.Uninitialized;
    case 'shutdown_complete':
    case 'offline':
    case 'terminated':
      return AgentTeamStatus.ShutdownComplete;
    case 'shutting_down':
      return AgentTeamStatus.ShuttingDown;
    default:
      return fallback;
  }
};
