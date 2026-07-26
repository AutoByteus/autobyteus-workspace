import type { GeminiRuntimeResolver } from 'autobyteus-ts/utils/gemini-runtime.js';
import { getGeminiConfigurationService } from './gemini-configuration-service.js';

export const createGeminiRuntimeResolver = (): GeminiRuntimeResolver =>
  () => getGeminiConfigurationService().resolveActiveRuntime();
