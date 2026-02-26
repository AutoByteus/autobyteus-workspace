import { Singleton } from '../../utils/singleton.js';
import { ProcessorOption } from '../processor-option.js';
import { LLMResponseProcessorDefinition } from './processor-definition.js';
import { BaseLLMResponseProcessor } from './base-processor.js';

type ProcessorClass = (new () => BaseLLMResponseProcessor) & {
  getOrder?: () => number;
  isMandatory?: () => boolean;
};

export class LLMResponseProcessorRegistry extends Singleton {
  protected static instance?: LLMResponseProcessorRegistry;

  private definitions: Map<string, LLMResponseProcessorDefinition> = new Map();

  constructor() {
    super();
    if (LLMResponseProcessorRegistry.instance) {
      return LLMResponseProcessorRegistry.instance;
    }
    LLMResponseProcessorRegistry.instance = this;
  }

  registerProcessor(definition: LLMResponseProcessorDefinition): void {
    if (!(definition instanceof LLMResponseProcessorDefinition)) {
      throw new TypeError(
        `Expected LLMResponseProcessorDefinition instance, got ${typeof definition}.`
      );
    }

    const name = definition.name;
    if (this.definitions.has(name)) {
      console.warn(`Overwriting existing LLM response processor definition for name: '${name}'.`);
    }

    this.definitions.set(name, definition);
    console.info(
      `LLM response processor definition '${name}' (class: '${definition.processorClass.name}') registered successfully.`
    );
  }

  getProcessorDefinition(name: string): LLMResponseProcessorDefinition | undefined {
    if (typeof name !== 'string') {
      console.warn(`Attempted to retrieve LLM response processor definition with non-string name: ${typeof name}.`);
      return undefined;
    }

    const definition = this.definitions.get(name);
    if (!definition) {
      console.debug(`LLM response processor definition with name '${name}' not found in registry.`);
    }
    return definition;
  }

  getProcessor(name: string): BaseLLMResponseProcessor | undefined {
    const definition = this.getProcessorDefinition(name);
    if (!definition) {
      return undefined;
    }

    try {
      return new definition.processorClass();
    } catch (error) {
      console.error(
        `Failed to instantiate LLM response processor '${name}' from class '${definition.processorClass.name}': ${error}`
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

  getAllDefinitions(): Record<string, LLMResponseProcessorDefinition> {
    return Object.fromEntries(this.definitions.entries());
  }

  clear(): void {
    const count = this.definitions.size;
    this.definitions.clear();
    console.info(`Cleared ${count} definitions from the LLMResponseProcessorRegistry.`);
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

export const defaultLlmResponseProcessorRegistry = LLMResponseProcessorRegistry.getInstance();
