import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { BaseAgentUserInputMessageProcessor } from '../../../../src/agent/input-processor/base-user-input-processor.js';
import { AgentUserInputMessageProcessorDefinition } from '../../../../src/agent/input-processor/processor-definition.js';
import {
  AgentUserInputMessageProcessorRegistry,
  defaultInputProcessorRegistry
} from '../../../../src/agent/input-processor/processor-registry.js';
import type { AgentInputUserMessage } from '../../../../src/agent/message/agent-input-user-message.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';
import type { UserMessageReceivedEvent } from '../../../../src/agent/events/agent-events.js';

class ProcA extends BaseAgentUserInputMessageProcessor {
  static getName(): string {
    return 'ProcA';
  }

  static getOrder(): number {
    return 100;
  }

  static isMandatory(): boolean {
    return true;
  }

  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

class ProcB extends BaseAgentUserInputMessageProcessor {
  static getName(): string {
    return 'ProcB';
  }

  static getOrder(): number {
    return 200;
  }

  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

class ProcWithInitError extends BaseAgentUserInputMessageProcessor {
  static getName(): string {
    return 'ProcWithInitError';
  }

  constructor() {
    super();
    throw new Error('Init failed');
  }

  async process(
    message: AgentInputUserMessage,
    _context: AgentContext,
    _event: UserMessageReceivedEvent
  ): Promise<AgentInputUserMessage> {
    return message;
  }
}

describe('AgentUserInputMessageProcessorRegistry', () => {
  let originalDefinitions: Record<string, AgentUserInputMessageProcessorDefinition> = {};

  beforeEach(() => {
    originalDefinitions = defaultInputProcessorRegistry.getAllDefinitions();
    defaultInputProcessorRegistry.clear();
  });

  afterEach(() => {
    defaultInputProcessorRegistry.clear();
    for (const definition of Object.values(originalDefinitions)) {
      defaultInputProcessorRegistry.registerProcessor(definition);
    }
  });

  it('is a singleton', () => {
    const registry1 = defaultInputProcessorRegistry;
    const registry2 = new AgentUserInputMessageProcessorRegistry();
    expect(registry1).toBe(registry2);
  });

  it('registers processor definitions', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    defaultInputProcessorRegistry.registerProcessor(definition);

    expect(defaultInputProcessorRegistry.getProcessorDefinition('ProcA')).toBe(definition);
    expect(defaultInputProcessorRegistry.length()).toBe(1);
  });

  it('overwrites existing definitions', () => {
    const definition1 = new AgentUserInputMessageProcessorDefinition('ProcOverwrite', ProcA);
    const definition2 = new AgentUserInputMessageProcessorDefinition('ProcOverwrite', ProcB);

    defaultInputProcessorRegistry.registerProcessor(definition1);
    defaultInputProcessorRegistry.registerProcessor(definition2);

    expect(defaultInputProcessorRegistry.getProcessorDefinition('ProcOverwrite')).toBe(definition2);
    expect(defaultInputProcessorRegistry.length()).toBe(1);
  });

  it('rejects invalid definition types', () => {
    expect(() => defaultInputProcessorRegistry.registerProcessor({} as AgentUserInputMessageProcessorDefinition)).toThrow(
      /Expected AgentUserInputMessageProcessorDefinition/
    );
  });

  it('handles invalid name lookups', () => {
    expect(defaultInputProcessorRegistry.getProcessorDefinition(null as unknown as string)).toBeUndefined();
    expect(defaultInputProcessorRegistry.getProcessorDefinition(123 as unknown as string)).toBeUndefined();
  });

  it('returns processor instances when available', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    defaultInputProcessorRegistry.registerProcessor(definition);

    const instance = defaultInputProcessorRegistry.getProcessor('ProcA');
    expect(instance).toBeInstanceOf(ProcA);
  });

  it('returns undefined for missing processor', () => {
    expect(defaultInputProcessorRegistry.getProcessor('NonExistentProc')).toBeUndefined();
  });

  it('returns undefined when processor instantiation fails', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcWithInitError', ProcWithInitError);
    defaultInputProcessorRegistry.registerProcessor(definition);

    const instance = defaultInputProcessorRegistry.getProcessor('ProcWithInitError');
    expect(instance).toBeUndefined();
  });

  it('lists processor names', () => {
    const definitionA = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    const definitionB = new AgentUserInputMessageProcessorDefinition('ProcB', ProcB);
    defaultInputProcessorRegistry.registerProcessor(definitionA);
    defaultInputProcessorRegistry.registerProcessor(definitionB);

    const names = defaultInputProcessorRegistry.listProcessorNames().sort();
    expect(names).toEqual(['ProcA', 'ProcB']);
  });

  it('returns ordered processor options', () => {
    const definitionA = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    const definitionB = new AgentUserInputMessageProcessorDefinition('ProcB', ProcB);
    defaultInputProcessorRegistry.registerProcessor(definitionB);
    defaultInputProcessorRegistry.registerProcessor(definitionA);

    const options = defaultInputProcessorRegistry.getOrderedProcessorOptions();
    expect(options.map((opt) => opt.name)).toEqual(['ProcA', 'ProcB']);
    expect(options[0].isMandatory).toBe(true);
    expect(options[1].isMandatory).toBe(false);
  });

  it('returns all definitions', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    defaultInputProcessorRegistry.registerProcessor(definition);

    const defs = defaultInputProcessorRegistry.getAllDefinitions();
    expect(Object.keys(defs)).toEqual(['ProcA']);
    expect(defs.ProcA).toBe(definition);
  });

  it('clears definitions', () => {
    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    defaultInputProcessorRegistry.registerProcessor(definition);
    expect(defaultInputProcessorRegistry.length()).toBe(1);

    defaultInputProcessorRegistry.clear();
    expect(defaultInputProcessorRegistry.length()).toBe(0);
    expect(defaultInputProcessorRegistry.getProcessorDefinition('ProcA')).toBeUndefined();
  });

  it('supports contains and length helpers', () => {
    expect(defaultInputProcessorRegistry.length()).toBe(0);
    expect(defaultInputProcessorRegistry.contains('ProcA')).toBe(false);

    const definition = new AgentUserInputMessageProcessorDefinition('ProcA', ProcA);
    defaultInputProcessorRegistry.registerProcessor(definition);

    expect(defaultInputProcessorRegistry.length()).toBe(1);
    expect(defaultInputProcessorRegistry.contains('ProcA')).toBe(true);
    expect(defaultInputProcessorRegistry.contains('NonExistent')).toBe(false);
    expect(defaultInputProcessorRegistry.contains(123 as unknown as string)).toBe(false);
  });
});
