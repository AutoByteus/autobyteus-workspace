import { appConfigProvider } from "../../config/app-config-provider.js";
import type { RunHistoryIndexRow } from "../domain/agent-run-history-index-types.js";
import { AgentRunHistoryIndexStore } from "../store/agent-run-history-index-store.js";

/**
 * Low-level read adapter for tests and one-off diagnostics.
 * Normal source-code lifecycle/listing paths must use AgentRunHistoryCatalogService.
 */
export class AgentRunHistoryIndexService {
  private readonly indexStore: AgentRunHistoryIndexStore;

  constructor(
    memoryDir: string,
    dependencies: { indexStore?: AgentRunHistoryIndexStore } = {},
  ) {
    this.indexStore = dependencies.indexStore ?? new AgentRunHistoryIndexStore(memoryDir);
  }

  async listRows(): Promise<RunHistoryIndexRow[]> {
    return this.indexStore.listRows();
  }
}

let cachedAgentRunHistoryIndexService: AgentRunHistoryIndexService | null = null;

export const getAgentRunHistoryIndexService = (): AgentRunHistoryIndexService => {
  if (!cachedAgentRunHistoryIndexService) {
    cachedAgentRunHistoryIndexService = new AgentRunHistoryIndexService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunHistoryIndexService;
};
