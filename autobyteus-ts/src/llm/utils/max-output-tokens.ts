import type { LLMModel } from '../models.js';
import type { LLMConfig } from './llm-config.js';

/**
 * The output limit a request should allow: the configured `maxTokens`, otherwise the
 * model's own maximum output tokens (catalog or live metadata), otherwise `null`
 * (the adapter omits the parameter and the provider default applies).
 *
 * Request-build time only: it never writes into `config.maxTokens`, so the input
 * token budget (which already reserves the model maximum when unconfigured) is unchanged.
 */
export const resolveRequestMaxOutputTokens = (model: LLMModel, config: LLMConfig): number | null =>
  config.maxTokens ?? model.maxOutputTokens ?? null;
