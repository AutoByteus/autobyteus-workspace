import { Singleton } from '../../utils/singleton.js';
import { ProcessorOption } from '../processor-option.js';
import { ToolExecutionResultProcessorDefinition } from './processor-definition.js';
import { BaseToolExecutionResultProcessor } from './base-processor.js';

type ProcessorClass = (new () => BaseToolExecutionResultProcessor) & {
  getOrder?: () => number;
  isMandatory?: () => boolean;
};

export class ToolExecutionResultProcessorRegistry extends Singleton {
  protected static instance?: ToolExecutionResultProcessorRegistry;

  private definitions: Map<string, ToolExecutionResultProcessorDefinition> = new Map();

  constructor() {
    super();
    if (ToolExecutionResultProcessorRegistry.instance) {
      return ToolExecutionResultProcessorRegistry.instance;
    }
    ToolExecutionResultProcessorRegistry.instance = this;
  }

  registerProcessor(definition: ToolExecutionResultProcessorDefinition): void {
    if (!(definition instanceof ToolExecutionResultProcessorDefinition)) {
      throw new TypeError(
        `Expected ToolExecutionResultProcessorDefinition instance, got ${typeof definition}.`
      );
    }

    const name = definition.name;
    if (this.definitions.has(name)) {
      console.warn(`Overwriting existing tool execution result processor definition for name: '${name}'.`);
    }

    this.definitions.set(name, definition);
    console.info(`Tool execution result processor definition '${name}' registered successfully.`);
  }

  getProcessorDefinition(name: string): ToolExecutionResultProcessorDefinition | undefined {
    if (typeof name !== 'string') {
      return undefined;
    }
    return this.definitions.get(name);
  }

  getProcessor(name: string): BaseToolExecutionResultProcessor | undefined {
    const definition = this.getProcessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(
        `Failed to instantiate tool execution result processor '${name}': ${error}`
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

  getAllDefinitions(): Record<string, ToolExecutionResultProcessorDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  clear(): void {
    this.definitions.clear();
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

export const defaultToolExecutionResultProcessorRegistry = ToolExecutionResultProcessorRegistry.getInstance();
