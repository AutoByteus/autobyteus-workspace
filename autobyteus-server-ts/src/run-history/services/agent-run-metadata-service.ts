import { appConfigProvider } from "../../config/app-config-provider.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";

export class AgentRunMetadataService {
  private readonly metadataStore: AgentRunMetadataStore;

  constructor(
    memoryDir: string,
    dependencies: {
      metadataStore?: AgentRunMetadataStore;
    } = {},
  ) {
    this.metadataStore =
      dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
  }

  async readMetadata(runId: string): Promise<AgentRunMetadata | null> {
    return this.metadataStore.readMetadata(runId);
  }

  async writeMetadata(runId: string, metadata: AgentRunMetadata): Promise<void> {
    await this.metadataStore.writeMetadata(runId, metadata);
  }
}

let cachedAgentRunMetadataService: AgentRunMetadataService | null = null;

export const getAgentRunMetadataService = (): AgentRunMetadataService => {
  if (!cachedAgentRunMetadataService) {
    cachedAgentRunMetadataService = new AgentRunMetadataService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunMetadataService;
};
