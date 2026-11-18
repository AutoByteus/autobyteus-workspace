import type { SecretId } from 'autobyteus-ts/secrets/vault/secret-id.js';
import { secretId } from 'autobyteus-ts/secrets/vault/secret-id.js';
import { TEST_ONLY_SECRET_IDS } from '../catalog/provider-credential-catalog.js';

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

/** Aliases `test-vault setup` accepts in addition to the ones above; any other import refuses them. */
const testVaultOnlyCredentialAliases = Object.freeze({
  AUTOBYTEUS_TEST_GITHUB_TOKEN: TEST_ONLY_SECRET_IDS.githubToken,
} satisfies Readonly<Record<string, SecretId>>);

export const testVaultOnlySecretIdForAlias = (alias: string): SecretId | null =>
  Object.hasOwn(testVaultOnlyCredentialAliases, alias)
    ? testVaultOnlyCredentialAliases[alias as keyof typeof testVaultOnlyCredentialAliases]
    : null;
