import { Singleton } from '../../utils/singleton.js';
import { ProcessorOption } from '../processor-option.js';
import { AgentUserInputMessageProcessorDefinition } from './processor-definition.js';
import { BaseAgentUserInputMessageProcessor } from './base-user-input-processor.js';

type ProcessorClass = (new () => BaseAgentUserInputMessageProcessor) & {
  getOrder?: () => number;
  isMandatory?: () => boolean;
};

export class AgentUserInputMessageProcessorRegistry extends Singleton {
  protected static instance?: AgentUserInputMessageProcessorRegistry;

  private definitions: Map<string, AgentUserInputMessageProcessorDefinition> = new Map();

  constructor() {
    super();
    if (AgentUserInputMessageProcessorRegistry.instance) {
      return AgentUserInputMessageProcessorRegistry.instance;
    }
    AgentUserInputMessageProcessorRegistry.instance = this;
  }

  registerProcessor(definition: AgentUserInputMessageProcessorDefinition): void {
    if (!(definition instanceof AgentUserInputMessageProcessorDefinition)) {
      throw new TypeError(
        `Expected AgentUserInputMessageProcessorDefinition instance, got ${typeof definition}.`
      );
    }

    const processorName = definition.name;
    if (this.definitions.has(processorName)) {
      console.warn(`Overwriting existing input processor definition for name: '${processorName}'.`);
    }

    this.definitions.set(processorName, definition);
    console.info(
      `Input processor definition '${processorName}' (class: '${definition.processorClass.name}') registered successfully.`
    );
  }

  getProcessorDefinition(name: string): AgentUserInputMessageProcessorDefinition | undefined {
    if (typeof name !== 'string') {
      console.warn(
        `Attempted to retrieve input processor definition with non-string name: ${typeof name}.`
      );
      return undefined;
    }

    const definition = this.definitions.get(name);
    if (!definition) {
      console.debug(`Input processor definition with name '${name}' not found in registry.`);
    }
    return definition;
  }

  getProcessor(name: string): BaseAgentUserInputMessageProcessor | undefined {
    const definition = this.getProcessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(
        `Failed to instantiate input processor '${name}' from class '${definition.processorClass.name}': ${error}`
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
      const processorA = a.processorClass as ProcessorClass;
      const processorB = b.processorClass as ProcessorClass;
      const orderA = typeof processorA.getOrder === 'function' ? processorA.getOrder() : 500;
      const orderB = typeof processorB.getOrder === 'function' ? processorB.getOrder() : 500;
      return orderA - orderB;
    });

    return sortedDefinitions.map((definition) => {
      const processorClass = definition.processorClass as ProcessorClass;
      const isMandatory =
        typeof processorClass.isMandatory === 'function' ? processorClass.isMandatory() : false;
      return new ProcessorOption(definition.name, isMandatory);
    });
  }

  getAllDefinitions(): Record<string, AgentUserInputMessageProcessorDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  clear(): void {
    const count = this.definitions.size;
    this.definitions.clear();
    console.info(`Cleared ${count} definitions from the AgentUserInputMessageProcessorRegistry.`);
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

export const defaultInputProcessorRegistry = AgentUserInputMessageProcessorRegistry.getInstance();
