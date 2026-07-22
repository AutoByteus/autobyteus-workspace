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

export const geminiAiStudioAuthentication = (
  value = 'synthetic-gemini-ai-studio-key',
): ResolvedLLMAuthentication => ({
  kind: 'geminiAiStudio',
  apiKey: SecretValue.fromString(value),
});

export const geminiVertexExpressAuthentication = (
  value = 'synthetic-gemini-vertex-express-key',
): ResolvedLLMAuthentication => ({
  kind: 'geminiVertexExpress',
  apiKey: SecretValue.fromString(value),
});

export const geminiVertexProjectAuthentication = (
  project = 'synthetic-project',
  location = 'synthetic-location',
): ResolvedLLMAuthentication => ({ kind: 'geminiVertexProject', project, location });

export const llmApiKeyContext = (
  config = new LLMConfig(),
  value = 'synthetic-test-key',
): LLMConstructionContext => ({ config, authentication: apiKeyAuthentication(value) });

export const llmNoAuthContext = (config = new LLMConfig()): LLMConstructionContext => ({
  config,
  authentication: noAuthentication(),
});

export const llmGeminiAiStudioContext = (
  config = new LLMConfig(),
  value = 'synthetic-gemini-ai-studio-key',
): LLMConstructionContext => ({ config, authentication: geminiAiStudioAuthentication(value) });

export const multimediaApiKeyContext = (
  config = new MultimediaConfig(),
  value = 'synthetic-test-key',
): MultimediaConstructionContext => ({ config, authentication: apiKeyAuthentication(value) });

export const multimediaNoAuthContext = (
  config = new MultimediaConfig(),
): MultimediaConstructionContext => ({ config, authentication: noAuthentication() });

export const multimediaGeminiAiStudioContext = (
  config = new MultimediaConfig(),
  value = 'synthetic-gemini-ai-studio-key',
): MultimediaConstructionContext => ({
  config,
  authentication: geminiAiStudioAuthentication(value),
});
