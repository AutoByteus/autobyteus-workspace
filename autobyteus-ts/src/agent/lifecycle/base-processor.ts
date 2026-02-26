import { LifecycleEvent } from './events.js';

export class BaseLifecycleEventProcessor {
  constructor() {
    if (new.target === BaseLifecycleEventProcessor) {
      throw new Error('BaseLifecycleEventProcessor cannot be instantiated directly.');
    }

    if (this.process === BaseLifecycleEventProcessor.prototype.process) {
      throw new Error("Subclasses must implement the 'process' method.");
    }

    const baseGetter = Object.getOwnPropertyDescriptor(BaseLifecycleEventProcessor.prototype, 'event')?.get;
    const derivedGetter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(this), 'event')?.get;
    if (!derivedGetter || derivedGetter === baseGetter) {
      throw new Error("Subclasses must implement the 'event' property.");
    }
  }

  static getName(): string {
    return this.name;
  }

  static getOrder(): number {
    return 500;
  }

  static isMandatory(): boolean {
    return false;
  }

  getName(): string {
    const ctor = this.constructor as typeof BaseLifecycleEventProcessor;
    return ctor.getName();
  }

  getOrder(): number {
    const ctor = this.constructor as typeof BaseLifecycleEventProcessor;
    return ctor.getOrder();
  }

  isMandatory(): boolean {
    const ctor = this.constructor as typeof BaseLifecycleEventProcessor;
    return ctor.isMandatory();
  }

  get event(): LifecycleEvent {
    throw new Error("Subclasses must implement the 'event' property.");
  }

  async process(_context: unknown, _event_data: Record<string, any>): Promise<void> {
    throw new Error("Subclasses must implement the 'process' method.");
  }

  toString(): string {
    try {
      return `<${this.constructor.name} event='${this.event}'>`;
    } catch {
      return `<${this.constructor.name} (unconfigured)>`;
    }
  }
}
