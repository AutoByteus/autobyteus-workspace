import { BaseLifecycleEventProcessor } from './base-processor.js';

export class LifecycleEventProcessorDefinition {
  name: string;
  processorClass: typeof BaseLifecycleEventProcessor;

  constructor(name: string, processorClass: typeof BaseLifecycleEventProcessor) {
    if (!name || typeof name !== 'string') {
      throw new Error('Processor name must be a non-empty string.');
    }
    if (typeof processorClass !== 'function') {
      throw new Error('processorClass must be a class constructor.');
    }

    this.name = name;
    this.processorClass = processorClass;
  }

  toString(): string {
    return `<LifecycleEventProcessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
