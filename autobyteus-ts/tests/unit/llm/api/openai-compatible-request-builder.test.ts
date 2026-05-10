import { describe, expect, it } from 'vitest';
import { OpenAICompatibleRequestBuilder } from '../../../../src/llm/api/openai-compatible-request-builder.js';
import { LLMConfig } from '../../../../src/llm/utils/llm-config.js';

describe('OpenAICompatibleRequestBuilder', () => {
  it('maps LLMConfig controls, filters internal kwargs, and attaches tools/tool_choice', () => {
    const config = new LLMConfig({
      temperature: 0,
      topP: 0.2,
      frequencyPenalty: 0.1,
      presencePenalty: 0.3,
      stopSequences: ['</stop>'],
      maxTokens: 123,
      extraParams: {
        response_format: { type: 'json_object' },
        chat_template_kwargs: { enable_thinking: false }
      }
    });
    const tools = [
      {
        type: 'function',
        function: {
          name: 'run_bash',
          description: 'Run a command',
          parameters: { type: 'object', properties: {}, required: [], additionalProperties: false }
        }
      }
    ];

    const params = OpenAICompatibleRequestBuilder.build({
      model: 'qwen-local',
      messages: [{ role: 'user', content: 'hi' }],
      config,
      stream: true,
      kwargs: {
        logicalConversationId: 'agent-1',
        metadata: { keep: true },
        tools,
        tool_choice: 'required'
      }
    }) as Record<string, unknown>;

    expect(params).toMatchObject({
      model: 'qwen-local',
      temperature: 0,
      top_p: 0.2,
      frequency_penalty: 0.1,
      presence_penalty: 0.3,
      stop: ['</stop>'],
      max_completion_tokens: 123,
      stream: true,
      stream_options: { include_usage: true },
      response_format: { type: 'json_object' },
      chat_template_kwargs: { enable_thinking: false },
      metadata: { keep: true },
      tools,
      tool_choice: 'required'
    });
    expect(params).not.toHaveProperty('logicalConversationId');
  });

  it('does not emit tool_choice when no tools are attached', () => {
    const params = OpenAICompatibleRequestBuilder.build({
      model: 'model',
      messages: [],
      config: new LLMConfig(),
      kwargs: { tool_choice: 'required' }
    }) as Record<string, unknown>;

    expect(params).not.toHaveProperty('tool_choice');
  });
});
