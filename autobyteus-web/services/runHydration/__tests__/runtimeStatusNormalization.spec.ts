import { describe, expect, it } from 'vitest';
import {
  normalizeAgentRuntimeStatus,
  normalizeTeamRuntimeStatus,
} from '../runtimeStatusNormalization';
import { AgentStatus } from '~/types/agent/AgentStatus';
import { AgentTeamStatus } from '~/types/agent/AgentTeamStatus';

describe('runtimeStatusNormalization', () => {
  it('accepts only canonical and current persisted agent status tokens', () => {
    expect(normalizeAgentRuntimeStatus('running')).toBe(AgentStatus.Running);
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
      'awaiting_llm_response',
      'awaiting_tool_approval',
      'executing_tool',
      'tool_denied',
      'shutdown_complete',
    ]) {
      expect(normalizeAgentRuntimeStatus(removedStatus, AgentStatus.Idle)).toBe(AgentStatus.Idle);
    }
  });

  it('accepts only canonical and current persisted team status tokens', () => {
    expect(normalizeTeamRuntimeStatus('running')).toBe(AgentTeamStatus.Running);
    expect(normalizeTeamRuntimeStatus('ACTIVE')).toBe(AgentTeamStatus.Running);
    expect(normalizeTeamRuntimeStatus('TERMINATED')).toBe(AgentTeamStatus.Offline);
  });

  it('does not preserve removed team lifecycle status tokens', () => {
    for (const removedStatus of [
      'uninitialized',
      'bootstrapping',
      'awaiting_llm_response',
      'awaiting_tool_approval',
      'executing_tool',
      'tool_denied',
      'shutdown_complete',
    ]) {
      expect(normalizeTeamRuntimeStatus(removedStatus, AgentTeamStatus.Idle)).toBe(AgentTeamStatus.Idle);
    }
  });
});
