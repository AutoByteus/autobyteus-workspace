import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';
import { DeepSeekChatRenderer } from '../prompt-renderers/deepseek-chat-renderer.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';

type DeepSeekThinkingType = 'enabled' | 'disabled';

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isDeepSeekThinkingType = (value: unknown): value is DeepSeekThinkingType =>
  value === 'enabled' || value === 'disabled';

function cloneExtraBody(value: unknown): unknown {
  if (!isRecord(value)) {
    return value;
  }

  const extraBody = { ...value };
  if (isRecord(extraBody.thinking)) {
    extraBody.thinking = { ...extraBody.thinking };
  }
  return extraBody;
}

function normalizeDeepSeekExtraParams(extraParams?: Record<string, unknown>): Record<string, unknown> {
  const params = { ...(extraParams ?? {}) };
  const thinkingType = params.thinking_type;

  delete params.thinking_type;
  delete params.thinking;

  if (params.extra_body !== undefined) {
    params.extra_body = cloneExtraBody(params.extra_body);
    if (isRecord(params.extra_body)) {
      delete params.extra_body.thinking;
    }
  }

  if (isDeepSeekThinkingType(thinkingType)) {
    params.thinking = { type: thinkingType };
    if (thinkingType === 'disabled') {
      delete params.reasoning_effort;
    }
  }

  return params;
}

export class DeepSeekLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    super(model, 'https://api.deepseek.com', config, apiKeyResolver, LLMProvider.DEEPSEEK);
    this.config.extraParams = normalizeDeepSeekExtraParams(this.config.extraParams);
    this._renderer = new DeepSeekChatRenderer();
  }
}
