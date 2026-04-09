import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LLMProvider } from '../providers.js';

function normalizeGlmExtraParams(extraParams?: Record<string, unknown>): Record<string, unknown> {
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

export class GlmLLM extends OpenAICompatibleLLM {
  constructor(model?: LLMModel, llmConfig?: LLMConfig) {
    const effectiveModel =
      model ??
      new LLMModel({
        name: 'glm-5.1',
        value: 'glm-5.1',
        canonicalName: 'glm-5.1',
        provider: LLMProvider.GLM
      });

    const config = llmConfig ?? new LLMConfig();

    super(effectiveModel, 'GLM_API_KEY', 'https://open.bigmodel.cn/api/coding/paas/v4/', config);

    if (this.config?.extraParams && typeof this.config.extraParams === 'object') {
      this.config.extraParams = normalizeGlmExtraParams(this.config.extraParams);
    }
  }
}
