import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import {
  ClaudeAgentSdkRuntimeService,
  getClaudeAgentSdkRuntimeService,
} from "../../../runtime-execution/claude-agent-sdk/claude-agent-sdk-runtime-service.js";
import type { RuntimeModelProvider } from "../runtime-model-provider.js";

export class ClaudeRuntimeModelProvider implements RuntimeModelProvider {
  readonly runtimeKind = "claude_agent_sdk" as const;
  private readonly runtimeService: ClaudeAgentSdkRuntimeService;

  constructor(runtimeService: ClaudeAgentSdkRuntimeService = getClaudeAgentSdkRuntimeService()) {
    this.runtimeService = runtimeService;
  }

  async listLlmModels(): Promise<ModelInfo[]> {
    return this.runtimeService.listModels();
  }

  async reloadLlmModels(): Promise<void> {
    await this.runtimeService.listModels();
  }

  async reloadLlmModelsForProvider(provider: LLMProvider): Promise<number> {
    if (provider !== LLMProvider.ANTHROPIC) {
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
