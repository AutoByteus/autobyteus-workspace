import { appConfigProvider } from "../../config/app-config-provider.js";
import { TeamRunMetadataStore } from "../store/team-run-metadata-store.js";
import type { TeamRunMetadata } from "../store/team-run-metadata-types.js";

export class TeamRunMetadataService {
  private readonly metadataStore: TeamRunMetadataStore;

  constructor(
    memoryDir: string,
    dependencies: {
      metadataStore?: TeamRunMetadataStore;
    } = {},
  ) {
    this.metadataStore =
      dependencies.metadataStore ?? new TeamRunMetadataStore(memoryDir);
  }

  async readMetadata(teamRunId: string): Promise<TeamRunMetadata | null> {
    return this.metadataStore.readMetadata(teamRunId);
  }

  async listTeamRunIds(): Promise<string[]> {
    return this.metadataStore.listTeamRunIds();
  }

  async writeMetadata(teamRunId: string, metadata: TeamRunMetadata): Promise<void> {
    await this.metadataStore.writeMetadata(teamRunId, metadata);
  }
}

let cachedTeamRunMetadataService: TeamRunMetadataService | null = null;

export const getTeamRunMetadataService = (): TeamRunMetadataService => {
  if (!cachedTeamRunMetadataService) {
    cachedTeamRunMetadataService = new TeamRunMetadataService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedTeamRunMetadataService;
};
