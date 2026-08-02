import { describe, expect, it } from 'vitest';
import {
  agentStatusDotClass,
  agentTransientStatusDotClass,
  workspaceTransientStatusDotBaseClass,
  workspaceStatusDotBaseClass,
} from '~/utils/workspaceStatusDotPresentation';
import { AgentStatus } from '~/types/agent/AgentStatus';

describe('workspaceStatusDotPresentation', () => {
  it('keeps the shared tiny workspace dot class shape', () => {
    expect(workspaceStatusDotBaseClass).toBe('inline-block h-2 w-2 flex-shrink-0 rounded-full');
    expect(workspaceTransientStatusDotBaseClass).toBe('inline-block h-2.5 w-2.5 flex-shrink-0');
  });

  it('maps agent statuses to the workspace tree dot colors', () => {
    expect(agentStatusDotClass(AgentStatus.Initializing)).toBe('bg-amber-500 animate-pulse');
    expect(agentStatusDotClass(AgentStatus.Running)).toBe('bg-blue-500 animate-pulse');
    expect(agentStatusDotClass(AgentStatus.Idle)).toBe('bg-green-500');
    expect(agentStatusDotClass(AgentStatus.Error)).toBe('bg-red-500');
    expect(agentStatusDotClass(AgentStatus.Offline)).toBe('bg-gray-400');
    expect(agentStatusDotClass('unexpected')).toBe('bg-gray-400');
  });

  it('maps transient statuses to darker SVG dot-ring colors without opacity pulsing', () => {
    expect(agentTransientStatusDotClass(AgentStatus.Running)).toBe('text-blue-700');
    expect(agentTransientStatusDotClass(AgentStatus.Idle)).toBe('text-green-700');
    expect(agentTransientStatusDotClass('unexpected')).toBe('text-gray-600');
  });
});
