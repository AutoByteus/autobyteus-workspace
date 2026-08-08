import { QwenLLM } from './api/qwen-llm.js';
import { LLMProvider } from './providers.js';
import type { SupportedModelDefinition } from './supported-model-definition.js';
import { createStaticModelMetadata } from './supported-model-static-metadata.js';

const ALIBABA_MODEL_CATALOG_URL =
  'https://www.alibabacloud.com/help/en/model-studio/models';
const ALIBABA_TEXT_GENERATION_URL =
  'https://www.alibabacloud.com/help/en/model-studio/text-generation-model';

export const qwenSupportedModelDefinitions: SupportedModelDefinition[] = [
  {
    name: 'qwen3.7-max',
    value: 'qwen3.7-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3.7-max',
    staticMetadata: createStaticModelMetadata(
      262144, 258048, 65536, ALIBABA_MODEL_CATALOG_URL, '2026-06-24',
    ),
  },
  {
    name: 'qwen3.8-max',
    value: 'qwen3.8-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3.8-max',
    staticMetadata: createStaticModelMetadata(
      1_000_000,
      null,
      null,
      'https://docs.qwencloud.com/developer-guides/getting-started/text-generation-models',
      '2026-08-06',
    ),
  },
  {
    name: 'DeepSeek V4 Pro (Qwen)',
    value: 'deepseek-v4-pro',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'deepseek-v4-pro',
    modelIdentifierOverride: 'qwen:deepseek-v4-pro',
    staticMetadata: createStaticModelMetadata(
      1_000_000, null, null, ALIBABA_TEXT_GENERATION_URL, '2026-08-06',
    ),
  },
  {
    name: 'GLM-5.2 (Qwen)',
    value: 'glm-5.2',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'glm-5.2',
    modelIdentifierOverride: 'qwen:glm-5.2',
    staticMetadata: createStaticModelMetadata(
      198_000, null, null, ALIBABA_TEXT_GENERATION_URL, '2026-08-06',
    ),
  },
  {
    name: 'qwen3-max',
    value: 'qwen3-max',
    provider: LLMProvider.QWEN,
    llmClass: QwenLLM,
    canonicalName: 'qwen3-max',
    staticMetadata: createStaticModelMetadata(
      262144, 258048, 65536, ALIBABA_MODEL_CATALOG_URL, '2026-04-09',
    ),
  },
];
