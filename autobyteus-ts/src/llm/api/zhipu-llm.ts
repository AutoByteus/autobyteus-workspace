import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';

function normalizeZhipuExtraParams(extraParams?: Record<string, unknown>): Record<string, unknown> {
  if (!extraParams) return {};

  const params = { ...extraParams };
  const thinkingType = params.thinking_type;
  delete params.thinking_type;

  if (thinkingType !== undefined) {
    const thinking =
      params.thinking && typeof params.thinking === 'object'
        ? { ...(params.thinking as Record<string, unknown>) }
        : {};
    thinking.type = thinkingType;
    params.thinking = thinking;
  }

  return params;
}

export class ZhipuLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'glm-4.7',
        value: 'glm-4.7',
        canonicalName: 'glm-4.7',
        provider: LLMProvider.ZHIPU
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'ZHIPU_API_KEY', 'https://open.bigmodel.cn/api/paas/v4/', config);

    if (this.config?.extraParams && typeof this.config.extraParams === 'object') {
      this.config.extraParams = normalizeZhipuExtraParams(this.config.extraParams);
    }
  }
}
