import { OpenAICompatibleLLM } from './openai-compatible-llm.js';
import { LLMModel } from '../models.js';
import { LLMConfig } from '../utils/llm-config.js';
import { LMStudioTextToolHistoryRenderer } from '../prompt-renderers/lmstudio-text-tool-history-renderer.js';
import { OpenAIChatRenderer } from '../prompt-renderers/openai-chat-renderer.js';
import {
  createLocalLongRunningFetch,
  LOCAL_PROVIDER_SDK_TIMEOUT_MS,
} from '../transport/local-long-running-fetch.js';
import { resolveToolCallFormat } from '../../utils/tool-call-format.js';
import type { ProviderApiKeyResolver } from '../../secrets/provider-api-key-resolver.js';
import { LLMProvider } from '../providers.js';

export class LMStudioLLM extends OpenAICompatibleLLM {
  constructor(model: LLMModel, config: LLMConfig, apiKeyResolver: ProviderApiKeyResolver) {
    if (!model.hostUrl) {
      throw new Error('LMStudioLLM requires a hostUrl to be set on the LLMModel.');
    }

    const hostUrl = model.hostUrl.replace(/\/+$/, '');
    const baseUrl = `${hostUrl}/v1`;

    super(
      model,
      baseUrl,
      config,
      apiKeyResolver,
      LLMProvider.LMSTUDIO,
      {
        fetch: createLocalLongRunningFetch(),
        timeout: LOCAL_PROVIDER_SDK_TIMEOUT_MS,
      },
      true,
    );

    this._renderer = resolveToolCallFormat() === 'api_tool_call'
      ? new OpenAIChatRenderer()
      : new LMStudioTextToolHistoryRenderer();
  }
}
