import { describe, it, expect } from 'vitest';
import { AgentNotFoundException } from '../../../src/agent/exceptions.js';

describe('AgentNotFoundException', () => {
  it('stores the agent id and message', () => {
    const error = new AgentNotFoundException('agent-123');
    expect(error.agentId).toBe('agent-123');
    expect(error.message).toContain('Agent with id agent-123 not found');
  });
});
