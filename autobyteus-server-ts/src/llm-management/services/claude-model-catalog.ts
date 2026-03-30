import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import {
  ClaudeSdkClient,
  getClaudeSdkClient,
} from "../../runtime-management/claude/client/claude-sdk-client.js";

export class ClaudeModelCatalog {
  constructor(private readonly sdkClient: ClaudeSdkClient = getClaudeSdkClient()) {}

  async listModels(): Promise<ModelInfo[]> {
    return this.sdkClient.listModels();
  }
}

let cachedClaudeModelCatalog: ClaudeModelCatalog | null = null;

export const getClaudeModelCatalog = (): ClaudeModelCatalog => {
  if (!cachedClaudeModelCatalog) {
    cachedClaudeModelCatalog = new ClaudeModelCatalog();
  }
  return cachedClaudeModelCatalog;
};
