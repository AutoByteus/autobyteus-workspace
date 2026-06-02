import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
} from '../../../src/llm/utils/messages.js';
import { WorkingContextCompactionPromptBuilder } from '../../../src/memory/compaction/working-context-compaction-prompt-builder.js';
import type { WorkingContextMessageUnit } from '../../../src/memory/compaction/working-context-message-unit.js';

const makeToolCallUnit = (): WorkingContextMessageUnit => ({
  id: 'unit_1',
  kind: 'tool_protocol_group',
  startIndex: 1,
  endIndex: 1,
  rawTraceIds: [],
  toolCallIds: ['call_1'],
  matchedToolCallIds: [],
  isComplete: false,
  messages: [
    new Message(MessageRole.ASSISTANT, {
      reasoning_content: 'reason: need exact count',
      content: 'I will query the inventory service before deciding.',
      tool_payload: new ToolCallPayload([
        { id: 'call_1', name: 'inventory_lookup', arguments: { sku: 'A-1' } },
      ]),
    }),
  ],
});

describe('WorkingContextCompactionPromptBuilder', () => {
  it('preserves assistant content, reasoning, and canonical tool-call details for settled tool-call units', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([makeToolCallUnit()]);

    expect(prompt).toContain('I will query the inventory service before deciding.');
    expect(prompt).toContain('reason: need exact count');
    expect(prompt).toContain('inventory_lookup');
    expect(prompt).toContain('call_1');
    expect(prompt).toContain('A-1');
    expect(prompt).not.toContain('[BLOCK');
    expect(prompt).not.toContain('turn=');
  });
});
