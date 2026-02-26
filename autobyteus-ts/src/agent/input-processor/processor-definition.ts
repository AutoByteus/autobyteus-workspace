import { BaseAgentUserInputMessageProcessor } from './base-user-input-processor.js';

export class AgentUserInputMessageProcessorDefinition {
  name: string;
  processorClass: new () => BaseAgentUserInputMessageProcessor;

  constructor(name: string, processorClass: new () => BaseAgentUserInputMessageProcessor) {
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
    return `<AgentUserInputMessageProcessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
