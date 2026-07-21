import type { LLMModelOptions } from './models.js';

export type SupportedModelDefinition = Omit<
  LLMModelOptions,
  'maxContextTokens' | 'activeContextTokens' | 'maxInputTokens' | 'maxOutputTokens' | 'runtime' | 'hostUrl'
>;
