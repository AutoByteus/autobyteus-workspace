import { normalizeModelDescriptors } from "./claude-sdk-model-normalizer.js";
import type { ClaudeSdkQueryLike } from "./claude-sdk-client.js";

/** Resolve against the active turn control with its exact settings and cwd. */
export const resolveClaudeSdkSelectedModelForQuery = async (
  query: ClaudeSdkQueryLike,
  selectedValue: string,
): Promise<{ resolvedRawModelId: string | null; resolution: "resolved" | "missing" | "ambiguous" }> => {
  if (!query.supportedModels) return { resolvedRawModelId: null, resolution: "missing" };
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const rows = await Promise.race([
      query.supportedModels(),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("CLAUDE_SELECTED_MODEL_METADATA_TIMEOUT")), 10_000); }),
    ]);
    const descriptors = normalizeModelDescriptors(rows);
    const matches = descriptors.filter((row) => row.identifier === selectedValue);
    if (matches.length !== 1) return { resolvedRawModelId: null, resolution: matches.length > 1 ? "ambiguous" : "missing" };
    const match = matches[0]!;
    return match.resolvedModelAmbiguous
      ? { resolvedRawModelId: null, resolution: "ambiguous" }
      : match.resolvedModel
        ? { resolvedRawModelId: match.resolvedModel, resolution: "resolved" }
        : { resolvedRawModelId: null, resolution: "missing" };
  } catch {
    return { resolvedRawModelId: null, resolution: "missing" };
  } finally {
    if (timer) clearTimeout(timer);
  }
};
