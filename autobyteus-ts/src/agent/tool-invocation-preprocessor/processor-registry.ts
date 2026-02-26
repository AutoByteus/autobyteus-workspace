import { Singleton } from '../../utils/singleton.js';
import { ProcessorOption } from '../processor-option.js';
import { ToolInvocationPreprocessorDefinition } from './processor-definition.js';
import { BaseToolInvocationPreprocessor } from './base-preprocessor.js';

type ProcessorClass = (new () => BaseToolInvocationPreprocessor) & {
  getOrder?: () => number;
  isMandatory?: () => boolean;
};

export class ToolInvocationPreprocessorRegistry extends Singleton {
  protected static instance?: ToolInvocationPreprocessorRegistry;

  private definitions: Map<string, ToolInvocationPreprocessorDefinition> = new Map();

  constructor() {
    super();
    if (ToolInvocationPreprocessorRegistry.instance) {
      return ToolInvocationPreprocessorRegistry.instance;
    }
    ToolInvocationPreprocessorRegistry.instance = this;
  }

  registerPreprocessor(definition: ToolInvocationPreprocessorDefinition): void {
    if (!(definition instanceof ToolInvocationPreprocessorDefinition)) {
      throw new TypeError(
        `Expected ToolInvocationPreprocessorDefinition, got ${typeof definition}.`
      );
    }

    const name = definition.name;
    if (this.definitions.has(name)) {
      console.warn(`Overwriting existing tool invocation preprocessor definition '${name}'.`);
    }
    this.definitions.set(name, definition);
    console.info(`Tool invocation preprocessor definition '${name}' registered.`);
  }

  getPreprocessorDefinition(name: string): ToolInvocationPreprocessorDefinition | undefined {
    if (typeof name !== 'string') {
      return undefined;
    }
    return this.definitions.get(name);
  }

  getPreprocessor(name: string): BaseToolInvocationPreprocessor | undefined {
    const definition = this.getPreprocessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(
        `Failed to instantiate tool invocation preprocessor '${name}': ${error}`
      );
      return undefined;
    }
  }

  listPreprocessorNames(): string[] {
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

  getAllDefinitions(): Record<string, ToolInvocationPreprocessorDefinition> {
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

export const defaultToolInvocationPreprocessorRegistry = ToolInvocationPreprocessorRegistry.getInstance();
