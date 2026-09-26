import type { ModelInfo } from "autobyteus-ts/llm/models.js";

/** Verified AutoByteus context evidence for stopped-run replacement decisions. */
export const nativeModelCapacity = (model: ModelInfo): number | null => {
  const metadata = model.resolved_model_metadata?.maxContextTokens;
  const verified = metadata?.source.kind === "live" || metadata?.source.kind === "static_definition";
  if (!verified || !isContextCapacity(metadata?.value)) return null;
  const active = model.active_context_tokens;
  if (active != null && (!isContextCapacity(active) || active > metadata.value)) return null;
  return active ?? metadata.value;
};

const isContextCapacity = (value: unknown): value is number =>
  typeof value === "number" && Number.isSafeInteger(value) && value > 0;

export class NativeModelCapacityService {
  resolveMany(models: readonly ModelInfo[]): Readonly<Record<string, number | null>> {
    return Object.fromEntries(models.map((model) => [model.model_identifier, nativeModelCapacity(model)]));
  }
}
