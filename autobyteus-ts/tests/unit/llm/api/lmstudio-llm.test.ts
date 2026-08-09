import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LMStudioLLM as ProductionLMStudioLLM } from '../../../../src/llm/api/lmstudio-llm.js';
import { OpenAIChatRenderer } from '../../../../src/llm/prompt-renderers/openai-chat-renderer.js';
import {
  Message,
  MessageRole,
  ToolCallPayload,
  ToolResultPayload
} from '../../../../src/llm/utils/messages.js';
import {
  createLocalLongRunningFetch,
  LOCAL_PROVIDER_SDK_TIMEOUT_MS,
} from '../../../../src/llm/transport/local-long-running-fetch.js';
import { providerApiKeyResolver } from '../../provider-api-key-resolver-test-helpers.js';

const mockCreate = vi.hoisted(() => vi.fn());
const mockOpenAIConstructor = vi.hoisted(
  () =>
    vi.fn(function (
      this: { chat: { completions: { create: typeof mockCreate } } },
      _options?: Record<string, unknown>,
    ) {
      this.chat = {
        completions: {
          create: mockCreate,
        },
      };
    }),
);

vi.mock('openai', () => ({
  OpenAI: mockOpenAIConstructor,
}));

class LMStudioLLM extends ProductionLMStudioLLM {
  constructor(model: LLMModel, config = new LLMConfig()) {
    super(model, config, providerApiKeyResolver('synthetic-lmstudio-key'));
  }
}

describe('LMStudioLLM', () => {
  beforeEach(() => {
    mockCreate.mockReset();
    mockOpenAIConstructor.mockClear();
  });

  it('injects the long-running local fetch and 24h SDK timeout into the OpenAI client', async () => {
    const model = new LLMModel({
      name: 'gemma-4-31b-it',
      value: 'gemma-4-31b-it',
      canonicalName: 'gemma-4-31b-it',
      provider: LLMProvider.LMSTUDIO,
      hostUrl: 'http://127.0.0.1:1234/',
    });

    const llm = new LMStudioLLM(model, new LLMConfig());

    expect(llm).toBeDefined();
    mockCreate.mockResolvedValue({
      choices: [{ message: { role: 'assistant', content: 'ok' } }],
    });
    await llm.sendMessages([]);
    expect(mockOpenAIConstructor).toHaveBeenCalledWith({
      apiKey: 'synthetic-lmstudio-key',
      baseURL: 'http://127.0.0.1:1234/v1',
      fetch: createLocalLongRunningFetch(),
      timeout: LOCAL_PROVIDER_SDK_TIMEOUT_MS,
    });
    expect((llm as unknown as { _renderer: unknown })._renderer).toBeInstanceOf(OpenAIChatRenderer);
  });

  it('renders prior native tool history as OpenAI-compatible structured messages', async () => {
    mockCreate.mockResolvedValue({
      choices: [
        {
          message: {
            role: 'assistant',
            content: 'done',
          },
        },
      ],
    });
    const model = new LLMModel({
      name: 'gemma-4-31b-it',
      value: 'gemma-4-31b-it',
      canonicalName: 'gemma-4-31b-it',
      provider: LLMProvider.LMSTUDIO,
      hostUrl: 'http://127.0.0.1:1234/',
    });
    const llm = new LMStudioLLM(model, new LLMConfig());

    await llm.sendMessages([
      new Message(MessageRole.ASSISTANT, {
        tool_payload: new ToolCallPayload([
          { id: 'call_1', name: 'run_bash', arguments: { command: 'pwd' } }
        ])
      }),
      new Message(MessageRole.TOOL, {
        tool_payload: new ToolResultPayload('call_1', 'run_bash', { stdout: '/tmp' })
      })
    ]);

    const [params] = mockCreate.mock.calls[0];
    expect(params.messages).toEqual([
      {
        role: 'assistant',
        content: null,
        tool_calls: [
          {
            id: 'call_1',
            type: 'function',
            function: {
              name: 'run_bash',
              arguments: JSON.stringify({ command: 'pwd' })
            }
          }
        ]
      },
      {
        role: 'tool',
        tool_call_id: 'call_1',
        content: JSON.stringify({ stdout: '/tmp' })
      }
    ]);
    expect(JSON.stringify(params.messages)).not.toContain('[TOOL_CALL]');
  });
});
