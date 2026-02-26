import { BaseToolInvocationPreprocessor } from './base-preprocessor.js';

export class ToolInvocationPreprocessorDefinition {
  name: string;
  processorClass: new () => BaseToolInvocationPreprocessor;

  constructor(name: string, processorClass: new () => BaseToolInvocationPreprocessor) {
    if (!name || typeof name !== 'string') {
      throw new Error('Processor name must be a non-empty string.');
    }
    if (typeof processorClass !== 'function') {
      throw new Error('processorClass must be a class type.');
    }

    this.name = name;
    this.processorClass = processorClass;
  }

  toString(): string {
    return `<ToolInvocationPreprocessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
