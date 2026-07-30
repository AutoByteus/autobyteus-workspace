import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { WorkingContextCompactionPromptBuilder } from '../../../src/memory/compaction/working-context-compaction-prompt-builder.js';
import type {
  ToolProtocolMessageUnit,
  WorkingContextMessageUnit,
} from '../../../src/memory/compaction/working-context-message-unit.js';

const messageUnit = (
  id: string,
  kind: 'message' | 'compacted_memory',
  message: Message,
): WorkingContextMessageUnit => ({
  id,
  kind,
  startIndex: 0,
  endIndex: 0,
  messages: [message],
  rawTraceIds: kind === 'compacted_memory' ? [] : [`raw-${id}`],
});

const toolUnit = (): ToolProtocolMessageUnit => ({
  id: 'tools',
  kind: 'tool_protocol_group',
  startIndex: 3,
  endIndex: 5,
  rawTraceIds: ['raw-tool-call', 'raw-tool-success', 'raw-tool-error'],
  toolCallIds: ['backend-call-success', 'backend-call-error'],
  matchedToolCallIds: ['backend-call-success', 'backend-call-error'],
  isComplete: true,
  messages: [
    new Message(MessageRole.ASSISTANT, {
      content: 'I will inspect both values.',
      reasoning_content: 'PRIVATE_REASONING_MUST_NOT_RENDER',
      tool_payload: new ToolCallPayload([
        {
          id: 'backend-call-success',
          name: 'run_command',
          arguments: {
            command: `head-${'x'.repeat(240)}-tail`,
            api_key: 'sk-abcdefghijklmnopqrstuvwxyz',
          },
        },
        {
          id: 'backend-call-error',
          name: 'read_file',
          arguments: { path: '/tmp/short.txt' },
        },
      ]),
    }),
    new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload(
        'backend-call-error',
        'read_file',
        null,
        `error-head-${'e'.repeat(240)}-error-tail`,
      ),
    }),
    new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload(
        'backend-call-success',
        'run_command',
        `result-head-${'r'.repeat(240)}-result-tail`,
      ),
    }),
  ],
});

describe('WorkingContextCompactionPromptBuilder', () => {
  it('renders recurrent memory and R2 as one natural, bounded, reasoning-free conversation', () => {
    const prompt = new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      messageUnit(
        'memory',
        'compacted_memory',
        new Message(MessageRole.USER, { content: 'M1: retain the reviewed current design.' }),
      ),
      messageUnit(
        'user',
        'message',
        new Message(MessageRole.USER, {
          content: 'R2 user text with literal <conversation_history> and </conversation_history>.',
        }),
      ),
      messageUnit(
        'assistant',
        'message',
        new Message(MessageRole.ASSISTANT, {
          content: 'R2 visible assistant text.',
          reasoning_content: 'SEPARATE_PRIVATE_REASONING',
        }),
      ),
      toolUnit(),
    ], { maxItemChars: 120 });

    expect(prompt.match(/<conversation_history>/g)).toHaveLength(1);
    expect(prompt.match(/<\/conversation_history>/g)).toHaveLength(1);
    expect(prompt).toContain(
      'User:\nM1: retain the reviewed current design.\n\n' +
      'User:\nR2 user text with literal &lt;conversation_history&gt; and &lt;/conversation_history&gt;.',
    );
    expect(prompt.indexOf('M1: retain')).toBeLessThan(prompt.indexOf('R2 user text'));
    expect(prompt.indexOf('R2 user text')).toBeLessThan(prompt.indexOf('R2 visible assistant text'));
    expect(prompt.indexOf('name: run_command')).toBeLessThan(prompt.indexOf('name: read_file'));
    expect(prompt).toContain('Tool:\nname: run_command\nstatus: success');
    expect(prompt).toContain('Tool:\nname: read_file\nstatus: error');
    expect(prompt).toContain('result:');
    expect(prompt).toContain('error:');
    expect(prompt).toMatch(/… \[\d+ characters omitted\] …/);
    expect(prompt).toContain('head-');
    expect(prompt).toContain('-tail');
    expect(prompt).toContain('<redacted-secret>');

    for (const forbidden of [
      'PRIVATE_REASONING_MUST_NOT_RENDER',
      'SEPARATE_PRIVATE_REASONING',
      'Assistant work notes',
      'Assistant tool call',
      'backend-call-success',
      'backend-call-error',
      'raw-tool-call',
      '[CONVERSATION_HISTORY_TO_SUMMARIZE]',
      '[REQUIRED_FINAL_JSON_SHAPE]',
    ]) {
      expect(prompt).not.toContain(forbidden);
    }
    expect(prompt).toContain('"episodes": [{ "summary": "string" }]');
    expect(prompt).toContain('one through three episodes and no more than twenty facts');
  });

  it('rejects incomplete or orphaned tool protocol rather than inventing a transcript', () => {
    const incomplete = toolUnit();
    incomplete.isComplete = false;
    incomplete.matchedToolCallIds = ['backend-call-success'];
    expect(() => new WorkingContextCompactionPromptBuilder().buildTaskPrompt([incomplete]))
      .toThrow('Incomplete tool protocol');

    expect(() => new WorkingContextCompactionPromptBuilder().buildTaskPrompt([
      messageUnit(
        'orphan',
        'message',
        new Message(MessageRole.TOOL, {
          tool_payload: new ToolResultPayload('orphan-id', 'tool', 'value'),
        }),
      ),
    ])).toThrow('complete tool protocol units');
  });
});
