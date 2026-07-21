import type { LLMModelOptions } from './models.js';

export type SupportedModelDefinition = Omit<
  LLMModelOptions,
  | 'credentialProviderId'
  | 'maxContextTokens'
  | 'activeContextTokens'
  | 'maxInputTokens'
  | 'maxOutputTokens'
  | 'runtime'
  | 'hostUrl'
>;
