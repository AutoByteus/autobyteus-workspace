import { Singleton } from '../../utils/singleton.js';
import { LifecycleEventProcessorDefinition } from './processor-definition.js';
import type { BaseLifecycleEventProcessor } from './base-processor.js';
import { ProcessorOption } from '../processor-option.js';

export class LifecycleEventProcessorRegistry extends Singleton {
  protected static instance?: LifecycleEventProcessorRegistry;

  private definitions: Map<string, LifecycleEventProcessorDefinition> = new Map();

  constructor() {
    super();
    if (LifecycleEventProcessorRegistry.instance) {
      return LifecycleEventProcessorRegistry.instance;
    }
    LifecycleEventProcessorRegistry.instance = this;
  }

  registerProcessor(definition: LifecycleEventProcessorDefinition): void {
    if (!(definition instanceof LifecycleEventProcessorDefinition)) {
      throw new Error(`Expected LifecycleEventProcessorDefinition instance, got ${typeof definition}.`);
    }

    const name = definition.name;
    if (this.definitions.has(name)) {
      console.warn(`Overwriting existing lifecycle event processor definition for name: '${name}'.`);
    }

    this.definitions.set(name, definition);
  }

  getProcessorDefinition(name: string): LifecycleEventProcessorDefinition | undefined {
    if (typeof name !== 'string') {
      console.warn(`Attempted to retrieve lifecycle event processor definition with non-string name: ${typeof name}.`);
      return undefined;
    }

    const definition = this.definitions.get(name);
    if (!definition) {
      console.debug?.(`Lifecycle event processor definition with name '${name}' not found in registry.`);
    }
    return definition;
  }

  getProcessor(name: string): BaseLifecycleEventProcessor | undefined {
    const definition = this.getProcessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(`Failed to instantiate lifecycle event processor '${name}': ${error}`);
      return undefined;
    }
  }

  listProcessorNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  getOrderedProcessorOptions(): ProcessorOption[] {
    const definitions = Array.from(this.definitions.values());
    const sorted = definitions.sort((a, b) => a.processorClass.getOrder() - b.processorClass.getOrder());
    return sorted.map((definition) => new ProcessorOption(definition.name, definition.processorClass.isMandatory()));
  }

  getAllDefinitions(): Record<string, LifecycleEventProcessorDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  clear(): void {
    this.definitions.clear();
  }

  get length(): number {
    return this.definitions.size;
  }

  has(name: string): boolean {
    return typeof name === 'string' ? this.definitions.has(name) : false;
  }
}

export const defaultLifecycleEventProcessorRegistry = new LifecycleEventProcessorRegistry();
