import { describe, it, expect } from 'vitest';
import { AgentExternalEventNotifier } from '../../../../src/agent/events/notifiers.js';
import { EventType } from '../../../../src/events/event-types.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

describe('AgentExternalEventNotifier', () => {
  it('emits status updates with agent metadata', () => {
    const notifier = new AgentExternalEventNotifier('agent-1');
    let receivedPayload: any;
    let receivedMeta: any;

    notifier.subscribe(EventType.AGENT_STATUS_UPDATED, (payload, metadata) => {
      receivedPayload = payload;
      receivedMeta = metadata;
    });

    notifier.notifyStatusUpdated(AgentStatus.IDLE, AgentStatus.BOOTSTRAPPING);

    expect(receivedPayload).toEqual({
      new_status: AgentStatus.IDLE,
      old_status: AgentStatus.BOOTSTRAPPING
    });
    expect(receivedMeta.agent_id).toBe('agent-1');
    expect(receivedMeta.event_type).toBe(EventType.AGENT_STATUS_UPDATED);
  });

  it('emits assistant chunk payloads', () => {
    const notifier = new AgentExternalEventNotifier('agent-2');
    let receivedPayload: any;

    notifier.subscribe(EventType.AGENT_DATA_ASSISTANT_CHUNK, (payload) => {
      receivedPayload = payload;
    });

    const chunk = new ChunkResponse({ content: 'Hello' });
    notifier.notifyAgentDataAssistantChunk(chunk);

    expect(receivedPayload).toBe(chunk);
  });
});
