import type { SecretId } from '../domain/secret-id.js';
import { secretId } from '../domain/secret-id.js';

const localImportCredentialAliases = Object.freeze({
  OPENAI_API_KEY: secretId('provider.openai.api-key'),
  ANTHROPIC_API_KEY: secretId('provider.anthropic.api-key'),
  MISTRAL_API_KEY: secretId('provider.mistral.api-key'),
  DEEPSEEK_API_KEY: secretId('provider.deepseek.api-key'),
  GROK_API_KEY: secretId('provider.grok.api-key'),
  KIMI_API_KEY: secretId('provider.kimi.api-key'),
  DASHSCOPE_API_KEY: secretId('provider.qwen.api-key'),
  GLM_API_KEY: secretId('provider.glm.api-key'),
  MINIMAX_API_KEY: secretId('provider.minimax.api-key'),
  LMSTUDIO_API_KEY: secretId('provider.lmstudio.api-key'),
  AUTOBYTEUS_API_KEY: secretId('provider.autobyteus.api-key'),
  GEMINI_API_KEY: secretId('provider.google.ai-studio.api-key'),
  VERTEX_AI_API_KEY: secretId('provider.google.vertex-express.api-key'),
  SERPER_API_KEY: secretId('search.serper.api-key'),
  SERPAPI_API_KEY: secretId('search.serpapi.api-key'),
  VERTEX_AI_SEARCH_API_KEY: secretId('search.vertex-ai.api-key'),
} satisfies Readonly<Record<string, SecretId>>);

export type LocalImportCredentialAlias = keyof typeof localImportCredentialAliases;
export const LOCAL_IMPORT_CREDENTIAL_ALIAS_TO_SECRET_ID = localImportCredentialAliases;
export const LOCAL_IMPORT_CREDENTIAL_ALIAS_NAMES = Object.freeze(
  Object.keys(localImportCredentialAliases) as LocalImportCredentialAlias[],
);

export const localImportSecretIdForAlias = (alias: string): SecretId | null =>
  Object.hasOwn(localImportCredentialAliases, alias)
    ? localImportCredentialAliases[alias as LocalImportCredentialAlias]
    : null;
