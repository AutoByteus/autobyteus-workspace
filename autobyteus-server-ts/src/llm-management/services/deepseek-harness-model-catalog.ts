import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { discoverDeepSeekHarnessModels } from "../../runtime-management/deepseek-harness/deepseek-harness-capability.js";
import type { ReadDeadline } from "../../runtime-management/read-deadline.js";

/** DeepSeek Harness models as dsh offers them in a short discovery session; no process-global cache. */
export class DeepSeekHarnessModelCatalog {
  /** `deadline`: the end time of the read step, shared by the CLI probe and the discovery process. */
  async listModels(options: Readonly<{ deadline?: ReadDeadline }> = {}): Promise<ModelInfo[]> {
    return discoverDeepSeekHarnessModels({ deadline: options.deadline });
  }
}
