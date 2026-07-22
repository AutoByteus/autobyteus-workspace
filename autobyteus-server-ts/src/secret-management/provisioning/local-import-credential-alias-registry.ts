import type { SecretDefinitionId } from '../domain/secret-binding.js';
import { secretDefinitionId } from '../domain/secret-binding.js';

const localImportCredentialAliases = Object.freeze({
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

export type LocalImportCredentialAlias = keyof typeof localImportCredentialAliases;

export const LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_DEFINITION = localImportCredentialAliases;

export const LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES = Object.freeze(
  Object.keys(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_DEFINITION) as LocalImportCredentialAlias[],
);

export const localImportDefinitionForAlias = (alias: string): SecretDefinitionId | null =>
  Object.hasOwn(LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_DEFINITION, alias)
    ? LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_DEFINITION[alias as LocalImportCredentialAlias]
    : null;
