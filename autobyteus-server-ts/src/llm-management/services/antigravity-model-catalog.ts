import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { listAntigravityModels } from "../../runtime-management/antigravity-cli-capability.js";
import type { ReadDeadline } from "../../runtime-management/read-deadline.js";

export class AntigravityModelCatalog {
  /** `deadline`: the end time of the read step, shared by `agy --help` and `agy models`; without it, as before. */
  async listModels(options: Readonly<{ deadline?: ReadDeadline }> = {}): Promise<ModelInfo[]> {
    return (await listAntigravityModels(options)).map(({ id, name }) => {
      const provider = id.startsWith("claude-") ? LLMProvider.ANTHROPIC
        : id.startsWith("gpt-") ? LLMProvider.OPENAI : LLMProvider.GEMINI;
      return ({
      model_identifier: id,
      display_name: name,
      value: id,
      canonical_name: id,
      provider_id: provider,
      provider_name: `Antigravity CLI (${provider})`,
      provider_type: provider,
      runtime: "api",
      max_context_tokens: null,
      active_context_tokens: null,
      max_input_tokens: null,
      max_output_tokens: null,
      resolved_model_metadata: null,
    });
    });
  }
}
