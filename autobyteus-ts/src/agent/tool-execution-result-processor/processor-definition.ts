import { BaseToolExecutionResultProcessor } from './base-processor.js';

export class ToolExecutionResultProcessorDefinition {
  name: string;
  processorClass: new () => BaseToolExecutionResultProcessor;

  constructor(name: string, processorClass: new () => BaseToolExecutionResultProcessor) {
    if (!name || typeof name !== 'string') {
      throw new Error('Tool Execution Result Processor name must be a non-empty string.');
    }
    if (typeof processorClass !== 'function') {
      throw new Error('processorClass must be a class type.');
    }

    this.name = name;
    this.processorClass = processorClass;
  }

  toString(): string {
    return `<ToolExecutionResultProcessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
