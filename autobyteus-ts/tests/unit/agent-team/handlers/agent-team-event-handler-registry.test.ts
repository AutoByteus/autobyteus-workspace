import { describe, it, expect } from 'vitest';
import { AgentTeamEventHandlerRegistry } from '../../../../src/agent-team/handlers/agent-team-event-handler-registry.js';
import { BaseAgentTeamEventHandler } from '../../../../src/agent-team/handlers/base-agent-team-event-handler.js';
import { BaseAgentTeamEvent, AgentTeamReadyEvent } from '../../../../src/agent-team/events/agent-team-events.js';

class DummyHandler extends BaseAgentTeamEventHandler {
  async handle(): Promise<void> {
    return;
  }
}

describe('AgentTeamEventHandlerRegistry', () => {
  it('registers and retrieves handlers', () => {
    const registry = new AgentTeamEventHandlerRegistry();
    const handler = new DummyHandler();

    registry.register(AgentTeamReadyEvent, handler);

    expect(registry.getHandler(AgentTeamReadyEvent)).toBe(handler);
    expect(registry.getHandler(BaseAgentTeamEvent as any)).toBeUndefined();
  });

  it('throws for invalid event type', () => {
    const registry = new AgentTeamEventHandlerRegistry();
    const handler = new DummyHandler();

    expect(() => registry.register(String as any, handler)).toThrow(TypeError);
  });
});
