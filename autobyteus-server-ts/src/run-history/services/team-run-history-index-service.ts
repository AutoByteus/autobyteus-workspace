import { appConfigProvider } from "../../config/app-config-provider.js";
import type { TeamRunIndexRow } from "../domain/team-run-history-index-types.js";
import { TeamRunHistoryIndexStore } from "../store/team-run-history-index-store.js";

/**
 * Low-level read-only adapter for team history index diagnostics.
 * Normal history listing and all lifecycle mutations must use
 * TeamRunHistoryCatalogService instead.
 */
export class TeamRunHistoryIndexService {
  private readonly indexStore: TeamRunHistoryIndexStore;

  constructor(
    memoryDir: string,
    dependencies: { indexStore?: TeamRunHistoryIndexStore } = {},
  ) {
    this.indexStore = dependencies.indexStore ?? new TeamRunHistoryIndexStore(memoryDir);
  }

  async listRows(): Promise<TeamRunIndexRow[]> {
    return this.indexStore.listRows();
  }

  async getRow(teamRunId: string): Promise<TeamRunIndexRow | null> {
    return this.indexStore.getRow(teamRunId);
  }
}

let cachedTeamRunHistoryIndexService: TeamRunHistoryIndexService | null = null;

export const getTeamRunHistoryIndexService = (): TeamRunHistoryIndexService => {
  if (!cachedTeamRunHistoryIndexService) {
    cachedTeamRunHistoryIndexService = new TeamRunHistoryIndexService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamRunHistoryIndexService;
};
