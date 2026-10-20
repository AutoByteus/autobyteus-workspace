import {
  LLMFactory,
  type BaseLLM,
  type LLMFactoryConfigInput,
} from 'autobyteus-ts';
import { getModelAvailabilityService } from '../../../llm-management/services/model-availability-service.js';
import { createGeminiRuntimeResolver } from '../../../llm-management/services/gemini-runtime-resolver-adapter.js';
import { createLlmProviderApiKeyResolver } from '../../../secret-management/resolution/runtime-provider-api-key-resolvers.js';

export const createAvailableLlm = async (
  modelIdentifier: string,
  configInput?: LLMFactoryConfigInput,
): Promise<BaseLLM> => {
  await getModelAvailabilityService().ensureModelAvailable(modelIdentifier, 'LLM');
  return LLMFactory.createLLM(
    modelIdentifier,
    configInput,
    createLlmProviderApiKeyResolver(),
    await LLMFactory.requiresGeminiRuntimeResolver(modelIdentifier)
      ? createGeminiRuntimeResolver()
      : undefined,
  );
};
