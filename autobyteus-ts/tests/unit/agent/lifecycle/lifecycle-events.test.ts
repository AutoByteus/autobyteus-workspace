import { describe, it, expect } from 'vitest';
import { LifecycleEvent } from '../../../../src/agent/lifecycle/events.js';

describe('LifecycleEvent enum', () => {
  it('defines all expected events', () => {
    const expected = [
      'AGENT_READY',
      'BEFORE_LLM_CALL',
      'AFTER_LLM_RESPONSE',
      'BEFORE_TOOL_EXECUTE',
      'AFTER_TOOL_EXECUTE',
      'AGENT_SHUTTING_DOWN'
    ];
    const actual = Object.keys(LifecycleEvent);
    expect(new Set(actual)).toEqual(new Set(expected));
  });

  it('has lowercase snake_case values', () => {
    expect(LifecycleEvent.AGENT_READY).toBe('agent_ready');
    expect(LifecycleEvent.BEFORE_LLM_CALL).toBe('before_llm_call');
    expect(LifecycleEvent.AFTER_LLM_RESPONSE).toBe('after_llm_response');
    expect(LifecycleEvent.BEFORE_TOOL_EXECUTE).toBe('before_tool_execute');
    expect(LifecycleEvent.AFTER_TOOL_EXECUTE).toBe('after_tool_execute');
    expect(LifecycleEvent.AGENT_SHUTTING_DOWN).toBe('agent_shutting_down');
  });

  it('is string-like', () => {
    expect(typeof LifecycleEvent.AGENT_READY).toBe('string');
    expect(LifecycleEvent.AGENT_READY).toBe('agent_ready');
  });

  it('string representation matches value', () => {
    expect(String(LifecycleEvent.AGENT_READY)).toBe('agent_ready');
    expect(String(LifecycleEvent.BEFORE_LLM_CALL)).toBe('before_llm_call');
  });

  it('has exactly 6 events', () => {
    expect(Object.keys(LifecycleEvent)).toHaveLength(6);
  });
});
