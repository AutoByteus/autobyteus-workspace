export class SystemPromptProcessorDefinition {
  name: string;
  processorClass: new () => any;

  constructor(name: string, processorClass: new () => any) {
    if (!name || typeof name !== 'string') {
      throw new Error('System Prompt Processor name must be a non-empty string.');
    }
    if (typeof processorClass !== 'function') {
      throw new Error('processorClass must be a class type.');
    }

    this.name = name;
    this.processorClass = processorClass;
  }

  toString(): string {
    return `<SystemPromptProcessorDefinition name='${this.name}', class='${this.processorClass.name}'>`;
  }
}
