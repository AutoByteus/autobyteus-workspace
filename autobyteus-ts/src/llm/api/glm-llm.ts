import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { Message } from '../utils/messages.js';
import { ChunkResponse, CompleteResponse } from '../utils/response-types.js';
import type { LLMInvocationOptions } from '../base.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

function normalizeGlmExtraParams(extraParams?: Record<string, unknown>): Record<string, unknown> {
  if (!extraParams) return {};

  const params = { ...extraParams };
  const reasoningEffort = params.reasoning_effort;
  delete params.thinking_type;
  delete params.reasoning_effort;

  const thinking =
    params.thinking && typeof params.thinking === 'object'
      ? { ...(params.thinking as Record<string, unknown>) }
      : {};
  thinking.type = 'enabled';
  params.thinking = thinking;
  params.reasoning_effort = reasoningEffort === 'low' || reasoningEffort === 'high' || reasoningEffort === 'max'
    ? reasoningEffort
    : 'max';

  return params;
}

export class GlmLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, 'https://open.bigmodel.cn/api/coding/paas/v4/', config, apiKeyResolver, LLMProvider.GLM);

    if (this.config?.extraParams && typeof this.config.extraParams === 'object') {
      this.config.extraParams = normalizeGlmExtraParams(this.config.extraParams);
    }
  }

  private normalizeGlmKwargs(kwargs: Record<string, unknown>): Record<string, unknown> {
    return normalizeGlmExtraParams(kwargs);
  }

  protected override getRequestConfig(_kwargs: Record<string, unknown>): LLMConfig {
    return this.config;
  }

  protected override async _sendMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): Promise<CompleteResponse> {
    return super._sendMessagesToLLM(messages, this.normalizeGlmKwargs(kwargs), options);
  }

  protected override async *_streamMessagesToLLM(
    messages: Message[],
    kwargs: Record<string, unknown>,
    options: LLMInvocationOptions = {}
  ): AsyncGenerator<ChunkResponse, void, unknown> {
    yield* super._streamMessagesToLLM(messages, this.normalizeGlmKwargs(kwargs), options);
  }
}
