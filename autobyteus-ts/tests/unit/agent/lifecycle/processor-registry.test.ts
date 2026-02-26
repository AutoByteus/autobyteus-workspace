import { describe, it, expect, beforeEach } from 'vitest';
import {
  LifecycleEventProcessorRegistry,
  defaultLifecycleEventProcessorRegistry
} from '../../../../src/agent/lifecycle/processor-registry.js';
import { LifecycleEventProcessorDefinition } from '../../../../src/agent/lifecycle/processor-definition.js';
import { BaseLifecycleEventProcessor } from '../../../../src/agent/lifecycle/base-processor.js';
import { LifecycleEvent } from '../../../../src/agent/lifecycle/events.js';

class TestProcessorA extends BaseLifecycleEventProcessor {
  static getOrder(): number {
    return 200;
  }

  get event(): LifecycleEvent {
    return LifecycleEvent.AGENT_READY;
  }

  async process(): Promise<void> {
    return;
  }
}

class TestProcessorB extends BaseLifecycleEventProcessor {
  static getOrder(): number {
    return 100;
  }

  static isMandatory(): boolean {
    return true;
  }

  get event(): LifecycleEvent {
    return LifecycleEvent.BEFORE_LLM_CALL;
  }

  async process(): Promise<void> {
    return;
  }
}

describe('LifecycleEventProcessorRegistry', () => {
  beforeEach(() => {
    (defaultLifecycleEventProcessorRegistry as LifecycleEventProcessorRegistry).clear();
  });

  it('registers and retrieves definitions', () => {
    const registry = new LifecycleEventProcessorRegistry();
    const definition = new LifecycleEventProcessorDefinition('proc_a', TestProcessorA);
    registry.registerProcessor(definition);
    expect(registry.getProcessorDefinition('proc_a')).toBe(definition);
  });

  it('creates processor instances', () => {
    const registry = new LifecycleEventProcessorRegistry();
    const definition = new LifecycleEventProcessorDefinition('proc_a', TestProcessorA);
    registry.registerProcessor(definition);
    const instance = registry.getProcessor('proc_a');
    expect(instance).toBeInstanceOf(TestProcessorA);
  });

  it('lists processor names', () => {
    const registry = new LifecycleEventProcessorRegistry();
    registry.registerProcessor(new LifecycleEventProcessorDefinition('proc_a', TestProcessorA));
    registry.registerProcessor(new LifecycleEventProcessorDefinition('proc_b', TestProcessorB));
    const names = registry.listProcessorNames();
    expect(new Set(names)).toEqual(new Set(['proc_a', 'proc_b']));
  });

  it('returns ordered processor options', () => {
    const registry = new LifecycleEventProcessorRegistry();
    registry.registerProcessor(new LifecycleEventProcessorDefinition('proc_a', TestProcessorA));
    registry.registerProcessor(new LifecycleEventProcessorDefinition('proc_b', TestProcessorB));

    const options = registry.getOrderedProcessorOptions();
    expect(options[0].name).toBe('proc_b');
    expect(options[0].isMandatory).toBe(true);
    expect(options[1].name).toBe('proc_a');
  });

  it('returns undefined for unknown names', () => {
    const registry = new LifecycleEventProcessorRegistry();
    expect(registry.getProcessorDefinition('missing')).toBeUndefined();
  });
});
