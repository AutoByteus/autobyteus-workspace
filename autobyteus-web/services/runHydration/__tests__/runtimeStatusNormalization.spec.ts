import { describe, expect, it } from 'vitest';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { normalizeAgentRuntimeStatus } from '../runtimeStatusNormalization';

describe('runtimeStatusNormalization', () => {
  it('accepts only canonical and current persisted agent status tokens', () => {
    expect(normalizeAgentRuntimeStatus('running')).toBe(AgentStatus.Running);
    expect(normalizeAgentRuntimeStatus('initializing')).toBe(AgentStatus.Initializing);
    expect(normalizeAgentRuntimeStatus('idle')).toBe(AgentStatus.Idle);
    expect(normalizeAgentRuntimeStatus('offline')).toBe(AgentStatus.Offline);
    expect(normalizeAgentRuntimeStatus('error')).toBe(AgentStatus.Error);
    expect(normalizeAgentRuntimeStatus('ACTIVE')).toBe(AgentStatus.Running);
    expect(normalizeAgentRuntimeStatus('TERMINATED')).toBe(AgentStatus.Offline);
  });

  it('does not preserve removed agent lifecycle status tokens', () => {
    for (const removedStatus of [
      'uninitialized',
      'bootstrapping',
      'starting',
      'startup',
      'awaiting_llm_response',
      'awaiting_tool_approval',
      'executing_tool',
      'tool_denied',
      'shutdown_complete',
    ]) {
      expect(normalizeAgentRuntimeStatus(removedStatus, AgentStatus.Idle)).toBe(AgentStatus.Idle);
    }
  });
});
