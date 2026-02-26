import { describe, it, expect } from 'vitest';
import { BaseLifecycleEventProcessor } from '../../../../src/agent/lifecycle/base-processor.js';
import { LifecycleEvent } from '../../../../src/agent/lifecycle/events.js';

class ConcreteLifecycleProcessor extends BaseLifecycleEventProcessor {
  public processCalled = false;
  public processContext: any = null;
  public processEventData: Record<string, any> | null = null;

  get event(): LifecycleEvent {
    return LifecycleEvent.AGENT_READY;
  }

  async process(context: any, eventData: Record<string, any>): Promise<void> {
    this.processCalled = true;
    this.processContext = context;
    this.processEventData = eventData;
  }
}

class CustomOrderProcessor extends BaseLifecycleEventProcessor {
  static getName(): string {
    return 'custom_processor';
  }

  static getOrder(): number {
    return 100;
  }

  get event(): LifecycleEvent {
    return LifecycleEvent.BEFORE_LLM_CALL;
  }

  async process(_context: any, _eventData: Record<string, any>): Promise<void> {
    return;
  }
}

describe('BaseLifecycleEventProcessor', () => {
  it('default getName returns class name', () => {
    const processor = new ConcreteLifecycleProcessor();
    expect(processor.getName()).toBe('ConcreteLifecycleProcessor');
  });

  it('default getOrder returns 500', () => {
    const processor = new ConcreteLifecycleProcessor();
    expect(processor.getOrder()).toBe(500);
  });

  it('custom getName can be overridden', () => {
    const processor = new CustomOrderProcessor();
    expect(processor.getName()).toBe('custom_processor');
  });

  it('custom getOrder can be overridden', () => {
    const processor = new CustomOrderProcessor();
    expect(processor.getOrder()).toBe(100);
  });

  it('event property returns LifecycleEvent', () => {
    const processor = new ConcreteLifecycleProcessor();
    expect(processor.event).toBe(LifecycleEvent.AGENT_READY);
    const processor2 = new CustomOrderProcessor();
    expect(processor2.event).toBe(LifecycleEvent.BEFORE_LLM_CALL);
  });

  it('process receives context and event data', async () => {
    const processor = new ConcreteLifecycleProcessor();
    const mockContext = { id: 'ctx' };
    const eventData = { tool_name: 'test_tool' };

    await processor.process(mockContext, eventData);

    expect(processor.processCalled).toBe(true);
    expect(processor.processContext).toBe(mockContext);
    expect(processor.processEventData).toEqual(eventData);
  });

  it('toString includes event and class', () => {
    const processor = new ConcreteLifecycleProcessor();
    const repr = processor.toString();
    expect(repr).toContain('ConcreteLifecycleProcessor');
    expect(repr).toContain('agent_ready');
  });

  it('requires subclasses to implement abstract members', () => {
    class IncompleteProcessor extends BaseLifecycleEventProcessor {}
    expect(() => new (IncompleteProcessor as any)()).toThrow();
  });
});
