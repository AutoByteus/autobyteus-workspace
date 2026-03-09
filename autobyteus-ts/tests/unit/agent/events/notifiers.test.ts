import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AgentExternalEventNotifier } from '../../../../src/agent/events/notifiers.js';
import { EventType } from '../../../../src/events/event-types.js';
import { AgentStatus } from '../../../../src/agent/status/status-enum.js';
import { ChunkResponse } from '../../../../src/llm/utils/response-types.js';

describe('AgentExternalEventNotifier', () => {
  const originalVerboseAgentEventLogs = process.env.AUTOBYTEUS_VERBOSE_AGENT_EVENT_LOGS;

  beforeEach(() => {
    delete process.env.AUTOBYTEUS_VERBOSE_AGENT_EVENT_LOGS;
  });

  afterEach(() => {
    if (originalVerboseAgentEventLogs === undefined) {
      delete process.env.AUTOBYTEUS_VERBOSE_AGENT_EVENT_LOGS;
    } else {
      process.env.AUTOBYTEUS_VERBOSE_AGENT_EVENT_LOGS = originalVerboseAgentEventLogs;
    }
    vi.restoreAllMocks();
  });

  it('emits status updates with agent metadata', () => {
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(console, 'debug').mockImplementation(() => undefined);
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
    expect(infoSpy).toHaveBeenCalledWith(expect.stringContaining('emitted agent_status_updated'));
  });

  it('emits assistant chunk payloads', () => {
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const notifier = new AgentExternalEventNotifier('agent-2');
    let receivedPayload: any;

    notifier.subscribe(EventType.AGENT_DATA_ASSISTANT_CHUNK, (payload) => {
      receivedPayload = payload;
    });

    const chunk = new ChunkResponse({ content: 'Hello' });
    debugSpy.mockClear();
    notifier.notifyAgentDataAssistantChunk(chunk);

    expect(receivedPayload).toBe(chunk);
    expect(debugSpy).not.toHaveBeenCalled();
  });

  it('logs streaming details only when verbose agent event logs are enabled', () => {
    process.env.AUTOBYTEUS_VERBOSE_AGENT_EVENT_LOGS = 'true';
    const debugSpy = vi.spyOn(console, 'debug').mockImplementation(() => undefined);
    const notifier = new AgentExternalEventNotifier('agent-3');

    debugSpy.mockClear();
    notifier.notifyAgentSegmentEvent({
      segment_id: 'segment-1',
      segment_type: 'TEXT',
      type: 'SEGMENT_CONTENT',
      payload: { delta: 'hello world' }
    });

    expect(debugSpy).toHaveBeenCalledWith(
      expect.stringContaining('emitted agent_data_segment_event')
    );
    expect(debugSpy).toHaveBeenCalledWith(expect.stringContaining('delta_len=11'));
  });
});
