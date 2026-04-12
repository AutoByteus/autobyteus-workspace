import { describe, expect, it } from 'vitest';
import { Message, MessageRole, ToolCallPayload, ToolCallSpec, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import { WorkingContextSnapshot } from '../../../src/memory/working-context-snapshot.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

describe('WorkingContextSnapshotSerializer', () => {
  it('serializes and deserializes tool payloads with the current schema version', () => {
    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.SYSTEM, { content: 'System' }));
    snapshot.appendMessage(new Message(MessageRole.USER, { content: 'Hello' }));
    snapshot.appendMessage(new Message(MessageRole.ASSISTANT, {
      content: 'Hi',
      reasoning_content: 'Because',
      image_urls: ['img://1'],
      audio_urls: ['aud://1'],
      video_urls: ['vid://1'],
    }));
    snapshot.appendMessage(new Message(MessageRole.ASSISTANT, {
      content: null,
      tool_payload: new ToolCallPayload([
        { id: 'call_1', name: 'search', arguments: { q: 'abc' } } as ToolCallSpec,
      ]),
    }));
    snapshot.appendMessage(new Message(MessageRole.TOOL, {
      content: null,
      tool_payload: new ToolResultPayload('call_1', 'search', { ok: true }, null),
    }));

    const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      agent_id: 'agent_1',
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
    });

    expect(payload.schema_version).toBe(WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION);
    expect(WorkingContextSnapshotSerializer.validate(payload)).toBe(true);

    const { snapshot: restored, metadata } = WorkingContextSnapshotSerializer.deserialize(payload);
    expect(metadata.agent_id).toBe('agent_1');

    const messages = restored.buildMessages();
    expect(messages.map((message) => message.role)).toEqual([
      MessageRole.SYSTEM,
      MessageRole.USER,
      MessageRole.ASSISTANT,
      MessageRole.ASSISTANT,
      MessageRole.TOOL,
    ]);
    expect(messages[2].reasoning_content).toBe('Because');
    expect(messages[2].image_urls).toEqual(['img://1']);
    expect(messages[3].tool_payload).toBeInstanceOf(ToolCallPayload);
    expect(messages[4].tool_payload).toBeInstanceOf(ToolResultPayload);
  });

  it('rejects stale schema versions', () => {
    expect(
      WorkingContextSnapshotSerializer.validate({
        schema_version: 1,
        agent_id: 'agent_1',
        messages: [],
      } as any)
    ).toBe(false);
  });

  it('normalizes non-JSON tool results', () => {
    class Weird {
      toString() {
        return '<weird>';
      }
    }

    const snapshot = new WorkingContextSnapshot();
    snapshot.appendMessage(new Message(MessageRole.TOOL, {
      content: null,
      tool_payload: new ToolResultPayload('call_2', 'weird', new Weird(), null),
    }));

    const payload = WorkingContextSnapshotSerializer.serialize(snapshot, {
      agent_id: 'agent_2',
      schema_version: WorkingContextSnapshotSerializer.CURRENT_SCHEMA_VERSION,
    });

    expect(() => JSON.stringify(payload)).not.toThrow();
  });
});
