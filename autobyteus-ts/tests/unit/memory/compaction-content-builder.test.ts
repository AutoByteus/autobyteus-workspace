import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload,
} from '../../../src/llm/utils/messages.js';
import { CompactionConversationHistoryRenderer } from '../../../src/memory/compaction/compaction-conversation-history-renderer.js';
import {
  CompactionPromptConstructionError,
  CompactionContentBuilder,
} from '../../../src/memory/compaction/compaction-content-builder.js';
import type {
  ToolProtocolMessageUnit,
  WorkingContextMessageUnit,
} from '../../../src/memory/compaction/working-context-message-unit.js';
import {
  createCompactedMemoryUserMessage,
  createNaturalUserMessageProvenance,
} from '../../../src/memory/working-context-finalizer.js';
import { providerSafeCompactionText } from '../../../src/memory/presentation/unicode-safe-text.js';

const shieldFixture = JSON.parse(fs.readFileSync(
  new URL('../../fixtures/memory/compaction-unicode-shield-tool-trace.json', import.meta.url),
  'utf8',
)) as {
  tool_name: string;
  tool_call_id: string;
  tool_args: Record<string, unknown>;
  tool_result: Record<string, unknown>;
};

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

const shieldToolUnit = (): ToolProtocolMessageUnit => ({
  id: 'shield-tool',
  kind: 'tool_protocol_group',
  startIndex: 0,
  endIndex: 1,
  rawTraceIds: ['raw-shield-call', 'raw-shield-result'],
  toolCallIds: [shieldFixture.tool_call_id],
  matchedToolCallIds: [shieldFixture.tool_call_id],
  isComplete: true,
  messages: [
    new Message(MessageRole.ASSISTANT, {
      tool_payload: new ToolCallPayload([{
        id: shieldFixture.tool_call_id,
        name: shieldFixture.tool_name,
        arguments: shieldFixture.tool_args,
      }]),
    }),
    new Message(MessageRole.TOOL, {
      tool_payload: new ToolResultPayload(
        shieldFixture.tool_call_id,
        shieldFixture.tool_name,
        shieldFixture.tool_result,
      ),
    }),
  ],
});

describe('CompactionContentBuilder', () => {
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
    const prompt = new CompactionContentBuilder(renderer)
      .build(units, { maxItemChars: 240 });

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
    expect(prompt.match(/^Tool \(.*\):$/gm)).toHaveLength(2);
    expect(prompt.indexOf('name: run_command')).toBeLessThan(prompt.indexOf('name: read_file'));
    expect(prompt).toContain('Tool (backend-call-success; argument/result values may be excerpted):\nname: run_command\nstatus: success');
    expect(prompt).toContain('Tool (backend-call-error; argument/result values may be excerpted):\nname: read_file\nstatus: error');
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

  it('builds a provider-safe prompt from the exact shield tool-result fixture', () => {
    const before = JSON.stringify(shieldFixture);
    const prompt = new CompactionContentBuilder().build(
      [shieldToolUnit()],
      { maxItemChars: 2_000 },
    );

    expect(providerSafeCompactionText.isProviderSafeText(prompt)).toBe(true);
    expect(prompt).not.toContain('\uFFFD');
    expect(prompt).toMatch(/… \[\d+ characters omitted\] …/u);
    expect(JSON.parse(JSON.stringify({ content: prompt }))).toEqual({ content: prompt });
    expect(JSON.stringify(shieldFixture)).toBe(before);
  });

  it('does not apply a whole-task character clamp while finalizing the completed prompt', () => {
    const renderedHistory = 'x'.repeat(540_727);
    const renderer = {
      render: () => renderedHistory,
    } as unknown as CompactionConversationHistoryRenderer;
    const prompt = new CompactionContentBuilder(renderer).build([]);

    expect(prompt).toContain(renderedHistory);
    expect(prompt.length).toBeGreaterThan(renderedHistory.length);
    expect(providerSafeCompactionText.isProviderSafeText(prompt)).toBe(true);
  });

  it('throws a typed local construction failure when the final invariant is not met', () => {
    const failedBoundary = {
      finalize: () => '\uD83D',
      isProviderSafeText: () => false,
    };
    const builder = new CompactionContentBuilder(
      new CompactionConversationHistoryRenderer(),
      failedBoundary,
    );

    expect(() => builder.build([
      messageUnit('user', 'message', new Message(MessageRole.USER, { content: 'Target.' })),
    ])).toThrowError(expect.objectContaining<Partial<CompactionPromptConstructionError>>({
      name: 'CompactionPromptConstructionError',
      code: 'input_construction_failure',
    }));
  });

  it('rejects incomplete or orphaned tool protocol rather than inventing a transcript', () => {
    const incomplete = toolUnit();
    incomplete.messages = incomplete.messages.slice(0, 2);
    expect(() => new CompactionContentBuilder().build([incomplete]))
      .toThrow("Tool call 'backend-call-success' has no terminal result.");

    expect(() => new CompactionContentBuilder().build([
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
