import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import type { RuntimeKind } from "../runtime-kind.js";

export interface RuntimeModelProvider {
  readonly runtimeKind: RuntimeKind;
  listLlmModels(): Promise<ModelInfo[]>;
  reloadLlmModels(): Promise<void>;
  reloadLlmModelsForProvider(provider: LLMProvider): Promise<number>;
  listAudioModels(): Promise<AudioModel[]>;
  reloadAudioModels(): Promise<void>;
  listImageModels(): Promise<ImageModel[]>;
  reloadImageModels(): Promise<void>;
}
