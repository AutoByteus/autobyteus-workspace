import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '../runtimeStatusNormalization';

describe('runtime status normalization', () => {
  it('preserves startup tokens as initializing for agents and teams', () => {
    for (const token of ['bootstrapping', 'uninitialized', 'starting', 'initializing']) {
      expect(normalizeAgentRuntimeStatus(token)).toBe(AgentStatus.Initializing);
      expect(normalizeTeamRuntimeStatus(token)).toBe(AgentTeamStatus.Initializing);
    }
  });

  it('keeps active processing and terminal tokens distinct from initializing', () => {
    expect(normalizeAgentRuntimeStatus('processing_user_input')).toBe(AgentStatus.Running);
    expect(normalizeAgentRuntimeStatus('idle')).toBe(AgentStatus.Idle);
    expect(normalizeAgentRuntimeStatus('inactive')).toBe(AgentStatus.Offline);
    expect(normalizeAgentRuntimeStatus('failed')).toBe(AgentStatus.Error);
  });
});
