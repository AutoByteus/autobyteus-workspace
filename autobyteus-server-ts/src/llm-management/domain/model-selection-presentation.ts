import type { ModelInfo } from "autobyteus-ts/llm/models.js";

/**
 * Runtime-neutral picker hint carried on a catalog row.
 * `aliasOfModelIdentifier` names another `model_identifier` in the same runtime
 * catalog that represents this row in model pickers; the row itself stays a
 * valid catalog identifier.
 */
export type ModelSelectionPresentation = Readonly<{
  recommended: boolean;
  aliasOfModelIdentifier: string | null;
}>;

export type ModelInfoWithSelectionPresentation = ModelInfo & {
  selection_presentation?: ModelSelectionPresentation | null;
};
