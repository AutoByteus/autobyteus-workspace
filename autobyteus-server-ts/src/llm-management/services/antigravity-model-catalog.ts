import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { listAntigravityModels } from "../../runtime-management/antigravity-cli-capability.js";

export class AntigravityModelCatalog {
  async listModels(): Promise<ModelInfo[]> {
    return listAntigravityModels().map(({ id, name }) => {
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
