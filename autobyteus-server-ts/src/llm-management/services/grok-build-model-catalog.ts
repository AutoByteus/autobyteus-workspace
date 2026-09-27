import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { discoverGrokBuildModels } from "../../runtime-management/grok/grok-build-capability.js";

/** Grok Build models as reported by a fresh ACP handshake; no process-global cache. */
export class GrokBuildModelCatalog {
  async listModels(): Promise<ModelInfo[]> {
    return discoverGrokBuildModels();
  }
}
