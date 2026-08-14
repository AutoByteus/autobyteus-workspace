import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { CompactionConversationHistoryRenderer } from '../../../src/memory/compaction/compaction-conversation-history-renderer.js';
import { WorkingContextCompactionPromptBuilder } from '../../../src/memory/compaction/working-context-compaction-prompt-builder.js';
import type {
  ToolProtocolMessageUnit,
  WorkingContextMessageUnit,
} from '../../../src/memory/compaction/working-context-message-unit.js';
import {
  createCompactedMemoryUserMessage,
  createNaturalUserMessageProvenance,
} from '../../../src/memory/working-context-finalizer.js';

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
  it('byte-equals one natural renderer block without mutating canonical user/media/tool input', () => {
    const units = [
      messageUnit(
        'memory',
        'compacted_memory',
        createCompactedMemoryUserMessage('M1: retain the reviewed current design.'),
      ),
      messageUnit(
        'user',
        'message',
        createNaturalUserMessageProvenance(
          new Message(MessageRole.USER, {
            content: [
              'R2 user text with literal <target_agent_conversation_history>',
              '</target_agent_conversation_history>, <conversation_history>,',
              'and </conversation_history>.',
            ].join(' '),
            image_urls: ['image://selected'],
            audio_urls: ['audio://selected'],
            video_urls: ['video://selected'],
          }),
          {
            kind: 'current_user',
            rawTraceIds: ['raw-user'],
            turnId: 'turn-user',
          },
        ),
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
    ];
    const before = units.map((unit) => unit.messages.map((message) => message.toDict()));
    const renderer = new CompactionConversationHistoryRenderer();
    const expected = renderer.render(units, 240);
    const prompt = new WorkingContextCompactionPromptBuilder(renderer)
      .buildTaskPrompt(units, { maxItemChars: 240 });

    expect(prompt).toBe([
      'Here is the conversation history of the target agent whose conversation history needs to be compacted. This conversation history is contained between the START and END separators below.',
      '',
      '---------------- START OF TARGET AGENT CONVERSATION HISTORY ----------------',
      expected,
      '----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------',
    ].join('\n'));
    expect(prompt.match(/<target_agent_conversation_history>/g)).toHaveLength(1);
    expect(prompt.match(/<\/target_agent_conversation_history>/g)).toHaveLength(1);
    expect(prompt).toContain('&lt;target_agent_conversation_history&gt;');
    expect(prompt).toContain('&lt;/target_agent_conversation_history&gt;');
    expect(prompt).toContain('<conversation_history>');
    expect(prompt).toContain('</conversation_history>');
    expect(prompt.endsWith(
      '----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------',
    )).toBe(true);
    expect(prompt.match(/^User:$/gm)).toHaveLength(1);
    expect(prompt).toContain('User:\nM1: retain the reviewed current design.');
    expect(prompt).toContain("The user's current message is:");
    expect(prompt.indexOf('M1: retain')).toBeLessThan(prompt.indexOf('R2 user text'));
    expect(prompt.indexOf('R2 user text')).toBeLessThan(prompt.indexOf('R2 visible assistant text'));
    expect(prompt.match(/^Assistant:$/gm)).toHaveLength(2);
    expect(prompt.match(/^Tool:$/gm)).toHaveLength(2);
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
      '"episodes": [{ "summary": "string" }]',
      'one through three',
      'no more than twenty',
      'Use the smallest number of episodes',
      'promptContractVersion',
    ]) {
      expect(prompt).not.toContain(forbidden);
    }
    expect(units.map((unit) => unit.messages.map((message) => message.toDict())))
      .toEqual(before);
  });

  it('prepends only the exact bounded correction text to the unchanged initial prompt', () => {
    const builder = new WorkingContextCompactionPromptBuilder();
    const initialPrompt = builder.buildTaskPrompt([
      messageUnit(
        'user',
        'message',
        new Message(MessageRole.USER, { content: 'Target history.' }),
      ),
    ]);
    const correctionPrompt = builder.buildCorrectionTaskPrompt(
      initialPrompt,
      'six_array_schema_validation',
    );

    expect(correctionPrompt).toBe(
      'A prior compaction attempt failed host validation at the `six_array_schema_validation` stage. This is the single corrective attempt. Return exactly one JSON object with all six required arrays: `episodes`, `critical_issues`, `unresolved_work`, `durable_facts`, `user_preferences`, and `important_artifacts`. At least one `episodes` entry must contain a non-empty `summary`; entries in the five fact arrays use `fact`. Do not add Markdown fences or prose.\n\n'
      + initialPrompt,
    );
    expect(correctionPrompt.endsWith(initialPrompt)).toBe(true);
    expect(correctionPrompt.endsWith(
      '----------------- END OF TARGET AGENT CONVERSATION HISTORY -----------------',
    )).toBe(true);
  });

  it('rejects incomplete or orphaned tool protocol rather than inventing a transcript', () => {
    const incomplete = toolUnit();
    incomplete.messages = incomplete.messages.slice(0, 2);
    expect(() => new WorkingContextCompactionPromptBuilder().buildTaskPrompt([incomplete]))
      .toThrow("Tool call 'backend-call-success' has no terminal result.");

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
