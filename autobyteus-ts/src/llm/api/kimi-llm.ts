import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { Message } from '../utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../utils/response-types.js';
import type { LLMInvocationOptions } from '../base.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

const KIMI_K3_REASONING_EFFORTS = new Set(['low', 'high', 'max']);

export class KimiLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, 'https://api.moonshot.ai/v1', config, apiKeyResolver, LLMProvider.KIMI);
  }

  protected override getRequestConfig(_kwargs: Record<string, unknown>): LLMConfig {
    const config = LLMConfig.fromDict(this.config.toDict() as Record<string, unknown>);
    delete config.extraParams.thinking_type;
    delete config.extraParams.reasoning_effort;
    return config;
  }

  private normalizeKimiKwargs(_messages: Message[], kwargs: Record<string, unknown>): Record<string, unknown> {
    const normalizedKwargs = { ...kwargs };
    const configuredEffort = this.config.extraParams?.reasoning_effort;
    const requestedEffort = normalizedKwargs.reasoning_effort ?? configuredEffort;
    const reasoningEffort = KIMI_K3_REASONING_EFFORTS.has(String(requestedEffort))
      ? String(requestedEffort)
      : 'max';
    delete normalizedKwargs.thinking_type;
    delete normalizedKwargs.reasoning_effort;
    normalizedKwargs.thinking = { type: 'enabled', reasoning_effort: reasoningEffort };
    return normalizedKwargs;
  }

  protected override async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): Promise<CompleteResponse> {
    return super._sendMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs), options);
  }

  protected override async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield* super._streamMessagesToLLM(messages, this.normalizeKimiKwargs(messages, kwargs), options);
  }
}
