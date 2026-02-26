import { describe, it, expect } from 'vitest';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';

describe('AgentStatus', () => {
  it('defines expected statuses', () => {
    expect(AgentStatus.UNINITIALIZED).toBe('uninitialized');
    expect(AgentStatus.IDLE).toBe('idle');
    expect(AgentStatus.ERROR).toBe('error');
  });

  it('classifies initializing, processing, and terminal states', () => {
    expect(AgentStatus.isInitializing(AgentStatus.BOOTSTRAPPING)).toBe(true);
    expect(AgentStatus.isInitializing(AgentStatus.IDLE)).toBe(false);

    expect(AgentStatus.isProcessing(AgentStatus.AWAITING_LLM_RESPONSE)).toBe(true);
    expect(AgentStatus.isProcessing(AgentStatus.IDLE)).toBe(false);

    expect(AgentStatus.isTerminal(AgentStatus.SHUTDOWN_COMPLETE)).toBe(true);
    expect(AgentStatus.isTerminal(AgentStatus.ERROR)).toBe(true);
    expect(AgentStatus.isTerminal(AgentStatus.IDLE)).toBe(false);
  });
});
