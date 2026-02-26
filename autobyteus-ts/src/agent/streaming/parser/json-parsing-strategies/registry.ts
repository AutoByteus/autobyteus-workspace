import { LLMProvider } from '../../../../llm/providers.js';
import { resolveToolCallFormat } from '../../../../utils/tool-call-format.js';
import { DefaultJsonToolParsingStrategy } from './default.js';
import { GeminiJsonToolParsingStrategy } from './gemini.js';
import { OpenAiJsonToolParsingStrategy } from './openai.js';
import type { JsonToolParsingStrategy } from './base.js';

export class JsonToolParsingProfile {
  parser: JsonToolParsingStrategy;
  signaturePatterns: string[];

  constructor(parser: JsonToolParsingStrategy, signaturePatterns: string[]) {
    this.parser = parser;
    this.signaturePatterns = signaturePatterns;
  }
}

export const OPENAI_JSON_PATTERNS = [
  '{"tool":',
  '{"tool_calls":',
  '{"tools":',
  '{"function":',
  '[{"tool":',
  '[{"function":'
];

export const GEMINI_JSON_PATTERNS = ['{"name":', '[{"name":'];

export const DEFAULT_JSON_PATTERNS = ['{"tool":', '{"function":'];

export const OPENAI_PROFILE = new JsonToolParsingProfile(
  new OpenAiJsonToolParsingStrategy(),
  OPENAI_JSON_PATTERNS
);

export const GEMINI_PROFILE = new JsonToolParsingProfile(
  new GeminiJsonToolParsingStrategy(),
  GEMINI_JSON_PATTERNS
);

export const DEFAULT_PROFILE = new JsonToolParsingProfile(
  new DefaultJsonToolParsingStrategy(),
  DEFAULT_JSON_PATTERNS
);

export const OPENAI_LIKE_PROVIDERS = new Set<LLMProvider>([
  LLMProvider.OPENAI,
  LLMProvider.MISTRAL,
  LLMProvider.DEEPSEEK,
  LLMProvider.GROK
]);

export const getJsonToolParsingProfile = (provider?: LLMProvider | null): JsonToolParsingProfile => {
  const override = resolveToolCallFormat();
  if (override === 'json') {
    return DEFAULT_PROFILE;
  }

  if (provider === LLMProvider.GEMINI) {
    return GEMINI_PROFILE;
  }
  if (provider && OPENAI_LIKE_PROVIDERS.has(provider)) {
    return OPENAI_PROFILE;
  }

  return DEFAULT_PROFILE;
};
