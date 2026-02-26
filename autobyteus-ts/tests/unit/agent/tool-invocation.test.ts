import { describe, it, expect } from 'vitest';
import { ToolInvocation, ToolInvocationBatch } from '../../../src/agent/tool-invocation.js';

describe('ToolInvocation', () => {
  it('validates required fields', () => {
    expect(() => new ToolInvocation('', {}, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', null as any, 'id')).toThrow();
    expect(() => new ToolInvocation('tool', {}, '')).toThrow();
  });

  it('reports valid invocations', () => {
    const invocation = new ToolInvocation('tool', { a: 1 }, 'id');
    expect(invocation.isValid()).toBe(true);
  });
});

describe('ToolInvocationBatch', () => {
  it('tracks completion based on results count', () => {
    const invocation = new ToolInvocation('tool', {}, 'id');
    const batch = new ToolInvocationBatch([invocation]);
    expect(batch.isComplete()).toBe(false);
    batch.results.push({} as any);
    expect(batch.isComplete()).toBe(true);
  });
});
