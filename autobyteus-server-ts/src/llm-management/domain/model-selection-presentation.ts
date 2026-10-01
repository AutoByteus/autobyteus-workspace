import type { ModelInfo } from "autobyteus-ts/llm/models.js";

/**
 * Internal SDK-derived evidence used by ClaudeModelCatalog to identify a
 * redundant default row. The alias target is never transported to Web.
 */
export type ModelSelectionPresentation = Readonly<{
  recommended: boolean;
  aliasOfModelIdentifier: string | null;
}>;

export type ModelInfoWithSelectionPresentation = ModelInfo & {
  selection_presentation?: ModelSelectionPresentation | null;
};
