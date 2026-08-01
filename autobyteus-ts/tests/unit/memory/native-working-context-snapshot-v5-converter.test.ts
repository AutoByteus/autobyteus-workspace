import { describe, expect, it } from 'vitest';
import { MessageRole, ToolCallPayload, ToolResultPayload } from '../../../src/llm/utils/messages.js';
import {
  NativeWorkingContextSnapshotV5Converter,
  type NativeSnapshotReferenceFact,
} from '../../../src/memory/migration/native-working-context-snapshot-v5-converter.js';
import { getWorkingContextMessageProvenance } from '../../../src/memory/working-context-provenance.js';
import { WorkingContextSnapshotSerializer } from '../../../src/memory/working-context-snapshot-serializer.js';

const encoder = new TextEncoder();
const provenance = (rawTraceIds: string[], turnId = 'turn-1') => ({
  autobyteus_memory_provenance: {
    kind: 'single',
    rawTraceIds,
    turnId,
  },
});

const referenceFact = (
  overrides: Partial<NativeSnapshotReferenceFact> & Pick<NativeSnapshotReferenceFact, 'id' | 'traceType'>,
): NativeSnapshotReferenceFact => ({
  id: overrides.id,
  turnId: overrides.turnId ?? 'turn-1',
  seq: overrides.seq ?? 1,
  traceType: overrides.traceType,
  sourceEvent: overrides.sourceEvent ?? 'test',
  content: overrides.content ?? '',
  media: overrides.media ?? null,
  toolName: overrides.toolName ?? null,
  toolCallId: overrides.toolCallId ?? null,
  toolArgs: overrides.toolArgs ?? null,
  toolResult: overrides.toolResult,
  toolError: overrides.toolError,
  correlationId: overrides.correlationId ?? null,
});

const source = (schemaVersion: number, messages: unknown[], extra: Record<string, unknown> = {}) =>
  encoder.encode(JSON.stringify({
    schema_version: schemaVersion,
    agent_id: 'agent-migrate',
    messages,
    ...extra,
  }));

const convert = (
  sourceBytes: Uint8Array,
  facts: NativeSnapshotReferenceFact[],
  expectedSnapshotAgentId = 'agent-migrate',
) => new NativeWorkingContextSnapshotV5Converter().convert({
  expectedSnapshotAgentId,
  sourceBytes,
  eligibleActiveReferenceFacts: facts,
});

describe('NativeWorkingContextSnapshotV5Converter', () => {
  it.each([1, 3, 4, 5])(
    'converts schema v%i system, media user, and complete Tool protocol with exact active provenance',
    (schemaVersion) => {
      const messages = [
        { role: MessageRole.SYSTEM, content: 'System contract' },
        {
          role: MessageRole.USER,
          content: 'Inspect the retained image',
          image_urls: ['data:image/png;base64,aW1hZ2U='],
          metadata: provenance(['raw-user']),
        },
        {
          role: MessageRole.ASSISTANT,
          content: 'Reading the artifact.',
          tool_payload: {
            tool_calls: [{ id: 'call-1', name: 'read_file', arguments: { path: '/tmp/a.txt' } }],
          },
          metadata: provenance(['raw-assistant', 'raw-call']),
        },
        {
          role: MessageRole.TOOL,
          content: null,
          tool_payload: {
            tool_call_id: 'call-1',
            tool_name: 'read_file',
            tool_result: 'retained result',
            tool_error: null,
          },
          metadata: provenance(['raw-result']),
        },
      ];
      const facts = [
        referenceFact({
          id: 'raw-user',
          traceType: 'user',
          content: 'Inspect the retained image',
          media: { images: ['data:image/png;base64,aW1hZ2U='] },
        }),
        referenceFact({ id: 'raw-assistant', traceType: 'assistant', content: 'Reading the artifact.' }),
        referenceFact({
          id: 'raw-call',
          traceType: 'tool_call',
          seq: 2,
          toolName: 'read_file',
          toolCallId: 'call-1',
          toolArgs: { path: '/tmp/a.txt' },
        }),
        referenceFact({
          id: 'raw-result',
          traceType: 'tool_result',
          seq: 3,
          toolName: 'read_file',
          toolCallId: 'call-1',
          toolResult: 'retained result',
          toolError: null,
        }),
      ];

      const result = convert(source(schemaVersion, messages), facts);

      expect(result).toMatchObject({ kind: 'candidate', mode: 'converted' });
      if (result.kind !== 'candidate') throw new Error('expected candidate');
      const retained = result.workingContext.buildMessages();
      expect(retained.map(({ role }) => role)).toEqual([
        MessageRole.SYSTEM,
        MessageRole.USER,
        MessageRole.ASSISTANT,
        MessageRole.TOOL,
      ]);
      expect(retained[1]).toMatchObject({
        content: 'Inspect the retained image',
        image_urls: ['data:image/png;base64,aW1hZ2U='],
      });
      expect(getWorkingContextMessageProvenance(retained[1]!)).toMatchObject({
        kind: 'composed_user',
        constituents: [{ kind: 'retained_user', rawTraceIds: ['raw-user'] }],
      });
      expect(retained[2]?.tool_payload).toBeInstanceOf(ToolCallPayload);
      expect(retained[3]?.tool_payload).toBeInstanceOf(ToolResultPayload);
      expect(WorkingContextSnapshotSerializer.validate(
        WorkingContextSnapshotSerializer.serialize(result.workingContext, {
          agent_id: 'agent-migrate',
        }),
      )).toBe(true);
    },
  );

  it('keeps only truthfully backed current-user constituents and omits old compacted memory', () => {
    const combined = 'Obsolete compacted region\n\nCurrent retained request';
    const result = convert(source(4, [{
      role: MessageRole.USER,
      content: combined,
      metadata: {
        autobyteus_memory_provenance: {
          kind: 'composed_user',
          constituents: [
            {
              kind: 'compacted_memory',
              textRange: { start: 0, end: 25 },
              imageRange: { start: 0, end: 0 },
              audioRange: { start: 0, end: 0 },
              videoRange: { start: 0, end: 0 },
            },
            {
              kind: 'current_user',
              textRange: { start: 27, end: combined.length },
              imageRange: { start: 0, end: 0 },
              audioRange: { start: 0, end: 0 },
              videoRange: { start: 0, end: 0 },
              rawTraceIds: ['raw-current'],
              turnId: 'turn-current',
            },
          ],
        },
      },
    }]), [referenceFact({
      id: 'raw-current',
      traceType: 'user',
      turnId: 'turn-current',
      content: 'Current retained request',
    })]);

    expect(result).toMatchObject({
      kind: 'candidate',
      mode: 'converted_with_omissions',
      omissions: { reasonCodes: expect.arrayContaining(['old_compacted_memory']) },
    });
    if (result.kind !== 'candidate') throw new Error('expected candidate');
    expect(result.workingContext.buildMessages()).toMatchObject([
      { role: MessageRole.USER, content: 'Current retained request' },
    ]);
    expect(JSON.stringify(result.workingContext.buildMessages())).not.toContain('Obsolete compacted');
  });

  it('omits incomplete Tool groups rather than synthesizing results or recovery text', () => {
    const result = convert(source(3, [{
      role: MessageRole.ASSISTANT,
      content: null,
      tool_payload: {
        tool_calls: [{ id: 'call-missing', name: 'write_file', arguments: { path: '/tmp/x' } }],
      },
      metadata: provenance(['raw-call']),
    }]), [referenceFact({
      id: 'raw-call',
      traceType: 'tool_call',
      toolName: 'write_file',
      toolCallId: 'call-missing',
      toolArgs: { path: '/tmp/x' },
    })]);

    expect(result).toMatchObject({
      kind: 'candidate',
      mode: 'converted_with_omissions',
      omissions: {
        droppedToolGroupCount: 1,
        reasonCodes: expect.arrayContaining(['incomplete_or_ambiguous_tool_group', 'empty_candidate']),
      },
    });
    if (result.kind !== 'candidate') throw new Error('expected candidate');
    expect(result.workingContext.buildMessages()).toEqual([]);
    expect(JSON.stringify(result)).not.toMatch(/interrupted|synthetic|recovery/i);
  });

  it.each([
    ['invalid JSON', encoder.encode('{not-json'), 'invalid_source_json'],
    ['unsupported schema', source(2, [{ role: MessageRole.SYSTEM, content: 'ignored' }]), 'unsupported_source_schema'],
    ['fully unsourced content', source(1, [{ role: MessageRole.USER, content: 'untrusted' }]), 'unsourced_message'],
  ])('publishes a metadata-identified empty strict v5 candidate for %s', (_name, bytes, reasonCode) => {
    const result = convert(bytes, []);

    expect(result).toMatchObject({
      kind: 'candidate',
      mode: 'converted_with_omissions',
      omissions: { reasonCodes: expect.arrayContaining([reasonCode]) },
    });
    if (result.kind !== 'candidate') throw new Error('expected candidate');
    const payload = WorkingContextSnapshotSerializer.serialize(result.workingContext, {
      agent_id: 'agent-migrate',
    });
    expect(payload).toEqual({ schema_version: 5, agent_id: 'agent-migrate', messages: [] });
    expect(WorkingContextSnapshotSerializer.validate(payload)).toBe(true);
  });

  it.each([
    ['missing_source_agent_id', encoder.encode(JSON.stringify({ schema_version: 4, messages: [] }))],
    ['source_agent_id_mismatch', source(4, [], { agent_id: 'different-agent' })],
  ])('rejects parseable identity conflict %s without producing a candidate', (reasonCode, bytes) => {
    expect(convert(bytes, [])).toEqual({ kind: 'identity_rejected', reasonCode });
  });
});
