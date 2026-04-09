import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { Message, MessageRole } from '../utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../utils/response-types.js';

const KIMI_TOOL_SAFE_NON_THINKING_MODELS = new Set(['kimi-k2.5']);

function requestUsesToolWorkflow(messages: Message[], kwargs: Record<string, unknown>): boolean {
  if (Array.isArray(kwargs.tools) && kwargs.tools.length > 0) {
    return true;
  }

  return messages.some((message) => message.role === MessageRole.TOOL || Boolean(message.tool_payload));
}

export class KimiLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'kimi-k2.5',
        value: 'kimi-k2.5',
        canonicalName: 'kimi-k2.5',
        provider: LLMProvider.KIMI
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'KIMI_API_KEY', 'https://api.moonshot.ai/v1', config);
  }

  private normalizeKimiKwargs(messages: Message[], kwargs: Record<string, unknown>): Record<string, unknown> {
    if (!KIMI_TOOL_SAFE_NON_THINKING_MODELS.has(this.model.value)) {
      return kwargs;
    }

    if (!requestUsesToolWorkflow(messages, kwargs)) {
      return kwargs;
    }

    const configThinking = this.config.extraParams?.thinking;
    if (kwargs.thinking !== undefined || configThinking !== undefined) {
      return kwargs;
    }

    return {
      ...kwargs,
      thinking: { type: 'disabled' }
    };
  }

  protected override async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): Promise<CompleteResponse> {
    return super._sendMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs));
  }

  protected override async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield* super._streamMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs));
  }
}
