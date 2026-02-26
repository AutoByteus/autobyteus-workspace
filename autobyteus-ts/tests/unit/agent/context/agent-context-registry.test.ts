import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentContextRegistry } from '../../../../src/agent/context/agent-context-registry.js';

type MockContext = { agentId: string };

const resetRegistry = () => {
  (AgentContextRegistry as any).instance = undefined;
};

describe('AgentContextRegistry', () => {
  beforeEach(() => {
    resetRegistry();
  });

  it('behaves as a singleton', () => {
    const registry1 = new AgentContextRegistry();
    const registry2 = new AgentContextRegistry();

    expect(registry1).toBe(registry2);
  });

  it('registers and retrieves contexts', () => {
    const registry = new AgentContextRegistry();
    const context: MockContext = { agentId: 'test_agent_123' };

    registry.registerContext(context);
    const retrieved = registry.getContext('test_agent_123');

    expect(retrieved).toBeDefined();
    expect(retrieved?.agentId).toBe('test_agent_123');
    expect(retrieved).toBe(context);
  });

  it('returns undefined for missing contexts', () => {
    const registry = new AgentContextRegistry();

    expect(registry.getContext('nonexistent_agent')).toBeUndefined();
  });

  it('unregisters contexts', () => {
    const registry = new AgentContextRegistry();
    const context: MockContext = { agentId: 'test_agent_123' };

    registry.registerContext(context);
    expect(registry.getContext('test_agent_123')).toBeDefined();

    registry.unregisterContext('test_agent_123');
    expect(registry.getContext('test_agent_123')).toBeUndefined();
  });

  it('logs when unregistering a non-existent context', () => {
    const registry = new AgentContextRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    registry.unregisterContext('nonexistent_agent');

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
  });

  it('logs when overwriting an existing context', () => {
    const registry = new AgentContextRegistry();
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);

    const context1: MockContext = { agentId: 'test_agent_123' };
    const context2: MockContext = { agentId: 'test_agent_123' };

    registry.registerContext(context1);
    registry.registerContext(context2);

    expect(warnSpy).toHaveBeenCalledOnce();
    warnSpy.mockRestore();
    expect(registry.getContext('test_agent_123')).toBe(context2);
  });

  it('cleans up dead weak references when possible', () => {
    const registry = new AgentContextRegistry();
    const agentId = 'temp_agent_for_gc';

    const createAndRegister = () => {
      const tempContext: MockContext = { agentId: agentId };
      registry.registerContext(tempContext);
      expect(registry.getContext(agentId)).toBeDefined();
      return tempContext;
    };

    let tempContext = createAndRegister();
    tempContext = null as unknown as MockContext;

    if (typeof global.gc === 'function') {
      global.gc();
    } else {
      return;
    }

    expect(registry.getContext(agentId)).toBeUndefined();
    expect((registry as any).contexts.has(agentId)).toBe(false);
  });
});
