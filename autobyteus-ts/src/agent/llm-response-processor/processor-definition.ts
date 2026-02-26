import { BaseLLMResponseProcessor } from './base-processor.js';

export class LLMResponseProcessorDefinition {
  name: string;
  processorClass: new () => BaseLLMResponseProcessor;

  constructor(name: string, processorClass: new () => BaseLLMResponseProcessor) {
    if (!name || typeof name !== 'string') {
      throw new Error('LLM Response Processor name must be a non-empty string.');
    }
    if (typeof processorClass !== 'function') {
      throw new Error('processorClass must be a class type.');
    }

    this.name = name;
    this.processorClass = processorClass;
  }

  toString(): string {
    return `<LLMResponseProcessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
