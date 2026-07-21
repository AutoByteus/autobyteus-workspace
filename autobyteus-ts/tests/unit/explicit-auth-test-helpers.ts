import type { LLMConstructionContext, ResolvedLLMAuthentication } from '../../src/llm/llm-construction-context.js';
import { LLMConfig } from '../../src/llm/utils/llm-config.js';
import type { MultimediaConstructionContext } from '../../src/multimedia/multimedia-construction-context.js';
import { MultimediaConfig } from '../../src/multimedia/utils/multimedia-config.js';
import { SecretValue } from '../../src/secrets/secret-value.js';

export const apiKeyAuthentication = (value = 'synthetic-test-key'): ResolvedLLMAuthentication => ({
  kind: 'apiKey',
  apiKey: SecretValue.fromString(value),
});

export const noAuthentication = (): ResolvedLLMAuthentication => ({ kind: 'none' });

export const workloadIdentityAuthentication = (
  project = 'synthetic-project',
  location = 'synthetic-location',
): ResolvedLLMAuthentication => ({ kind: 'googleWorkloadIdentity', project, location });

export const llmApiKeyContext = (
  config = new LLMConfig(),
  value = 'synthetic-test-key',
): LLMConstructionContext => ({ config, authentication: apiKeyAuthentication(value) });

export const llmNoAuthContext = (config = new LLMConfig()): LLMConstructionContext => ({
  config,
  authentication: noAuthentication(),
});

export const multimediaApiKeyContext = (
  config = new MultimediaConfig(),
  value = 'synthetic-test-key',
): MultimediaConstructionContext => ({ config, authentication: apiKeyAuthentication(value) });

export const multimediaNoAuthContext = (
  config = new MultimediaConfig(),
): MultimediaConstructionContext => ({ config, authentication: noAuthentication() });
