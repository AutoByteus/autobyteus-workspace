import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import type { ModelInfoWithSelectionPresentation } from "../domain/model-selection-presentation.js";
import {
  ClaudeSdkClient,
  getClaudeSdkClient,
} from "../../runtime-management/claude/client/claude-sdk-client.js";

export class ClaudeModelCatalog {
  constructor(private readonly sdkClient: ClaudeSdkClient = getClaudeSdkClient()) {}

  async selectionCatalog(): Promise<{ offeredModels: ModelInfo[]; findExactCurrent: (id: string) => ModelInfo | null }> {
    const raw = await this.sdkClient.listModels() as ModelInfoWithSelectionPresentation[];
    // The SDK adapter proves the default/sibling identity from resolved model IDs.
    // Filtering belongs here, not in raw SDK transport or Web presentation.
    const defaultRow = raw.find((row) => row.model_identifier === "default");
    const sibling = defaultRow?.selection_presentation?.aliasOfModelIdentifier;
    const redundantDefault = sibling && raw.some((row) => row.model_identifier === sibling);
    return {
      offeredModels: redundantDefault ? raw.filter((row) => row !== defaultRow) : raw,
      findExactCurrent: (id) => raw.find((row) => row.model_identifier === id) ?? null,
    };
  }

  async listModels(): Promise<ModelInfo[]> {
    return (await this.selectionCatalog()).offeredModels;
  }
}

let cachedClaudeModelCatalog: ClaudeModelCatalog | null = null;

export const getClaudeModelCatalog = (): ClaudeModelCatalog => {
  if (!cachedClaudeModelCatalog) {
    cachedClaudeModelCatalog = new ClaudeModelCatalog();
  }
  return cachedClaudeModelCatalog;
};
