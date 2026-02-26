import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import {
  CodexAppServerRuntimeService,
  getCodexAppServerRuntimeService,
} from "../../../runtime-execution/codex-app-server/codex-app-server-runtime-service.js";
import type { RuntimeModelProvider } from "../runtime-model-provider.js";

export class CodexRuntimeModelProvider implements RuntimeModelProvider {
  readonly runtimeKind = "codex_app_server" as const;
  private readonly runtimeService: CodexAppServerRuntimeService;

  constructor(runtimeService: CodexAppServerRuntimeService = getCodexAppServerRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  async listLlmModels(): Promise<ModelInfo[]> {
    return this.runtimeService.listModels();
  }

  async reloadLlmModels(): Promise<void> {
    await this.runtimeService.listModels();
  }

  async reloadLlmModelsForProvider(provider: LLMProvider): Promise<number> {
    if (provider !== LLMProvider.OPENAI) {
      return 0;
    }
    const models = await this.runtimeService.listModels();
    return models.length;
  }

  async listAudioModels(): Promise<AudioModel[]> {
    return [];
  }

  async reloadAudioModels(): Promise<void> {}

  async listImageModels(): Promise<ImageModel[]> {
    return [];
  }

  async reloadImageModels(): Promise<void> {}
}
