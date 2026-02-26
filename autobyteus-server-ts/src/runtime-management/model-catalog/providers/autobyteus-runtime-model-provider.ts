import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import { getLlmModelService } from "../../../llm-management/services/llm-model-service.js";
import { getAudioModelService } from "../../../multimedia-management/services/audio-model-service.js";
import { getImageModelService } from "../../../multimedia-management/services/image-model-service.js";
import type { RuntimeModelProvider } from "../runtime-model-provider.js";

export class AutobyteusRuntimeModelProvider implements RuntimeModelProvider {
  readonly runtimeKind = "autobyteus" as const;

  async listLlmModels(): Promise<ModelInfo[]> {
    return getLlmModelService().getAvailableModels();
  }

  async reloadLlmModels(): Promise<void> {
    await getLlmModelService().reloadModels();
  }

  async reloadLlmModelsForProvider(provider: LLMProvider): Promise<number> {
    return getLlmModelService().reloadModelsForProvider(provider);
  }

  async listAudioModels(): Promise<AudioModel[]> {
    return getAudioModelService().getAvailableModels();
  }

  async reloadAudioModels(): Promise<void> {
    await getAudioModelService().reloadModels();
  }

  async listImageModels(): Promise<ImageModel[]> {
    return getImageModelService().getAvailableModels();
  }

  async reloadImageModels(): Promise<void> {
    await getImageModelService().reloadModels();
  }
}
