import { describe, it, expect } from 'vitest';
import { AgentEventHandler } from '../../../../src/agent/handlers/base-event-handler.js';
import type { BaseEvent } from '../../../../src/agent/events/agent-events.js';
import type { AgentContext } from '../../../../src/agent/context/agent-context.js';

class DummyEventHandler extends AgentEventHandler {
  async handle(_event: BaseEvent, _context: AgentContext): Promise<void> {
    return;
  }
}

describe('AgentEventHandler', () => {
  it('renders a readable string representation', () => {
    const handler = new DummyEventHandler();
    expect(handler.toString()).toBe('<DummyEventHandler>');
  });
});
