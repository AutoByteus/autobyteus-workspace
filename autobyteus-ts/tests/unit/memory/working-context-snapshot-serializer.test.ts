import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import {
  createCompactedMemoryUserMessage,
  createNaturalUserMessageProvenance,
  WorkingContextFinalizer,
} from '../../../src/memory/working-context-finalizer.js';
import { MEMORY_MESSAGE_PROVENANCE_METADATA_KEY } from '../../../src/memory/working-context-provenance.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';
import { ANTHROPIC_ASSISTANT_TURN_KEY, parseAnthropicAssistantTurn, withoutAnthropicThinkingInMessage } from '../../../src/llm/utils/provider-native-assistant-turn.js';

const currentContext = () => new WorkingContextFinalizer().finalize({
  messages: [
    new Message(MessageRole.SYSTEM, { content: 'System' }),
    createCompactedMemoryUserMessage('M1 memory 🧠'),
    createNaturalUserMessageProvenance(new Message(MessageRole.USER, {
      content: 'Current user 🚀',
      image_urls: ['image://one'],
      audio_urls: ['audio://one'],
      video_urls: ['video://one'],
    }), {
      kind: 'current_user',
      rawTraceIds: ['raw-user'],
      turnId: 'turn-user',
    }),
    new Message(MessageRole.ASSISTANT, {
      content: 'Calling tool.',
      reasoning_content: 'provider-required reasoning',
      tool_payload: new ToolCallPayload([{
        id: 'call-1',
        name: 'inspect',
        arguments: { nested: true },
        nativeToolCallContext: {
          provider: 'openai_responses',
          functionCallItem: { opaque: 'wire-context' },
        },
      }]),
    }),
    new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload('call-1', 'inspect', { ok: true }),
    }),
  ],
});

const payload = () => WorkingContextSnapshotSerializer.serialize(currentContext(), {
  schema_version: 5,
  agent_id: 'agent-1',
});

describe('WorkingContextSnapshotSerializer', () => {
  it('reads old v5 messages without a native turn and round-trips signed and reset native turns', () => {
    const old = WorkingContextSnapshotSerializer.deserialize(payload()).workingContext;
    expect(old.buildMessages()[3]!.metadata?.[ANTHROPIC_ASSISTANT_TURN_KEY]).toBeUndefined();
    const original = old.buildMessages()[3]!;
    const signed = new Message(MessageRole.ASSISTANT, {
      content: original.content,
      reasoning_content: original.reasoning_content,
      tool_payload: original.tool_payload,
      metadata: { ...original.metadata, [ANTHROPIC_ASSISTANT_TURN_KEY]: {
        provider: 'anthropic', blocks: [
          { type: 'thinking', thinking: 'synthetic', signature: 'signed' },
          { type: 'tool_use', id: 'call-1', name: 'inspect', input: { nested: true } },
        ],
      } },
    });
    old.replaceMessage(3, signed);
    const saved = WorkingContextSnapshotSerializer.serialize(old, { schema_version: 5, agent_id: 'agent-1' });
    const restored = WorkingContextSnapshotSerializer.deserialize(saved).workingContext;
    expect(parseAnthropicAssistantTurn(restored.buildMessages()[3]!.metadata?.[ANTHROPIC_ASSISTANT_TURN_KEY]).blocks[0])
      .toEqual({ type: 'thinking', thinking: 'synthetic', signature: 'signed' });
    restored.replaceMessage(3, withoutAnthropicThinkingInMessage(restored.buildMessages()[3]!));
    const reset = WorkingContextSnapshotSerializer.deserialize(WorkingContextSnapshotSerializer.serialize(restored, {
      schema_version: 5, agent_id: 'agent-1',
    })).workingContext;
    expect(parseAnthropicAssistantTurn(reset.buildMessages()[3]!.metadata?.[ANTHROPIC_ASSISTANT_TURN_KEY]).blocks)
      .toEqual([{ type: 'tool_use', id: 'call-1', name: 'inspect', input: { nested: true } }]);
  });
  it('round-trips finalized v5 messages, UTF-16 ranges, media, and native tool structures', () => {
    const serialized = payload();

    expect(WorkingContextSnapshotSerializer.validate(serialized)).toBe(true);
    expect(Object.keys(serialized)).toEqual(['schema_version', 'agent_id', 'messages']);
    expect(JSON.stringify(serialized)).not.toContain('compactionId');
    expect(JSON.stringify(serialized)).not.toContain('episodeIds');
    expect(JSON.stringify(serialized)).not.toContain('semanticIds');
    expect(JSON.stringify(serialized)).not.toContain('lineage');

    const { workingContext, metadata } =
      WorkingContextSnapshotSerializer.deserialize(serialized);
    expect(metadata).toEqual({ schema_version: 5, agent_id: 'agent-1' });
    expect(workingContext.buildMessages().map((message) => message.toDict()))
      .toEqual(currentContext().buildMessages().map((message) => message.toDict()));

    const user = workingContext.buildMessages()[1]!;
    const provenance = user.metadata?.[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY] as any;
    expect(user.content).toContain('M1 memory 🧠');
    expect(user.content).toContain('Current user 🚀');
    expect(provenance.constituents).toMatchObject([
      { kind: 'compacted_memory', textRange: { start: 0 } },
      {
        kind: 'current_user',
        rawTraceIds: ['raw-user'],
        turnId: 'turn-user',
        imageRange: { start: 0, end: 1 },
        audioRange: { start: 0, end: 1 },
        videoRange: { start: 0, end: 1 },
      },
    ]);
    expect(provenance.constituents[0].textRange.end).toBe('M1 memory 🧠'.length);
  });

  it('rejects pre-v5 roots and identity-bearing or unknown root fields', () => {
    const current = payload();
    expect(WorkingContextSnapshotSerializer.validate({
      ...current,
      schema_version: 4,
    })).toBe(false);
    expect(WorkingContextSnapshotSerializer.validate({
      ...current,
      compaction_id: 'c1',
    })).toBe(false);
    expect(WorkingContextSnapshotSerializer.validate({
      ...current,
      episode_ids: ['e1'],
    })).toBe(false);
  });

  it('rejects invalid, overlapping, or out-of-bounds constituent ranges', () => {
    const outOfBounds = structuredClone(payload()) as any;
    const user = outOfBounds.messages[1];
    user.metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]
      .constituents[0].textRange.end = user.content.length + 1;
    expect(WorkingContextSnapshotSerializer.validate(outOfBounds)).toBe(false);

    const overlap = structuredClone(payload()) as any;
    overlap.messages[1].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]
      .constituents[1].textRange.start = 1;
    expect(WorkingContextSnapshotSerializer.validate(overlap)).toBe(false);

    const invalidMedia = structuredClone(payload()) as any;
    invalidMedia.messages[1].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY]
      .constituents[1].imageRange.end = 2;
    expect(WorkingContextSnapshotSerializer.validate(invalidMedia)).toBe(false);
  });

  it('normalizes non-JSON tool results without introducing a second schema path', () => {
    const cyclic: Record<string, unknown> = {};
    cyclic.self = cyclic;
    const context = new WorkingContextFinalizer().finalize({
      messages: [
        new Message(MessageRole.SYSTEM, { content: 'System' }),
        new Message(MessageRole.ASSISTANT, {
          tool_payload: new ToolCallPayload([{ id: 'call', name: 'tool', arguments: {} }]),
        }),
        new Message(MessageRole.TOOL, {
          tool_payload: new ToolResultPayload('call', 'tool', cyclic),
        }),
      ],
    });
    const serialized = WorkingContextSnapshotSerializer.serialize(context, {
      agent_id: 'agent-cyclic',
    });

    expect(WorkingContextSnapshotSerializer.validate(serialized)).toBe(true);
    expect(JSON.stringify(serialized)).toContain('[object Object]');
  });
});
