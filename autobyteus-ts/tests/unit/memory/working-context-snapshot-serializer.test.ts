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
import { parseAnthropicAssistantTurn } from '../../../src/llm/api/anthropic-native-assistant-turn.js';
import { PROVIDER_NATIVE_ASSISTANT_TURN_KEY } from '../../../src/llm/provider-native/provider-native-assistant-turn.js';
import { messageWithoutPrefixBoundReasoning } from '../../../src/llm/provider-native/provider-native-history.js';

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
  agent_id: 'agent-1',
});

describe('WorkingContextSnapshotSerializer', () => {
  it('reads old v5 messages without a native turn and round-trips signed and reset native turns', () => {
    const old = WorkingContextSnapshotSerializer.deserialize({ schema_version: 5, ...payload() }).workingContext;
    expect(old.buildMessages()[2]!.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY]).toBeUndefined();
    const original = old.buildMessages()[2]!;
    const signed = new Message(MessageRole.ASSISTANT, {
      content: original.content,
      reasoning_content: original.reasoning_content,
      tool_payload: original.tool_payload,
      metadata: { ...original.metadata, [PROVIDER_NATIVE_ASSISTANT_TURN_KEY]: {
        provider: 'anthropic', blocks: [
          { type: 'thinking', thinking: 'synthetic', signature: 'signed' },
          { type: 'tool_use', id: 'call-1', name: 'inspect', input: { nested: true } },
        ],
      } },
    });
    old.replaceMessage(2, signed);
    const saved = WorkingContextSnapshotSerializer.serialize(old, { agent_id: 'agent-1' });
    const restored = WorkingContextSnapshotSerializer.deserialize(saved).workingContext;
    expect(parseAnthropicAssistantTurn(restored.buildMessages()[2]!.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY]).blocks[0])
      .toEqual({ type: 'thinking', thinking: 'synthetic', signature: 'signed' });
    restored.replaceMessage(2, messageWithoutPrefixBoundReasoning(restored.buildMessages()[2]!));
    const reset = WorkingContextSnapshotSerializer.deserialize(WorkingContextSnapshotSerializer.serialize(restored, {
      agent_id: 'agent-1',
    })).workingContext;
    expect(parseAnthropicAssistantTurn(reset.buildMessages()[2]!.metadata?.[PROVIDER_NATIVE_ASSISTANT_TURN_KEY]).blocks)
      .toEqual([{ type: 'tool_use', id: 'call-1', name: 'inspect', input: { nested: true } }]);
  });
  it('round-trips current messages, UTF-16 ranges, media, and native tool structures', () => {
    const serialized = payload();

    expect(WorkingContextSnapshotSerializer.validate(serialized)).toBe(true);
    expect(Object.keys(serialized)).toEqual(['agent_id', 'messages']);
    expect(JSON.stringify(serialized)).not.toContain('compactionId');
    expect(JSON.stringify(serialized)).not.toContain('episodeIds');
    expect(JSON.stringify(serialized)).not.toContain('semanticIds');
    expect(JSON.stringify(serialized)).not.toContain('lineage');

    const { workingContext, metadata } =
      WorkingContextSnapshotSerializer.deserialize(serialized);
    expect(metadata).toEqual({ agent_id: 'agent-1' });
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

  it('ignores root versions and extras without retaining them', () => {
    for (const version of [undefined, null, 1, 4, 5, 999, 'irrelevant']) {
      const source = { ...payload(), schema_version: version, compaction_id: 'c1', episode_ids: ['e1'] };
      expect(WorkingContextSnapshotSerializer.validate(source)).toBe(true);
      const { workingContext, metadata } = WorkingContextSnapshotSerializer.deserialize(source);
      expect(metadata).toEqual({ agent_id: 'agent-1' });
      expect(WorkingContextSnapshotSerializer.serialize(workingContext, metadata)).toEqual(payload());
    }
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
  it.each([
    ['invalid entry', (p: any) => { p.messages[0] = null; }],
    ['missing identity', (p: any) => { delete p.agent_id; }],
    ['missing messages', (p: any) => { delete p.messages; }],
    ['invalid role', (p: any) => { p.messages[0].role = 'unknown'; }],
    ['invalid content', (p: any) => { p.messages[0].content = 42; }],
    ['invalid media', (p: any) => { p.messages[0].image_urls = [42]; }],
    ['invalid metadata', (p: any) => { p.messages[0].metadata = []; }],
    ['missing provenance', (p: any) => { p.messages[0].metadata = {}; }],
    ['bad provenance ids', (p: any) => { p.messages[0].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY].rawTraceIds = [2]; }],
    ['numeric call id', (p: any) => { p.messages[2].tool_payload.tool_calls[0].id = 42; }],
    ['missing arguments', (p: any) => { delete p.messages[2].tool_payload.tool_calls[0].arguments; }],
    ['invalid payload', (p: any) => { p.messages[2].tool_payload = false; }],
    ['empty batch', (p: any) => { p.messages[2].tool_payload.tool_calls = []; }],
    ['invalid native', (p: any) => { p.messages[2].tool_payload.tool_calls[0].nativeToolCallContext = { provider: 'unsupported' }; }],
    ['numeric result id', (p: any) => { p.messages[3].tool_payload.tool_call_id = 42; }],
  ])('rejects %s without filtering or coercion', (_name, mutate) => {
    const source: any = structuredClone(payload());
    mutate(source);
    expect(WorkingContextSnapshotSerializer.validateEnvelope(source)).toBe(false);
    expect(WorkingContextSnapshotSerializer.validate(source)).toBe(false);
    expect(() => WorkingContextSnapshotSerializer.deserialize(source)).toThrow();
  });

  it('projects envelope/message/tool/provenance extras but preserves open semantic payload maps', () => {
    const source: any = structuredClone(payload());
    source.extra = 'root'; source.messages[2].extra = 'message';
    source.messages[2].tool_payload.extra = 'payload';
    source.messages[2].tool_payload.tool_calls[0].extra = 'call';
    source.messages[2].tool_payload.tool_calls[0].arguments.extra = { needed: true };
    source.messages[2].metadata.open = { needed: true };
    source.messages[2].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY].extra = 'obsolete';
    source.messages[1].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY].constituents[0].textRange.extra = true;
    const decoded = WorkingContextSnapshotSerializer.deserialize(source);
    const saved: any = WorkingContextSnapshotSerializer.serialize(decoded.workingContext, decoded.metadata);
    expect(saved.extra).toBeUndefined(); expect(saved.messages[2].extra).toBeUndefined();
    expect(saved.messages[2].tool_payload.extra).toBeUndefined();
    expect(saved.messages[2].tool_payload.tool_calls[0].extra).toBeUndefined();
    expect(saved.messages[2].tool_payload.tool_calls[0].arguments.extra).toEqual({ needed: true });
    expect(saved.messages[2].metadata.open).toEqual({ needed: true });
    expect(saved.messages[2].metadata[MEMORY_MESSAGE_PROVENANCE_METADATA_KEY].extra).toBeUndefined();
    expect(WorkingContextSnapshotSerializer.validate(saved)).toBe(true);
  });

});
