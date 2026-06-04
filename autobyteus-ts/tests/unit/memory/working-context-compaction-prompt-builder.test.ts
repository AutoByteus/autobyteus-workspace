import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { WorkingContextCompactionPromptBuilder } from '../../../src/memory/compaction/working-context-compaction-prompt-builder.js';
import type { WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';

const makeToolCallUnit = (messages: Message[] = [
  new Message(MessageRole.ASSISTANT, {
    reasoning_content: 'reason: need exact count',
    content: 'I will query the inventory service before deciding.',
    tool_payload: new ToolCallPayload([
      { id: 'call_1', name: 'inventory_lookup', arguments: { sku: 'A-1' } },
    ]),
  }),
]): WorkingContextMessageUnit => ({
  id: 'unit_1',
  kind: 'tool_protocol_group',
  startIndex: 1,
  endIndex: messages.length,
  rawTraceIds: [],
  toolCallIds: ['call_1'],
  matchedToolCallIds: messages.some((message) =>
    message.tool_payload instanceof ToolResultPayload && message.tool_payload.toolCallId === 'call_1'
  ) ? ['call_1'] : [],
  isComplete: messages.some((message) =>
    message.tool_payload instanceof ToolResultPayload && message.tool_payload.toolCallId === 'call_1'
  ),
  messages,
});

describe('WorkingContextCompactionPromptBuilder', () => {
  it('uses natural context-summary copy and the conversation-history section label', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      {
        id: 'unit_user',
        kind: 'message',
        startIndex: 0,
        endIndex: 0,
        rawTraceIds: [],
        messages: [new Message(MessageRole.USER, { content: 'Please preserve the agent-based plan.' })],
      },
    ]);

    expect(prompt).toContain('Summarize the earlier conversation history below so future work can continue with refreshed context.');
    expect(prompt).toContain('[CONVERSATION_HISTORY_TO_SUMMARIZE]');
    expect(prompt).toContain('Focus on useful conversation facts; omit bookkeeping identifiers and low-level event details.');
    expect(prompt).not.toContain('AutoByteus memory');
    expect(prompt).not.toContain('working-context transcript');
    expect(prompt).not.toContain('runtime internals');
    expect(prompt).not.toContain('turn ids');
    expect(prompt).not.toContain('raw trace ids');
    expect(prompt).not.toContain('source events');
    expect(prompt).not.toContain('block ids');
    expect(prompt).not.toMatch(/\bsettled\b/i);
  });

  it('preserves assistant content, work notes, and canonical tool-call details for tool-call units', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([makeToolCallUnit()]);

    expect(prompt).toContain('I will query the inventory service before deciding.');
    expect(prompt).toContain('reason: need exact count');
    expect(prompt).toContain('Assistant work notes:');
    expect(prompt).toContain('inventory_lookup');
    expect(prompt).toContain('call_1');
    expect(prompt).toContain('A-1');
    expect(prompt).not.toContain('[BLOCK');
    expect(prompt).not.toContain('turn=');
  });

  it('renders grouped tool interactions with result call IDs', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      makeToolCallUnit([
        new Message(MessageRole.ASSISTANT, {
          reasoning_content: 'Need exact inventory before deciding.',
          content: 'I will query the inventory service before deciding.',
          tool_payload: new ToolCallPayload([
            { id: 'call_123', name: 'inventory_lookup', arguments: { sku: 'A-1' } },
          ]),
        }),
        new Message(MessageRole.TOOL, {
          tool_payload: new ToolResultPayload('call_123', 'inventory_lookup', { count: 7 }),
        }),
      ]),
    ]);

    expect(prompt).toContain('Tool interaction call_123:');
    expect(prompt).toContain('- Request for call call_123: inventory_lookup with arguments sku: A-1.');
    expect(prompt).toContain('- Result for call call_123 from inventory_lookup: count: 7');
  });

  it('keeps multi-call results paired with the correct originating call IDs', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      {
        id: 'unit_multi',
        kind: 'tool_protocol_group',
        startIndex: 0,
        endIndex: 2,
        rawTraceIds: [],
        toolCallIds: ['call_count', 'call_price'],
        matchedToolCallIds: ['call_count', 'call_price'],
        isComplete: true,
        messages: [
          new Message(MessageRole.ASSISTANT, {
            content: 'I will query count and price.',
            tool_payload: new ToolCallPayload([
              { id: 'call_count', name: 'inventory_lookup', arguments: { sku: 'A-1' } },
              { id: 'call_price', name: 'price_lookup', arguments: { sku: 'A-1' } },
            ]),
          }),
          new Message(MessageRole.TOOL, {
            tool_payload: new ToolResultPayload('call_price', 'price_lookup', { price: 42 }),
          }),
          new Message(MessageRole.TOOL, {
            tool_payload: new ToolResultPayload('call_count', 'inventory_lookup', { count: 7 }),
          }),
        ],
      },
    ]);

    expect(prompt).toContain('- Result for call call_count from inventory_lookup: count: 7');
    expect(prompt).toContain('- Result for call call_price from price_lookup: price: 42');
    expect(prompt.indexOf('Tool interaction call_count:')).toBeLessThan(prompt.indexOf('Tool interaction call_price:'));
  });

  it('renders standalone tool results as explicit unmatched results with call IDs', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      {
        id: 'unit_orphan',
        kind: 'message',
        startIndex: 0,
        endIndex: 0,
        rawTraceIds: [],
        messages: [
          new Message(MessageRole.TOOL, {
            tool_payload: new ToolResultPayload('call_999', 'inventory_lookup', { count: 7 }),
          }),
        ],
      },
    ]);

    expect(prompt).toContain('Unmatched tool result for call call_999 from inventory_lookup: count: 7');
  });
});
