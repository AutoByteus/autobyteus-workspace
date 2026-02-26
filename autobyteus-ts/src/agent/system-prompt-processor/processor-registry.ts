import { Singleton } from '../../utils/singleton.js';
import { ProcessorOption } from '../processor-option.js';
import { SystemPromptProcessorDefinition } from './processor-definition.js';

export class SystemPromptProcessorRegistry extends Singleton {
  protected static instance?: SystemPromptProcessorRegistry;

  private definitions: Map<string, SystemPromptProcessorDefinition> = new Map();

  constructor() {
    super();
    if (SystemPromptProcessorRegistry.instance) {
      return SystemPromptProcessorRegistry.instance;
    }
    SystemPromptProcessorRegistry.instance = this;
  }

  registerProcessor(definition: SystemPromptProcessorDefinition): void {
    if (!(definition instanceof SystemPromptProcessorDefinition)) {
      throw new TypeError(`Expected SystemPromptProcessorDefinition instance, got ${typeof definition}.`);
    }

    const processorName = definition.name;
    if (this.definitions.has(processorName)) {
      console.warn(`Overwriting existing system prompt processor definition for name: '${processorName}'.`);
    }

    this.definitions.set(processorName, definition);
    console.info(
      `System prompt processor definition '${processorName}' (class: '${definition.processorClass.name}') registered successfully.`
    );
  }

  getProcessorDefinition(name: string): SystemPromptProcessorDefinition | undefined {
    if (typeof name !== 'string') {
      console.warn(
        `Attempted to retrieve system prompt processor definition with non-string name: ${typeof name}.`
      );
      return undefined;
    }

    const definition = this.definitions.get(name);
    if (!definition) {
      console.debug(`System prompt processor definition with name '${name}' not found in registry.`);
    }
    return definition;
  }

  getProcessor(name: string): any | undefined {
    const definition = this.getProcessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(
        `Failed to instantiate system prompt processor '${name}' from class '${definition.processorClass.name}': ${error}`
      );
      return undefined;
    }
  }

  listProcessorNames(): string[] {
    return Array.from(this.definitions.keys());
  }

  getOrderedProcessorOptions(): ProcessorOption[] {
    const definitions = Array.from(this.definitions.values());
    const sortedDefinitions = definitions.sort((a, b) => {
      const orderA =
        typeof (a.processorClass as any).getOrder === 'function'
          ? (a.processorClass as any).getOrder()
          : 500;
      const orderB =
        typeof (b.processorClass as any).getOrder === 'function'
          ? (b.processorClass as any).getOrder()
          : 500;
      return orderA - orderB;
    });

    return sortedDefinitions.map(
      (definition) =>
        new ProcessorOption(
          definition.name,
          typeof (definition.processorClass as any).isMandatory === 'function'
            ? (definition.processorClass as any).isMandatory()
            : false
        )
    );
  }

  getAllDefinitions(): Record<string, SystemPromptProcessorDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  clear(): void {
    const count = this.definitions.size;
    this.definitions.clear();
    console.info(`Cleared ${count} definitions from the SystemPromptProcessorRegistry.`);
  }

  length(): number {
    return this.definitions.size;
  }

  contains(name: string): boolean {
    if (typeof name !== 'string') {
      return false;
    }
    return this.definitions.has(name);
  }
}

export const defaultSystemPromptProcessorRegistry = SystemPromptProcessorRegistry.getInstance();
