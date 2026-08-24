import type { AgentStatus } from '~/types/agent/AgentStatus';

export const workspaceStatusDotBaseClass = 'inline-block h-2 w-2 flex-shrink-0 rounded-full';
export const workspaceTransientStatusDotBaseClass = 'inline-block h-2.5 w-2.5 flex-shrink-0';
export type WorkspaceStatusDotVariant = 'solid' | 'transient';

const normalizeStatus = (status: AgentStatus | string | null | undefined): string => (
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
      return 'text-amber-700';
    case 'running':
      return 'text-blue-700';
    case 'idle':
      return 'text-green-700';
    case 'error':
      return 'text-red-700';
    case 'offline':
      return 'text-gray-600';
    default:
      return fallbackClass;
  }
};

export const agentStatusDotClass = (
  status: AgentStatus | string | null | undefined,
): string => statusDotClassByValue(normalizeStatus(status), 'bg-gray-400');

export const agentTransientStatusDotClass = (
  status: AgentStatus | string | null | undefined,
): string => transientStatusDotClassByValue(
  normalizeStatus(status),
  'text-gray-600',
);
