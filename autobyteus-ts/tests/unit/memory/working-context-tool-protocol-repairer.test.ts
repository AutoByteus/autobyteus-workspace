import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import {
  repairWorkingContextToolProtocol,
  SYNTHETIC_TOOL_RESULT_ERROR,
} from '../../../src/memory/working-context-tool-protocol-repairer.js';
import {
  buildSingleMessageProvenance,
  setWorkingContextMessageProvenance,
} from '../../../src/memory/working-context-provenance.js';
import { toolCallIdentityKey } from '../../../src/memory/models/tool-call-identity.js';

const assistantToolCall = (ids: string[]) => new Message(MessageRole.ASSISTANT, {
  content: 'I need tools.',
  tool_payload: new ToolCallPayload(
    ids.map((id) => ({ id, name: `tool_${id}`, arguments: { id } })),
  ),
});

const toolResult = (id: string, result: unknown) => new Message(MessageRole.TOOL, {
  tool_payload: new ToolResultPayload(id, `tool_${id}`, result),
});

describe('repairWorkingContextToolProtocol', () => {
  it('inserts a terminal synthetic error result immediately after a missing assistant tool call and is idempotent', () => {
    const messages = [
      new Message(MessageRole.USER, { content: 'start' }),
      assistantToolCall(['call_missing']),
      new Message(MessageRole.USER, { content: 'please continue' }),
    ];

    const repaired = repairWorkingContextToolProtocol(messages);

    expect(repaired.didRepair).toBe(true);
    expect(repaired.repairs).toEqual([
      expect.objectContaining({
        toolCallId: 'call_missing',
        toolName: 'tool_call_missing',
        source: 'synthetic_interrupted',
        toolResult: null,
        toolError: SYNTHETIC_TOOL_RESULT_ERROR('tool_call_missing', 'call_missing'),
        toolArgs: { id: 'call_missing' },
      }),
    ]);
    expect(repaired.messages.map((message) => message.role)).toEqual([
      MessageRole.USER,
      MessageRole.ASSISTANT,
      MessageRole.TOOL,
      MessageRole.USER,
    ]);
    expect((repaired.messages[2].tool_payload as ToolResultPayload).toolCallId).toBe('call_missing');
    expect((repaired.messages[2].tool_payload as ToolResultPayload).toolResult).toBeNull();
    expect((repaired.messages[2].tool_payload as ToolResultPayload).toolError).toBe(
      SYNTHETIC_TOOL_RESULT_ERROR('tool_call_missing', 'call_missing'),
    );

    const secondPass = repairWorkingContextToolProtocol(repaired.messages);
    expect(secondPass.didRepair).toBe(false);
    expect(secondPass.messages).toBe(repaired.messages);
  });

  it('preserves completed native tool-call/result pairs unchanged', () => {
    const messages = [assistantToolCall(['call_done']), toolResult('call_done', { ok: true })];

    const repaired = repairWorkingContextToolProtocol(messages);

    expect(repaired.didRepair).toBe(false);
    expect(repaired.messages).toBe(messages);
    expect(repaired.repairs).toEqual([]);
  });

  it('preserves completed raw facts in partial batches and synthesizes only missing calls', () => {
    const messages = [setWorkingContextMessageProvenance(
      assistantToolCall(['call_A', 'call_B']),
      buildSingleMessageProvenance([], 'turn_1'),
    )];

    const repaired = repairWorkingContextToolProtocol(messages, {
      completedToolResultsByIdentity: new Map([
        [toolCallIdentityKey({ turnId: 'turn_1', toolCallId: 'call_A' }), {
          toolCallId: 'call_A',
          toolName: 'tool_call_A',
          toolResult: 'SAFE_FACT',
          toolError: null,
          turnId: 'turn_1',
          rawTraceId: 'rt_A',
        }],
      ]),
    });

    expect(repaired.didRepair).toBe(true);
    expect(repaired.messages.map((message) => message.role)).toEqual([
      MessageRole.ASSISTANT,
      MessageRole.TOOL,
      MessageRole.TOOL,
    ]);
    expect((repaired.messages[1].tool_payload as ToolResultPayload).toolResult).toBe('SAFE_FACT');
    expect((repaired.messages[2].tool_payload as ToolResultPayload).toolResult).toBe(
      null,
    );
    expect((repaired.messages[2].tool_payload as ToolResultPayload).toolError).toBe(
      SYNTHETIC_TOOL_RESULT_ERROR('tool_call_B', 'call_B'),
    );
    expect(repaired.repairs.map((repair) => [repair.toolCallId, repair.source])).toEqual([
      ['call_A', 'raw_completed_result'],
      ['call_B', 'synthetic_interrupted'],
    ]);
  });
});
