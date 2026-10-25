import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { discoverGrokBuildModels } from "../../runtime-management/grok/grok-build-capability.js";
import type { ReadDeadline } from "../../runtime-management/read-deadline.js";

/** Grok Build models as reported by a fresh ACP handshake; no process-global cache. */
export class GrokBuildModelCatalog {
  /** `deadline`: the end time of the read step, shared by the CLI probes and the handshake; without it, as before. */
  async listModels(options: Readonly<{ deadline?: ReadDeadline }> = {}): Promise<ModelInfo[]> {
    return discoverGrokBuildModels({ deadline: options.deadline });
  }
}
