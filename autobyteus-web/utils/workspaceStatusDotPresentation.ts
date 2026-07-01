import type { AgentStatus } from '~/types/agent/AgentStatus';
import type { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

export const workspaceStatusDotBaseClass = 'inline-block h-2 w-2 flex-shrink-0 rounded-full';
export type WorkspaceStatusDotVariant = 'solid' | 'transient';

const normalizeStatus = (status: AgentStatus | AgentTeamStatus | string | null | undefined): string => (
  typeof status === 'string' ? status.trim().toLowerCase() : ''
);

const statusDotClassByValue = (status: string, fallbackClass: string): string => {
  switch (status) {
    case 'initializing':
      return 'bg-amber-500 animate-pulse';
    case 'running':
      return 'bg-blue-500 animate-pulse';
    case 'idle':
      return 'bg-green-500';
    case 'error':
      return 'bg-red-500';
    case 'offline':
      return 'bg-gray-400';
    default:
      return fallbackClass;
  }
};

const transientStatusDotClassByValue = (status: string, fallbackClass: string): string => {
  switch (status) {
    case 'initializing':
      return 'border border-dashed border-amber-500 bg-transparent animate-pulse';
    case 'running':
      return 'border border-dashed border-blue-500 bg-transparent animate-pulse';
    case 'idle':
      return 'border border-dashed border-green-500 bg-transparent';
    case 'error':
      return 'border border-dashed border-red-500 bg-transparent';
    case 'offline':
      return 'border border-dashed border-gray-400 bg-transparent';
    default:
      return fallbackClass;
  }
};

export const agentStatusDotClass = (
  status: AgentStatus | string | null | undefined,
): string => statusDotClassByValue(normalizeStatus(status), 'bg-gray-400');

export const teamStatusDotClass = (
  status: AgentTeamStatus | string | null | undefined,
): string => statusDotClassByValue(normalizeStatus(status), 'bg-gray-300');

export const agentTransientStatusDotClass = (
  status: AgentStatus | string | null | undefined,
): string => transientStatusDotClassByValue(
  normalizeStatus(status),
  'border border-dashed border-gray-400 bg-transparent',
);

export const teamTransientStatusDotClass = (
  status: AgentTeamStatus | string | null | undefined,
): string => transientStatusDotClassByValue(
  normalizeStatus(status),
  'border border-dashed border-gray-300 bg-transparent',
);
