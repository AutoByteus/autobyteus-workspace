import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

const normalizeToken = (status?: string | null): string =>
  String(status || '')
    .trim()
    .toLowerCase()
    .replace(/[_\s-]+/g, '_');

export const normalizeAgentRuntimeStatus = (
  status?: string | null,
  fallback: AgentStatus = AgentStatus.Offline,
): AgentStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) return fallback;
  if (normalized === AgentStatus.Error) return AgentStatus.Error;
  if (normalized === AgentStatus.Initializing) return AgentStatus.Initializing;
  if (normalized === AgentStatus.Running || normalized === 'active') return AgentStatus.Running;
  if (normalized === AgentStatus.Idle) return AgentStatus.Idle;
  if (normalized === AgentStatus.Offline || normalized === 'terminated') return AgentStatus.Offline;
  return fallback;
};

export const normalizeTeamRuntimeStatus = (
  status?: string | null,
  fallback: AgentTeamStatus = AgentTeamStatus.Offline,
): AgentTeamStatus => {
  const normalized = normalizeToken(status);
  if (!normalized) return fallback;
  if (normalized === AgentTeamStatus.Error) return AgentTeamStatus.Error;
  if (normalized === AgentTeamStatus.Initializing) return AgentTeamStatus.Initializing;
  if (normalized === AgentTeamStatus.Running || normalized === 'active') return AgentTeamStatus.Running;
  if (normalized === AgentTeamStatus.Idle) return AgentTeamStatus.Idle;
  if (normalized === AgentTeamStatus.Offline || normalized === 'terminated') return AgentTeamStatus.Offline;
  return fallback;
};
