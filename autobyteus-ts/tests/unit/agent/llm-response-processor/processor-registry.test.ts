import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseLLMResponseProcessor } from '../../../../src/agent/llm-response-processor/base-processor.js';
import { LLMResponseProcessorDefinition } from '../../../../src/agent/llm-response-processor/processor-definition.js';
import {
  LLMResponseProcessorRegistry,
  defaultLlmResponseProcessorRegistry
} from '../../../../src/agent/llm-response-processor/processor-registry.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { LLMCompleteResponseReceivedEvent } from '../../../../src/agent/events/agent-events.js';
import type { CompleteResponse } from '../../../../src/llm/utils/response-types.js';

class ProcA extends BaseLLMResponseProcessor {
  static getName(): string {
    return 'ProcA';
  }

  static getOrder(): number {
    return 100;
  }

  static isMandatory(): boolean {
    return true;
  }

  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return true;
  }
}

class ProcB extends BaseLLMResponseProcessor {
  static getName(): string {
    return 'ProcB';
  }

  static getOrder(): number {
    return 200;
  }

  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return true;
  }
}

class ProcWithInitError extends BaseLLMResponseProcessor {
  static getName(): string {
    return 'ProcWithInitError';
  }

  constructor() {
    super();
    throw new Error('Init failed');
  }

  async processResponse(
    _response: CompleteResponse,
    _context: AgentContext,
    _event: LLMCompleteResponseReceivedEvent
  ): Promise<boolean> {
    return false;
  }
}

describe('LLMResponseProcessorRegistry', () => {
  let originalDefinitions: Record<string, LLMResponseProcessorDefinition> = {};

  beforeEach(() => {
    originalDefinitions = defaultLlmResponseProcessorRegistry.getAllDefinitions();
    defaultLlmResponseProcessorRegistry.clear();
  });

  afterEach(() => {
    defaultLlmResponseProcessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultLlmResponseProcessorRegistry.registerProcessor(definition);
    }
  });

  it('is a singleton', () => {
    const registry1 = defaultLlmResponseProcessorRegistry;
    const registry2 = new LLMResponseProcessorRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers processor definitions', () => {
    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);

    expect(defaultLlmResponseProcessorRegistry.getProcessorDefinition('ProcA')).toBe(definition);
    expect(defaultLlmResponseProcessorRegistry.length()).toBe(1);
  });

  it('overwrites existing definitions', () => {
    const definition1 = new LLMResponseProcessorDefinition('ProcOverwrite', ProcA);
    const definition2 = new LLMResponseProcessorDefinition('ProcOverwrite', ProcB);

    defaultLlmResponseProcessorRegistry.registerProcessor(definition1);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition2);

    expect(defaultLlmResponseProcessorRegistry.getProcessorDefinition('ProcOverwrite')).toBe(definition2);
    expect(defaultLlmResponseProcessorRegistry.length()).toBe(1);
  });

  it('rejects invalid definition types', () => {
    expect(() => defaultLlmResponseProcessorRegistry.registerProcessor({} as LLMResponseProcessorDefinition)).toThrow(
      /Expected LLMResponseProcessorDefinition/
    );
  });

  it('returns undefined for invalid name lookups', () => {
    expect(defaultLlmResponseProcessorRegistry.getProcessorDefinition(null as unknown as string)).toBeUndefined();
    expect(defaultLlmResponseProcessorRegistry.getProcessorDefinition(123 as unknown as string)).toBeUndefined();
  });

  it('returns processor instances when available', () => {
    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);

    const instance = defaultLlmResponseProcessorRegistry.getProcessor('ProcA');
    expect(instance).toBeInstanceOf(ProcA);
  });

  it('returns undefined for missing processor', () => {
    expect(defaultLlmResponseProcessorRegistry.getProcessor('NonExistentProc')).toBeUndefined();
  });

  it('returns undefined when processor instantiation fails', () => {
    const definition = new LLMResponseProcessorDefinition('ProcWithInitError', ProcWithInitError);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);

    const instance = defaultLlmResponseProcessorRegistry.getProcessor('ProcWithInitError');
    expect(instance).toBeUndefined();
  });

  it('lists processor names', () => {
    const definitionA = new LLMResponseProcessorDefinition('ProcA', ProcA);
    const definitionB = new LLMResponseProcessorDefinition('ProcB', ProcB);
    defaultLlmResponseProcessorRegistry.registerProcessor(definitionA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definitionB);

    const names = defaultLlmResponseProcessorRegistry.listProcessorNames().sort();
    expect(names).toEqual(['ProcA', 'ProcB']);
  });

  it('returns ordered processor options', () => {
    const definitionA = new LLMResponseProcessorDefinition('ProcA', ProcA);
    const definitionB = new LLMResponseProcessorDefinition('ProcB', ProcB);
    defaultLlmResponseProcessorRegistry.registerProcessor(definitionB);
    defaultLlmResponseProcessorRegistry.registerProcessor(definitionA);

    const options = defaultLlmResponseProcessorRegistry.getOrderedProcessorOptions();
    expect(options.map((opt) => opt.name)).toEqual(['ProcA', 'ProcB']);
    expect(options[0].isMandatory).toBe(true);
    expect(options[1].isMandatory).toBe(false);
  });

  it('returns all definitions', () => {
    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);

    const defs = defaultLlmResponseProcessorRegistry.getAllDefinitions();
    expect(Object.keys(defs)).toEqual(['ProcA']);
    expect(defs.ProcA).toBe(definition);
  });

  it('clears definitions', () => {
    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);
    expect(defaultLlmResponseProcessorRegistry.length()).toBe(1);

    defaultLlmResponseProcessorRegistry.clear();
    expect(defaultLlmResponseProcessorRegistry.length()).toBe(0);
    expect(defaultLlmResponseProcessorRegistry.getProcessorDefinition('ProcA')).toBeUndefined();
  });

  it('supports contains and length helpers', () => {
    expect(defaultLlmResponseProcessorRegistry.length()).toBe(0);
    expect(defaultLlmResponseProcessorRegistry.contains('ProcA')).toBe(false);

    const definition = new LLMResponseProcessorDefinition('ProcA', ProcA);
    defaultLlmResponseProcessorRegistry.registerProcessor(definition);

    expect(defaultLlmResponseProcessorRegistry.length()).toBe(1);
    expect(defaultLlmResponseProcessorRegistry.contains('ProcA')).toBe(true);
    expect(defaultLlmResponseProcessorRegistry.contains('NonExistent')).toBe(false);
    expect(defaultLlmResponseProcessorRegistry.contains(123 as unknown as string)).toBe(false);
  });
});
