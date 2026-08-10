import { normalizeOpenAICompatibleEndpointBaseUrl } from './openai-compatible-endpoint-discovery.js';

export const QWEN_BASE_URL_ENV_VAR = 'QWEN_BASE_URL';

export const DEFAULT_QWEN_BASE_URL =
  'https://dashscope-intl.aliyuncs.com/compatible-mode/v1';

export const resolveQwenBaseUrl = (
  configured = process.env[QWEN_BASE_URL_ENV_VAR],
): string => normalizeOpenAICompatibleEndpointBaseUrl(
  typeof configured === 'string' && configured.trim().length > 0
    ? configured
    : DEFAULT_QWEN_BASE_URL,
);
