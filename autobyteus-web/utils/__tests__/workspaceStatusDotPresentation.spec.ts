import { describe, expect, it } from 'vitest';
import {
  agentStatusDotClass,
  agentTransientStatusDotClass,
  teamStatusDotClass,
  teamTransientStatusDotClass,
  workspaceStatusDotBaseClass,
} from '~/utils/workspaceStatusDotPresentation';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

describe('workspaceStatusDotPresentation', () => {
  it('keeps the shared tiny workspace dot class shape', () => {
    expect(workspaceStatusDotBaseClass).toBe('inline-block h-2 w-2 flex-shrink-0 rounded-full');
  });

  it('maps agent statuses to the workspace tree dot colors', () => {
    expect(agentStatusDotClass(AgentStatus.Initializing)).toBe('bg-amber-500 animate-pulse');
    expect(agentStatusDotClass(AgentStatus.Running)).toBe('bg-blue-500 animate-pulse');
    expect(agentStatusDotClass(AgentStatus.Idle)).toBe('bg-green-500');
    expect(agentStatusDotClass(AgentStatus.Error)).toBe('bg-red-500');
    expect(agentStatusDotClass(AgentStatus.Offline)).toBe('bg-gray-400');
    expect(agentStatusDotClass('unexpected')).toBe('bg-gray-400');
  });

  it('maps team statuses conservatively with the existing team fallback', () => {
    expect(teamStatusDotClass(AgentTeamStatus.Initializing)).toBe('bg-amber-500 animate-pulse');
    expect(teamStatusDotClass(AgentTeamStatus.Running)).toBe('bg-blue-500 animate-pulse');
    expect(teamStatusDotClass(AgentTeamStatus.Idle)).toBe('bg-green-500');
    expect(teamStatusDotClass(AgentTeamStatus.Error)).toBe('bg-red-500');
    expect(teamStatusDotClass(AgentTeamStatus.Offline)).toBe('bg-gray-400');
    expect(teamStatusDotClass('unexpected')).toBe('bg-gray-300');
  });

  it('maps transient statuses to thick dotted hollow workspace tree dot colors', () => {
    expect(agentTransientStatusDotClass(AgentStatus.Running)).toBe('border-2 border-dotted border-blue-500 bg-transparent animate-pulse');
    expect(agentTransientStatusDotClass(AgentStatus.Idle)).toBe('border-2 border-dotted border-green-500 bg-transparent');
    expect(agentTransientStatusDotClass('unexpected')).toBe('border-2 border-dotted border-gray-400 bg-transparent');
    expect(teamTransientStatusDotClass(AgentTeamStatus.Error)).toBe('border-2 border-dotted border-red-500 bg-transparent');
    expect(teamTransientStatusDotClass('unexpected')).toBe('border-2 border-dotted border-gray-300 bg-transparent');
  });
});
