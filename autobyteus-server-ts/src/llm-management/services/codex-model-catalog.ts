import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { asString } from "../../agent-execution/backends/codex/codex-app-server-json.js";
import { mapCodexModelListRowToModelInfo } from "../../agent-execution/backends/codex/codex-app-server-model-normalizer.js";

export class CodexModelCatalog {
  private readonly clientManager: CodexAppServerClientManager;

  constructor(
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
  ) {
    this.clientManager = clientManager;
  }

  async listModels(cwd?: string): Promise<ModelInfo[]> {
    const workingDirectory = cwd ?? process.cwd();
    const client = await this.clientManager.acquireClient(workingDirectory);
    const models: ModelInfo[] = [];
    try {
      let cursor: string | null = null;
      do {
        const response = await client.request<unknown>("model/list", {
          cursor,
          includeHidden: false,
        });
        const data = (response && typeof response === "object" ? response : null) as
          | Record<string, unknown>
          | null;
        const rows = Array.isArray(data?.data) ? data.data : [];
        for (const row of rows) {
          const mapped = mapCodexModelListRowToModelInfo(row);
          if (mapped) {
            models.push(mapped);
          }
        }
        cursor = asString(data?.nextCursor);
      } while (cursor);
      return models;
    } finally {
      await this.clientManager.releaseClient(workingDirectory);
    }
  }
}

let cachedCodexModelCatalog: CodexModelCatalog | null = null;

export const getCodexModelCatalog = (): CodexModelCatalog => {
  if (!cachedCodexModelCatalog) {
    cachedCodexModelCatalog = new CodexModelCatalog();
  }
  return cachedCodexModelCatalog;
};
