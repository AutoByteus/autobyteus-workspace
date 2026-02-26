import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseToolInvocationPreprocessor } from '../../../../src/agent/tool-invocation-preprocessor/base-preprocessor.js';
import { ToolInvocationPreprocessorDefinition } from '../../../../src/agent/tool-invocation-preprocessor/processor-definition.js';
import {
  ToolInvocationPreprocessorRegistry,
  defaultToolInvocationPreprocessorRegistry
} from '../../../../src/agent/tool-invocation-preprocessor/processor-registry.js';
import type { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class ProcA extends BaseToolInvocationPreprocessor {
  static getName(): string {
    return 'ProcA';
  }

  static getOrder(): number {
    return 100;
  }

  static isMandatory(): boolean {
    return true;
  }

  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

class ProcB extends BaseToolInvocationPreprocessor {
  static getName(): string {
    return 'ProcB';
  }

  static getOrder(): number {
    return 200;
  }

  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

class ProcWithInitError extends BaseToolInvocationPreprocessor {
  static getName(): string {
    return 'ProcWithInitError';
  }

  constructor() {
    super();
    throw new Error('Init failed');
  }

  async process(invocation: ToolInvocation, _context: AgentContext): Promise<ToolInvocation> {
    return invocation;
  }
}

describe('ToolInvocationPreprocessorRegistry', () => {
  let originalDefinitions: Record<string, ToolInvocationPreprocessorDefinition> = {};

  beforeEach(() => {
    originalDefinitions = defaultToolInvocationPreprocessorRegistry.getAllDefinitions();
    defaultToolInvocationPreprocessorRegistry.clear();
  });

  afterEach(() => {
    defaultToolInvocationPreprocessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);
    }
  });

  it('is a singleton', () => {
    const registry1 = defaultToolInvocationPreprocessorRegistry;
    const registry2 = new ToolInvocationPreprocessorRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers preprocessor definitions', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);

    expect(defaultToolInvocationPreprocessorRegistry.getPreprocessorDefinition('ProcA')).toBe(definition);
    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(1);
  });

  it('overwrites existing definitions', () => {
    const definition1 = new ToolInvocationPreprocessorDefinition('ProcOverwrite', ProcA);
    const definition2 = new ToolInvocationPreprocessorDefinition('ProcOverwrite', ProcB);

    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition1);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition2);

    expect(defaultToolInvocationPreprocessorRegistry.getPreprocessorDefinition('ProcOverwrite')).toBe(definition2);
    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(1);
  });

  it('rejects invalid definition types', () => {
    expect(() => defaultToolInvocationPreprocessorRegistry.registerPreprocessor({} as ToolInvocationPreprocessorDefinition)).toThrow(
      /Expected ToolInvocationPreprocessorDefinition/
    );
  });

  it('returns processor instances when available', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);

    const instance = defaultToolInvocationPreprocessorRegistry.getPreprocessor('ProcA');
    expect(instance).toBeInstanceOf(ProcA);
  });

  it('returns undefined for missing processor', () => {
    expect(defaultToolInvocationPreprocessorRegistry.getPreprocessor('NonExistentProc')).toBeUndefined();
  });

  it('returns undefined when processor instantiation fails', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcWithInitError', ProcWithInitError);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);

    const instance = defaultToolInvocationPreprocessorRegistry.getPreprocessor('ProcWithInitError');
    expect(instance).toBeUndefined();
  });

  it('lists processor names', () => {
    const definitionA = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    const definitionB = new ToolInvocationPreprocessorDefinition('ProcB', ProcB);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definitionA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definitionB);

    const names = defaultToolInvocationPreprocessorRegistry.listPreprocessorNames().sort();
    expect(names).toEqual(['ProcA', 'ProcB']);
  });

  it('returns ordered processor options', () => {
    const definitionA = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    const definitionB = new ToolInvocationPreprocessorDefinition('ProcB', ProcB);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definitionB);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definitionA);

    const options = defaultToolInvocationPreprocessorRegistry.getOrderedProcessorOptions();
    expect(options.map((opt) => opt.name)).toEqual(['ProcA', 'ProcB']);
    expect(options[0].isMandatory).toBe(true);
    expect(options[1].isMandatory).toBe(false);
  });

  it('returns all definitions', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);

    const defs = defaultToolInvocationPreprocessorRegistry.getAllDefinitions();
    expect(Object.keys(defs)).toEqual(['ProcA']);
    expect(defs.ProcA).toBe(definition);
  });

  it('clears definitions', () => {
    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);
    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(1);

    defaultToolInvocationPreprocessorRegistry.clear();
    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(0);
    expect(defaultToolInvocationPreprocessorRegistry.getPreprocessorDefinition('ProcA')).toBeUndefined();
  });

  it('supports contains and length helpers', () => {
    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(0);
    expect(defaultToolInvocationPreprocessorRegistry.contains('ProcA')).toBe(false);

    const definition = new ToolInvocationPreprocessorDefinition('ProcA', ProcA);
    defaultToolInvocationPreprocessorRegistry.registerPreprocessor(definition);

    expect(defaultToolInvocationPreprocessorRegistry.length()).toBe(1);
    expect(defaultToolInvocationPreprocessorRegistry.contains('ProcA')).toBe(true);
    expect(defaultToolInvocationPreprocessorRegistry.contains('NonExistent')).toBe(false);
    expect(defaultToolInvocationPreprocessorRegistry.contains(123 as unknown as string)).toBe(false);
  });
});
