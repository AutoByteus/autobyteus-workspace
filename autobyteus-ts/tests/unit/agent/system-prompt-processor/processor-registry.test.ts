import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseSystemPromptProcessor } from '../../../../src/agent/system-prompt-processor/base-processor.js';
import { SystemPromptProcessorDefinition } from '../../../../src/agent/system-prompt-processor/processor-definition.js';
import { SystemPromptProcessorRegistry, defaultSystemPromptProcessorRegistry } from '../../../../src/agent/system-prompt-processor/processor-registry.js';
import type { BaseTool } from '../../../../src/tools/base-tool.js';

type AgentContextLike = unknown;

class ProcA extends BaseSystemPromptProcessor {
  static getName(): string { return 'ProcA'; }
  process(systemPrompt: string, _toolInstances: Record<string, BaseTool>, _agentId: string, _context: AgentContextLike): string { return systemPrompt; }
}

class ProcB extends BaseSystemPromptProcessor {
  static getName(): string { return 'ProcB'; }
  process(systemPrompt: string, _toolInstances: Record<string, BaseTool>, _agentId: string, _context: AgentContextLike): string { return systemPrompt; }
}

class ProcWithInitError extends BaseSystemPromptProcessor {
  static getName(): string { return 'ProcWithInitError'; }
  constructor() {
    super();
    throw new Error('Init failed');
  }
  process(systemPrompt: string, _toolInstances: Record<string, BaseTool>, _agentId: string, _context: AgentContextLike): string { return systemPrompt; }
}

describe('SystemPromptProcessorRegistry', () => {
  let originalDefinitions: Record<string, SystemPromptProcessorDefinition> = {};

  beforeEach(() => {
    originalDefinitions = defaultSystemPromptProcessorRegistry.getAllDefinitions();
    defaultSystemPromptProcessorRegistry.clear();
  });

  afterEach(() => {
    defaultSystemPromptProcessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultSystemPromptProcessorRegistry.registerProcessor(definition);
    }
  });

  it('is a singleton', () => {
    const registry1 = defaultSystemPromptProcessorRegistry;
    const registry2 = new SystemPromptProcessorRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers processor definitions', () => {
    const definition = new SystemPromptProcessorDefinition('ProcA', ProcA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);

    expect(defaultSystemPromptProcessorRegistry.getProcessorDefinition('ProcA')).toBe(definition);
    expect(defaultSystemPromptProcessorRegistry.length()).toBe(1);
  });

  it('overwrites existing definitions', () => {
    const definition1 = new SystemPromptProcessorDefinition('ProcOverwrite', ProcA);
    const definition2 = new SystemPromptProcessorDefinition('ProcOverwrite', ProcB);

    defaultSystemPromptProcessorRegistry.registerProcessor(definition1);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition2);

    expect(defaultSystemPromptProcessorRegistry.getProcessorDefinition('ProcOverwrite')).toBe(definition2);
    expect(defaultSystemPromptProcessorRegistry.length()).toBe(1);
  });

  it('rejects invalid definition types', () => {
    expect(() => defaultSystemPromptProcessorRegistry.registerProcessor({} as SystemPromptProcessorDefinition)).toThrow(
      /Expected SystemPromptProcessorDefinition/
    );
  });

  it('handles invalid name lookups', () => {
    expect(defaultSystemPromptProcessorRegistry.getProcessorDefinition(null as unknown as string)).toBeUndefined();
    expect(defaultSystemPromptProcessorRegistry.getProcessorDefinition(123 as unknown as string)).toBeUndefined();
  });

  it('returns processor instances when available', () => {
    const definition = new SystemPromptProcessorDefinition('ProcA', ProcA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);

    const instance = defaultSystemPromptProcessorRegistry.getProcessor('ProcA');
    expect(instance).toBeInstanceOf(ProcA);
  });

  it('returns undefined for missing processor', () => {
    expect(defaultSystemPromptProcessorRegistry.getProcessor('NonExistentProc')).toBeUndefined();
  });

  it('returns undefined when processor instantiation fails', () => {
    const definition = new SystemPromptProcessorDefinition('ProcWithInitError', ProcWithInitError);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);

    const instance = defaultSystemPromptProcessorRegistry.getProcessor('ProcWithInitError');
    expect(instance).toBeUndefined();
  });

  it('lists processor names', () => {
    const definitionA = new SystemPromptProcessorDefinition('ProcA', ProcA);
    const definitionB = new SystemPromptProcessorDefinition('ProcB', ProcB);
    defaultSystemPromptProcessorRegistry.registerProcessor(definitionA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definitionB);

    const names = defaultSystemPromptProcessorRegistry.listProcessorNames().sort();
    expect(names).toEqual(['ProcA', 'ProcB']);
  });

  it('returns all definitions', () => {
    const definition = new SystemPromptProcessorDefinition('ProcA', ProcA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);

    const defs = defaultSystemPromptProcessorRegistry.getAllDefinitions();
    expect(Object.keys(defs)).toEqual(['ProcA']);
    expect(defs.ProcA).toBe(definition);
  });

  it('clears definitions', () => {
    const definition = new SystemPromptProcessorDefinition('ProcA', ProcA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);
    expect(defaultSystemPromptProcessorRegistry.length()).toBe(1);

    defaultSystemPromptProcessorRegistry.clear();
    expect(defaultSystemPromptProcessorRegistry.length()).toBe(0);
    expect(defaultSystemPromptProcessorRegistry.getProcessorDefinition('ProcA')).toBeUndefined();
  });

  it('supports contains and length helpers', () => {
    expect(defaultSystemPromptProcessorRegistry.length()).toBe(0);
    expect(defaultSystemPromptProcessorRegistry.contains('ProcA')).toBe(false);

    const definition = new SystemPromptProcessorDefinition('ProcA', ProcA);
    defaultSystemPromptProcessorRegistry.registerProcessor(definition);

    expect(defaultSystemPromptProcessorRegistry.length()).toBe(1);
    expect(defaultSystemPromptProcessorRegistry.contains('ProcA')).toBe(true);
    expect(defaultSystemPromptProcessorRegistry.contains('NonExistent')).toBe(false);
    expect(defaultSystemPromptProcessorRegistry.contains(123 as unknown as string)).toBe(false);
  });
});
