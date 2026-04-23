import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LMStudioChatRenderer } from '../prompt-renderers/lmstudio-chat-renderer.js';
import {
  createLocalLongRunningFetch,
  LOCAL_PROVIDER_SDK_TIMEOUT_MS,
} from '../transport/local-long-running-fetch.js';

export class LMStudioLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, llmConfig?: LLMConfig) {
    if (!model.hostUrl) {
      throw new Error('LMStudioLLM requires a hostUrl to be set on the LLMModel.');
    }

    const hostUrl = model.hostUrl.replace(/\/+$/, '');
    const baseUrl = `${hostUrl}/v1`;

    super(
      model,
      'LMSTUDIO_API_KEY',
      baseUrl,
      llmConfig,
      'lm-studio',
      {
        fetch: createLocalLongRunningFetch(),
        timeout: LOCAL_PROVIDER_SDK_TIMEOUT_MS,
      },
    );

    this._renderer = new LMStudioChatRenderer();
  }
}
