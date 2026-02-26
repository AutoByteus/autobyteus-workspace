import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseToolExecutionResultProcessor } from '../../../../src/agent/tool-execution-result-processor/base-processor.js';
import { ToolExecutionResultProcessorDefinition } from '../../../../src/agent/tool-execution-result-processor/processor-definition.js';
import {
  ToolExecutionResultProcessorRegistry,
  defaultToolExecutionResultProcessorRegistry
} from '../../../../src/agent/tool-execution-result-processor/processor-registry.js';
import type { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class ProcA extends BaseToolExecutionResultProcessor {
  static getName(): string {
    return 'ProcA';
  }

  static getOrder(): number {
    return 100;
  }

  static isMandatory(): boolean {
    return true;
  }

  async process(event: ToolResultEvent, _context: AgentContext): Promise<ToolResultEvent> {
    return event;
  }
}

class ProcB extends BaseToolExecutionResultProcessor {
  static getName(): string {
    return 'ProcB';
  }

  static getOrder(): number {
    return 200;
  }

  async process(event: ToolResultEvent, _context: AgentContext): Promise<ToolResultEvent> {
    return event;
  }
}

class ProcWithInitError extends BaseToolExecutionResultProcessor {
  static getName(): string {
    return 'ProcWithInitError';
  }

  constructor() {
    super();
    throw new Error('Init failed');
  }

  async process(event: ToolResultEvent, _context: AgentContext): Promise<ToolResultEvent> {
    return event;
  }
}

describe('ToolExecutionResultProcessorRegistry', () => {
  let originalDefinitions: Record<string, ToolExecutionResultProcessorDefinition> = {};

  beforeEach(() => {
    originalDefinitions = defaultToolExecutionResultProcessorRegistry.getAllDefinitions();
    defaultToolExecutionResultProcessorRegistry.clear();
  });

  afterEach(() => {
    defaultToolExecutionResultProcessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);
    }
  });

  it('is a singleton', () => {
    const registry1 = defaultToolExecutionResultProcessorRegistry;
    const registry2 = new ToolExecutionResultProcessorRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers processor definitions', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);

    expect(defaultToolExecutionResultProcessorRegistry.getProcessorDefinition('ProcA')).toBe(definition);
    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(1);
  });

  it('overwrites existing definitions', () => {
    const definition1 = new ToolExecutionResultProcessorDefinition('ProcOverwrite', ProcA);
    const definition2 = new ToolExecutionResultProcessorDefinition('ProcOverwrite', ProcB);

    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition1);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition2);

    expect(defaultToolExecutionResultProcessorRegistry.getProcessorDefinition('ProcOverwrite')).toBe(definition2);
    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(1);
  });

  it('rejects invalid definition types', () => {
    expect(() => defaultToolExecutionResultProcessorRegistry.registerProcessor({} as ToolExecutionResultProcessorDefinition)).toThrow(
      /Expected ToolExecutionResultProcessorDefinition/
    );
  });

  it('returns processor instances when available', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);

    const instance = defaultToolExecutionResultProcessorRegistry.getProcessor('ProcA');
    expect(instance).toBeInstanceOf(ProcA);
  });

  it('returns undefined for missing processor', () => {
    expect(defaultToolExecutionResultProcessorRegistry.getProcessor('NonExistentProc')).toBeUndefined();
  });

  it('returns undefined when processor instantiation fails', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcWithInitError', ProcWithInitError);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);

    const instance = defaultToolExecutionResultProcessorRegistry.getProcessor('ProcWithInitError');
    expect(instance).toBeUndefined();
  });

  it('lists processor names', () => {
    const definitionA = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    const definitionB = new ToolExecutionResultProcessorDefinition('ProcB', ProcB);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definitionA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definitionB);

    const names = defaultToolExecutionResultProcessorRegistry.listProcessorNames().sort();
    expect(names).toEqual(['ProcA', 'ProcB']);
  });

  it('returns ordered processor options', () => {
    const definitionA = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    const definitionB = new ToolExecutionResultProcessorDefinition('ProcB', ProcB);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definitionB);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definitionA);

    const options = defaultToolExecutionResultProcessorRegistry.getOrderedProcessorOptions();
    expect(options.map((opt) => opt.name)).toEqual(['ProcA', 'ProcB']);
    expect(options[0].isMandatory).toBe(true);
    expect(options[1].isMandatory).toBe(false);
  });

  it('returns all definitions', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);

    const defs = defaultToolExecutionResultProcessorRegistry.getAllDefinitions();
    expect(Object.keys(defs)).toEqual(['ProcA']);
    expect(defs.ProcA).toBe(definition);
  });

  it('clears definitions', () => {
    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);
    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(1);

    defaultToolExecutionResultProcessorRegistry.clear();
    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(0);
    expect(defaultToolExecutionResultProcessorRegistry.getProcessorDefinition('ProcA')).toBeUndefined();
  });

  it('supports contains and length helpers', () => {
    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(0);
    expect(defaultToolExecutionResultProcessorRegistry.contains('ProcA')).toBe(false);

    const definition = new ToolExecutionResultProcessorDefinition('ProcA', ProcA);
    defaultToolExecutionResultProcessorRegistry.registerProcessor(definition);

    expect(defaultToolExecutionResultProcessorRegistry.length()).toBe(1);
    expect(defaultToolExecutionResultProcessorRegistry.contains('ProcA')).toBe(true);
    expect(defaultToolExecutionResultProcessorRegistry.contains('NonExistent')).toBe(false);
    expect(defaultToolExecutionResultProcessorRegistry.contains(123 as unknown as string)).toBe(false);
  });
});
