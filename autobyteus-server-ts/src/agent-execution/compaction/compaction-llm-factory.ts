import type { CompactionLlmFactory } from 'autobyteus-ts/memory/compaction/direct-llm-compaction-summarizer.js';
import { COMPACTION_SUMMARY_PROMPT } from 'autobyteus-ts/memory/compaction/compaction-summary-prompt.js';
import { applyRawLlmConfigOverrides } from 'autobyteus-ts/llm/utils/llm-config-overrides.js';
import type { LLMConfig } from 'autobyteus-ts/llm/utils/llm-config.js';
import type { LLMModel } from 'autobyteus-ts/llm/models.js';
import { appConfigProvider } from '../../config/app-config-provider.js';
import { COMPACTION_MODEL_SETTINGS_KEY, DEFAULT_COMPACTION_MODEL_SETTINGS, parseCompactionModelSettings } from '../../config/compaction-model-settings.js';
import { createAvailableLlm } from '../backends/autobyteus/available-llm-construction.js';

const CONTROLLED = new Set([
  'system', 'systemmessage', 'systeminstruction', 'instructions', 'model', 'messages', 'input', 'contents',
  'tools', 'toolchoice', 'toolconfig', 'functions', 'functioncall', 'paralleltoolcalls',
  'responseformat', 'responseschema', 'responsejsonschema', 'responsemimetype', 'format',
  'stop', 'stopsequences', 'conversation', 'conversationid', 'logicalconversationid',
  'previousresponseid', 'stream', 'streamoptions', 'n', 'candidatecount', 'bestof',
  'maxtokens', 'maxcompletiontokens', 'maxoutputtokens', 'numpredict',
  'signal', 'abortsignal', 'requestoptions', 'extrabody', 'extraheaders',
]);
const safeGenerationOptions = (value: Record<string, unknown>): Record<string, unknown> =>
  Object.fromEntries(Object.entries(value).filter(([key]) => !CONTROLLED.has(key.replace(/_/g, '').toLowerCase()))
    .map(([key, child]) => [key, child && typeof child === 'object' && !Array.isArray(child)
      ? safeGenerationOptions(child as Record<string, unknown>) : child]));

export const configureCompactionLlm = (model: LLMModel, defaults: LLMConfig, overrides: Record<string, unknown> | null): LLMConfig => {
  const config = defaults.clone();
  if (overrides) applyRawLlmConfigOverrides(config, overrides);
  const requested = typeof config.maxTokens === 'number' && Number.isFinite(config.maxTokens) && config.maxTokens >= 1
    ? Math.floor(config.maxTokens) : 8192;
  config.maxTokens = model.maxOutputTokens && model.maxOutputTokens >= 1
    ? Math.min(requested, Math.floor(model.maxOutputTokens)) : requested;
  config.systemMessage = COMPACTION_SUMMARY_PROMPT;
  config.stopSequences = null;
  config.extraParams = safeGenerationOptions(config.extraParams);
  return config;
};

export const createCompactionLlm: CompactionLlmFactory = async ({ parentModelIdentifier }) => {
  const current = appConfigProvider.config.get(COMPACTION_MODEL_SETTINGS_KEY);
  const settings = current === undefined ? DEFAULT_COMPACTION_MODEL_SETTINGS : parseCompactionModelSettings(current);
  return createAvailableLlm(settings.modelIdentifier ?? parentModelIdentifier,
    (model, defaults) => configureCompactionLlm(model, defaults, settings.llmConfig));
};
