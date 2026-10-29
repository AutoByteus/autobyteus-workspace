import { describe, it, expect, vi, beforeEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AnthropicLLM as ProductionAnthropicLLM } from '../../../../src/llm/api/anthropic-llm.js';
import { anthropicSupportedModelDefinitions } from '../../../../src/llm/anthropic-supported-model-definitions.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { Message, MessageRole } from '../../../../src/llm/utils/messages.js';
import type { ChunkResponse } from '../../../../src/llm/utils/response-types.js';
import { LLMRequestAssembler } from '../../../../src/agent/llm-request-assembler.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { ToolInvocation } from '../../../../src/agent/tool-invocation.js';
import { ToolResultEvent } from '../../../../src/agent/events/agent-events.js';
import { CompleteResponse } from '../../../../src/llm/utils/response-types.js';
import { MemoryManager } from '../../../../src/memory/memory-manager.js';
import { FileMemoryStore } from '../../../../src/memory/store/file-store.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());

vi.mock('@anthropic-ai/sdk', () => {
  const Anthropic = vi.fn();
  Anthropic.prototype.messages = { create: mockCreate };
  return { default: Anthropic };
});

type ModelId = 'claude-sonnet-5-5' | 'claude-haiku-5-5' | 'claude-opus-5-5';

const catalogRow = (id: ModelId) => {
  const row = anthropicSupportedModelDefinitions.find((definition) => definition.value === id);
  if (!row) throw new Error(`missing catalog row ${id}`);
  return row;
};

/** The catalog row's schema defaults, as the frontend start surfaces write them explicitly. */
const schemaDefaults = (id: ModelId): Record<string, unknown> => {
  const schema = catalogRow(id).configSchema!.toJsonSchema() as { properties: Record<string, { default: unknown }> };
  return Object.fromEntries(Object.entries(schema.properties).map(([key, value]) => [key, value.default]));
};

const buildLlm = (id: ModelId, extraParams?: Record<string, unknown>) =>
  new ProductionAnthropicLLM(
    new LLMModel({ name: id, value: id, canonicalName: id, provider: catalogRow(id).provider, maxOutputTokens: 128_000 }),
    new LLMConfig({ extraParams }),
    providerApiKeyResolver('synthetic-anthropic-key'),
  );

const userMessages = [new Message(MessageRole.USER, { content: 'Hello, Claude.' })];

async function* emptyStream() {
  yield { type: 'message_delta', delta: { stop_reason: 'end_turn' }, usage: { output_tokens: 1 } };
  yield { type: 'message_stop' };
}

type Transport = 'sync' | 'stream';

const sendWith = async (
  transport: Transport,
  llm: ProductionAnthropicLLM,
  kwargs: Record<string, unknown> = {},
): Promise<Record<string, unknown>> => {
  mockCreate.mockReset();
  if (transport === 'sync') {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'ok' }], usage: { input_tokens: 1, output_tokens: 1 } });
    await llm.sendMessages(userMessages, kwargs);
  } else {
    mockCreate.mockResolvedValue(emptyStream());
    for await (const _chunk of llm.streamMessages(userMessages, kwargs)) {
      // consume stream
    }
  }
  expect(mockCreate).toHaveBeenCalledTimes(1);
  return mockCreate.mock.calls[0]![0] as Record<string, unknown>;
};

const expectNoSampling = (params: Record<string, unknown>) => {
  expect(params).not.toHaveProperty('temperature');
  expect(params).not.toHaveProperty('top_p');
  expect(params).not.toHaveProperty('top_k');
};

const expectNoInternalThinkingFields = (params: Record<string, unknown>) => {
  expect(params).not.toHaveProperty('thinking_enabled');
  expect(params).not.toHaveProperty('thinking_display');
  expect(params).not.toHaveProperty('reasoning_effort');
};

describe.each(['sync', 'stream'] as const)('AnthropicLLM Claude 5.5 request shaping (%s)', (transport) => {
  beforeEach(() => mockCreate.mockReset());

  it('sends between_tools for Sonnet 5.5 with thinking off by default (AC-004)', async () => {
    expect(schemaDefaults('claude-sonnet-5-5')).toEqual({
      thinking_enabled: false, thinking_display: 'summarized', reasoning_effort: 'high',
    });
    const params = await sendWith(transport, buildLlm('claude-sonnet-5-5', schemaDefaults('claude-sonnet-5-5')));
    expect(params.model).toBe('claude-sonnet-5-5');
    expect(params.thinking).toEqual({ type: 'between_tools' });
    expect(params.output_config).toEqual({ effort: 'high' });
    expectNoSampling(params);
    expectNoInternalThinkingFields(params);
  });

  it('sends disabled for Haiku 5.5 with thinking off by default (AC-005)', async () => {
    expect(schemaDefaults('claude-haiku-5-5')).toEqual({
      thinking_enabled: false, thinking_display: 'omitted', reasoning_effort: 'medium',
    });
    const params = await sendWith(transport, buildLlm('claude-haiku-5-5', schemaDefaults('claude-haiku-5-5')));
    expect(params.model).toBe('claude-haiku-5-5');
    expect(params.thinking).toEqual({ type: 'disabled' });
    expect(params.output_config).toEqual({ effort: 'medium' });
    expectNoSampling(params);
    expectNoInternalThinkingFields(params);
  });

  it.each([
    ['claude-sonnet-5-5', undefined, { type: 'adaptive', display: 'summarized' }],
    ['claude-sonnet-5-5', 'omitted', { type: 'adaptive' }],
    ['claude-haiku-5-5', undefined, { type: 'adaptive' }],
    ['claude-haiku-5-5', 'summarized', { type: 'adaptive', display: 'summarized' }],
  ] as const)('sends adaptive thinking for %s with display %s when thinking is on (AC-006)', async (id, display, expected) => {
    const extraParams = { ...schemaDefaults(id), thinking_enabled: true, ...(display ? { thinking_display: display } : {}) };
    const params = await sendWith(transport, buildLlm(id, extraParams));
    expect(params.thinking).toEqual(expected);
    expectNoSampling(params);
    expectNoInternalThinkingFields(params);
  });

  it.each(['claude-sonnet-5-5', 'claude-haiku-5-5'] as const)(
    'never sends sampling parameters, a manual budget or the provider default temperature to %s (AC-007)',
    async (id) => {
      const manual = await sendWith(transport, buildLlm(id, { thinking_enabled: true }), {
        thinking: { type: 'enabled', budget_tokens: 32_000 }, temperature: 0.2, top_p: 0.9, top_k: 40,
      });
      expect(manual).not.toHaveProperty('thinking');
      expectNoSampling(manual);
      expectNoInternalThinkingFields(manual);

      const unconfigured = await sendWith(transport, buildLlm(id));
      expect(unconfigured).not.toHaveProperty('thinking');
      expectNoSampling(unconfigured);
    },
  );

  it('keeps only each model\'s accepted explicit thinking shapes', async () => {
    const sonnetDisabled = await sendWith(transport, buildLlm('claude-sonnet-5-5'), { thinking: { type: 'disabled' } });
    expect(sonnetDisabled).not.toHaveProperty('thinking');
    const sonnetBetweenTools = await sendWith(transport, buildLlm('claude-sonnet-5-5'), {
      thinking: { type: 'between_tools', display: 'summarized' },
    });
    expect(sonnetBetweenTools.thinking).toEqual({ type: 'between_tools' });
    const haikuBetweenTools = await sendWith(transport, buildLlm('claude-haiku-5-5'), { thinking: { type: 'between_tools' } });
    expect(haikuBetweenTools).not.toHaveProperty('thinking');
    const haikuDisabled = await sendWith(transport, buildLlm('claude-haiku-5-5'), { thinking: { type: 'disabled' } });
    expect(haikuDisabled.thinking).toEqual({ type: 'disabled' });
  });

  it('rejects forced tool choice for Sonnet 5.5 before any SDK call and allows auto/none (AC-008)', async () => {
    const sonnet = buildLlm('claude-sonnet-5-5', schemaDefaults('claude-sonnet-5-5'));
    for (const toolChoice of [{ type: 'any' }, { type: 'tool', name: 'search' }]) {
      mockCreate.mockReset();
      const attempt = transport === 'sync'
        ? sonnet.sendMessages(userMessages, { tool_choice: toolChoice })
        : (async () => {
          for await (const _chunk of sonnet.streamMessages(userMessages, { tool_choice: toolChoice })) {
            // consume stream
          }
        })();
      await expect(attempt).rejects.toThrow('Anthropic model claude-sonnet-5-5 does not support forced tool choice.');
      expect(mockCreate).not.toHaveBeenCalled();
    }
    for (const toolChoice of [{ type: 'auto' }, { type: 'none' }]) {
      const params = await sendWith(transport, sonnet, { tool_choice: toolChoice });
      expect(params.tool_choice).toEqual(toolChoice);
    }
  });

  it('allows forced tool choice for Haiku 5.5', async () => {
    const params = await sendWith(transport, buildLlm('claude-haiku-5-5'), { tool_choice: { type: 'any' } });
    expect(params.tool_choice).toEqual({ type: 'any' });
  });
});

describe('AnthropicLLM adaptive-required local errors', () => {
  beforeEach(() => mockCreate.mockReset());

  it('names the model value in the Opus 5.5 thinking and sampling errors', async () => {
    const opus = buildLlm('claude-opus-5-5');
    await expect(opus.sendMessages(userMessages, { thinking: { type: 'disabled' } })).rejects.toThrow(
      'Anthropic model claude-opus-5-5 supports adaptive thinking only; disabled and manual thinking are unavailable.',
    );
    await expect(opus.sendMessages(userMessages, { temperature: 0.5 })).rejects.toThrow(
      'Anthropic model claude-opus-5-5 does not support explicit sampling parameters.',
    );
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

describe('AnthropicLLM Claude 5.5 tool-use continuation (AC-009)', () => {
  it.each(['claude-sonnet-5-5', 'claude-haiku-5-5'] as const)(
    'replays the streamed %s thinking blocks byte-identically after the tool result',
    async (id) => {
      const thinkingText = `synthetic ${id} thought`;
      async function* toolUseStream() {
        yield { type: 'message_start', message: { usage: { input_tokens: 4, output_tokens: 0 } } };
        yield { type: 'content_block_start', index: 0, content_block: { type: 'thinking', thinking: '', signature: '' } };
        yield { type: 'content_block_delta', index: 0, delta: { type: 'thinking_delta', thinking: thinkingText } };
        yield { type: 'content_block_delta', index: 0, delta: { type: 'signature_delta', signature: `${id}-signature` } };
        yield { type: 'content_block_stop', index: 0 };
        yield { type: 'content_block_start', index: 1, content_block: { type: 'text', text: '' } };
        yield { type: 'content_block_delta', index: 1, delta: { type: 'text_delta', text: 'Checking.' } };
        yield { type: 'content_block_stop', index: 1 };
        yield { type: 'content_block_start', index: 2, content_block: { type: 'tool_use', id: 'toolu_1', name: 'run_bash', input: {} } };
        yield { type: 'content_block_delta', index: 2, delta: { type: 'input_json_delta', partial_json: '{"command":"pwd"}' } };
        yield { type: 'content_block_stop', index: 2 };
        yield { type: 'message_delta', delta: { stop_reason: 'tool_use' }, usage: { output_tokens: 6 } };
        yield { type: 'message_stop' };
      }

      const dir = fs.mkdtempSync(path.join(os.tmpdir(), `anthropic-${id}-continuation-`));
      const identity = (turnId: string, requestId: string, isTurnContinuation: boolean) => ({
        turnId, requestId, isTurnContinuation, getParentModelIdentifier: () => id, signal: new AbortController().signal,
      });
      try {
        const llm = buildLlm(id, { ...schemaDefaults(id), thinking_enabled: true });
        const memory = new MemoryManager({ store: new FileMemoryStore(dir, `agent_${id}`) });
        const assembler = new LLMRequestAssembler(memory);
        const turnId = memory.startTurn();
        const first = await assembler.prepareRequest(new LLMUserMessage({ content: 'Where am I?' }), identity(turnId, 'first', false), undefined, []);

        mockCreate.mockReset();
        mockCreate.mockResolvedValueOnce(toolUseStream());
        const chunks: ChunkResponse[] = [];
        for await (const chunk of llm.streamMessages(first.outboundMessages)) chunks.push(chunk);
        const nativeTurn = chunks.find((chunk) => chunk.providerNativeAssistantTurn)?.providerNativeAssistantTurn;
        expect(nativeTurn?.blocks[0]).toEqual({ type: 'thinking', thinking: thinkingText, signature: `${id}-signature` });
        const providerBlocks = structuredClone(nativeTurn!.blocks);

        memory.ingestAssistantToolResponse(
          new CompleteResponse({ content: 'Checking.', reasoning: thinkingText, providerNativeAssistantTurn: nativeTurn! }),
          [new ToolInvocation('run_bash', { command: 'pwd' }, 'toolu_1', turnId)], turnId,
        );
        memory.ingestToolResult(new ToolResultEvent('run_bash', { stdout: '/tmp' }, 'toolu_1', undefined, { command: 'pwd' }, turnId), turnId);
        const continuation = await assembler.prepareRequest(null, identity(turnId, 'continuation', true), undefined, []);

        mockCreate.mockReset();
        mockCreate.mockResolvedValueOnce({ content: [{ type: 'text', text: 'You are in /tmp.' }], usage: { input_tokens: 1, output_tokens: 1 } });
        await llm.sendMessages(continuation.outboundMessages);
        const params = mockCreate.mock.calls[0]![0] as { messages: Array<{ role: string; content: unknown }> };
        const assistantTurn = params.messages.find((message) => message.role === 'assistant');
        expect(JSON.stringify(assistantTurn?.content)).toBe(JSON.stringify(providerBlocks));
        expect(params).toMatchObject({ thinking: { type: 'adaptive' } });
      } finally {
        fs.rmSync(dir, { recursive: true, force: true });
      }
    },
  );
});
