import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { CodexModelCapacityReader } from "../../runtime-management/codex/client/codex-model-capacity-reader.js";
import { getClaudeSdkClient } from "../../runtime-management/claude/client/claude-sdk-client.js";
import { isContextCapacity, unknownCapacity, type RuntimeModelCapacities, type RuntimeModelCapacity } from "../domain/runtime-model-capacity.js";
import type { RunModelSelectionContext } from "../domain/run-model-selection.js";

export const nativeModelCapacity = (model: ModelInfo): RuntimeModelCapacity => {
  const metadata = model.resolved_model_metadata?.maxContextTokens;
  // Inferred builtin identity and unknown provenance cannot establish a replacement's capacity.
  const verified = metadata?.source.kind === "live" || metadata?.source.kind === "static_definition";
  if (!verified || !isContextCapacity(metadata?.value)) return unknownCapacity("Verified model context unavailable.");
  const active = model.active_context_tokens;
  if (active != null && (!isContextCapacity(active) || active > metadata.value)) {
    return unknownCapacity("Active model context could not be verified.");
  }
  return { kind: "known", tokens: active ?? metadata.value, source: `native-model:${metadata.source.kind}` };
};

export class RuntimeModelCapacityService {
  constructor(
    private readonly codex = new CodexModelCapacityReader(),
    private readonly claude = getClaudeSdkClient(),
  ) {}
  async resolveMany(context: RunModelSelectionContext, models: readonly ModelInfo[]): Promise<RuntimeModelCapacities> {
    const ids = models.map((model) => model.model_identifier);
    if (context.runtimeKind === RuntimeKind.CODEX_APP_SERVER) return this.codex.resolveMany(context.workspaceRootPath, ids);
    if (context.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) return this.claude.resolveContextCapacities(context.workspaceRootPath, ids);
    if (context.runtimeKind === RuntimeKind.ANTIGRAVITY_CLI) return Object.fromEntries(ids.map((id) => [id, unknownCapacity("Antigravity CLI does not expose verified context capacity.")]));
    return Object.fromEntries(models.map((model) => [model.model_identifier, nativeModelCapacity(model)]));
  }
}
