import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import {
  getCodexAppServerClientManager,
  type CodexAppServerClientManager,
} from "../../runtime-management/codex/client/codex-app-server-client-manager.js";
import { asString } from "../../agent-execution/backends/codex/codex-app-server-json.js";
import { mapCodexModelListRowToModelInfo } from "../../agent-execution/backends/codex/codex-app-server-model-normalizer.js";
import { raceDeadline, type ReadDeadline } from "../../runtime-management/read-deadline.js";

export class CodexModelCatalog {
  private readonly clientManager: CodexAppServerClientManager;

  constructor(
    clientManager: CodexAppServerClientManager = getCodexAppServerClientManager(),
  ) {
    this.clientManager = clientManager;
  }

  /**
   * `deadline`: the end time of the read step; every request races it and the lease is released as soon as the race
   * ends (the abandoned request's late answer is ignored). Without it, as before.
   */
  async listModels(cwd?: string, options: Readonly<{ deadline?: ReadDeadline }> = {}): Promise<ModelInfo[]> {
    const workingDirectory = cwd ?? process.cwd();
    const lease = this.clientManager.beginAcquire(workingDirectory);
    const models: ModelInfo[] = [];
    try {
      const client = await raceDeadline(lease.acquire(), options.deadline);
      let cursor: string | null = null;
      do {
        const response = await raceDeadline(client.request<unknown>("model/list", {
          cursor,
          includeHidden: false,
        }), options.deadline);
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
      await lease.release();
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
