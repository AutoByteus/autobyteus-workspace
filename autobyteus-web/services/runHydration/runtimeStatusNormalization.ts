import { AgentStatus } from '~/types/agent/AgentStatus';

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
