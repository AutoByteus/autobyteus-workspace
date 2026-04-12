import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';
import { LLMModel } from '../../../../src/llm/models.js';
import { LLMProvider } from '../../../../src/llm/providers.js';
import { LLMUserMessage } from '../../../../src/llm/user-message.js';
import { OllamaLLM } from '../../../../src/llm/api/ollama-llm.js';
import { createLocalLongRunningFetch } from '../../../../src/llm/transport/local-long-running-fetch.js';

const mockChat = vi.hoisted(() => vi.fn());
const mockOllamaConstructor = vi.hoisted(
  () =>
    vi.fn(function (this: { chat: typeof mockChat }) {
      this.chat = mockChat;
    }),
);

vi.mock('ollama', () => ({
  Ollama: mockOllamaConstructor,
}));

async function* createStream(parts: any[]) {
  for (const part of parts) {
    yield part;
  }
}

describe('OllamaLLM', () => {
  const buildModel = () =>
    new LLMModel({
      name: 'qwen3.5:35b-a3b-coding-nvfp4',
      value: 'qwen3.5:35b-a3b-coding-nvfp4',
      canonicalName: 'qwen3.5:35b-a3b-coding-nvfp4',
      provider: LLMProvider.OLLAMA,
      hostUrl: 'http://localhost:11434'
    });

  beforeEach(() => {
    mockChat.mockReset();
    mockOllamaConstructor.mockClear();
  });

  it('forwards tool schemas to the Ollama chat request', async () => {
    mockChat.mockResolvedValue({
      message: {
        content: 'done'
      },
      prompt_eval_count: 11,
      eval_count: 7
    });

    const llm = new OllamaLLM(buildModel(), new LLMConfig());
    const toolSchema = {
      type: 'function',
      function: {
        name: 'write_file',
        parameters: {
          type: 'object',
          properties: {
            file_path: { type: 'string' },
            content: { type: 'string' }
          }
        }
      }
    };

    await llm.sendUserMessage(
      new LLMUserMessage({ content: 'Use the write_file tool.' }),
      { tools: [toolSchema] }
    );

    expect(mockChat).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'qwen3.5:35b-a3b-coding-nvfp4',
        tools: [toolSchema]
      })
    );
    expect(mockOllamaConstructor).toHaveBeenCalledWith({
      host: 'http://localhost:11434',
      fetch: createLocalLongRunningFetch(),
    });
  });

  it('emits normalized tool calls from streamed Ollama responses', async () => {
    mockChat.mockResolvedValue(
      createStream([
        {
          message: {
            thinking: 'Need to use the tool.'
          },
          done: false
        },
        {
          message: {
            tool_calls: [
              {
                id: 'call_abc',
                function: {
                  index: 0,
                  name: 'write_file',
                  arguments: {
                    file_path: 'hello.py',
                    content: 'print(1)'
                  }
                }
              }
            ]
          },
          done: false
        },
        {
          done: true,
          prompt_eval_count: 13,
          eval_count: 5
        }
      ])
    );

    const llm = new OllamaLLM(buildModel(), new LLMConfig());
    const chunks = [];

    for await (const chunk of llm.streamUserMessage(
      new LLMUserMessage({ content: 'Use the write_file tool.' }),
      {
        tools: [
          {
            type: 'function',
            function: { name: 'write_file', parameters: { type: 'object' } }
          }
        ]
      }
    )) {
      chunks.push(chunk);
    }

    expect(chunks.some((chunk) => chunk.reasoning === 'Need to use the tool.')).toBe(true);

    const toolChunk = chunks.find((chunk) => chunk.tool_calls?.length);
    expect(toolChunk?.tool_calls).toEqual([
      {
        index: 0,
        call_id: 'call_abc',
        name: 'write_file',
        arguments_delta: '{"file_path":"hello.py","content":"print(1)"}'
      }
    ]);

    expect(chunks.at(-1)?.is_complete).toBe(true);
    expect(chunks.at(-1)?.usage?.total_tokens).toBe(18);
  });
});
