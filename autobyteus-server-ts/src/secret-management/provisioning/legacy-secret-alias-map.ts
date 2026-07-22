import type { SecretDefinitionId } from '../domain/secret-binding.js';
import { secretDefinitionId } from '../domain/secret-binding.js';

const importableAliases = Object.freeze({
  OPENAI_API_KEY: secretDefinitionId('provider.openai.api-key'),
  ANTHROPIC_API_KEY: secretDefinitionId('provider.anthropic.api-key'),
  MISTRAL_API_KEY: secretDefinitionId('provider.mistral.api-key'),
  DEEPSEEK_API_KEY: secretDefinitionId('provider.deepseek.api-key'),
  GROK_API_KEY: secretDefinitionId('provider.grok.api-key'),
  KIMI_API_KEY: secretDefinitionId('provider.kimi.api-key'),
  DASHSCOPE_API_KEY: secretDefinitionId('provider.qwen.api-key'),
  GLM_API_KEY: secretDefinitionId('provider.glm.api-key'),
  MINIMAX_API_KEY: secretDefinitionId('provider.minimax.api-key'),
  LMSTUDIO_API_KEY: secretDefinitionId('provider.lmstudio.api-key'),
  AUTOBYTEUS_API_KEY: secretDefinitionId('provider.autobyteus.api-key'),
  GEMINI_API_KEY: secretDefinitionId('provider.gemini.ai-studio-api-key'),
  VERTEX_AI_API_KEY: secretDefinitionId('provider.google.vertex-express-api-key'),
  SERPER_API_KEY: secretDefinitionId('search.serper.api-key'),
  SERPAPI_API_KEY: secretDefinitionId('search.serpapi.api-key'),
  VERTEX_AI_SEARCH_API_KEY: secretDefinitionId('search.vertex-ai.api-key'),
} satisfies Readonly<Record<string, SecretDefinitionId>>);

export type ImportableLegacySecretAlias = keyof typeof importableAliases;

export const LEGACY_SECRET_ALIAS_TO_DEFINITION = importableAliases;

export const UNSUPPORTED_LEGACY_SECRET_ALIASES = Object.freeze([
  'CLAUDE_CODE_API_KEY',
  'CLAUDE_CODE_API_KEY_FILE_DESCRIPTOR',
] as const);

export const LEGACY_SECRET_ALIASES = Object.freeze([
  ...Object.keys(LEGACY_SECRET_ALIAS_TO_DEFINITION),
  ...UNSUPPORTED_LEGACY_SECRET_ALIASES,
]);

export const legacyDefinitionForAlias = (alias: string): SecretDefinitionId | null =>
  Object.hasOwn(LEGACY_SECRET_ALIAS_TO_DEFINITION, alias)
    ? LEGACY_SECRET_ALIAS_TO_DEFINITION[alias as ImportableLegacySecretAlias]
    : null;
