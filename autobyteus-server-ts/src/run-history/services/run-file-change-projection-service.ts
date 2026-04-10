import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "./agent-run-metadata-service.js";
import {
  RunFileChangeProjectionStore,
  getRunFileChangeProjectionStore,
} from "../../services/run-file-changes/run-file-change-projection-store.js";
import {
  RunFileChangeService,
  getRunFileChangeService,
} from "../../services/run-file-changes/run-file-change-service.js";
import {
  normalizeRunFileChangePath,
  type RunFileChangeEntry,
  type RunFileChangeProjection,
} from "../../services/run-file-changes/run-file-change-types.js";
import type { AgentRun } from "../../agent-execution/domain/agent-run.js";

export class RunFileChangeProjectionService {
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataService: AgentRunMetadataService;
  private readonly projectionStore: RunFileChangeProjectionStore;
  private readonly runFileChangeService: RunFileChangeService;

  constructor(options: {
    agentRunManager?: AgentRunManager;
    metadataService?: AgentRunMetadataService;
    projectionStore?: RunFileChangeProjectionStore;
    runFileChangeService?: RunFileChangeService;
  } = {}) {
    this.agentRunManager = options.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService = options.metadataService ?? getAgentRunMetadataService();
    this.projectionStore = options.projectionStore ?? getRunFileChangeProjectionStore();
    this.runFileChangeService = options.runFileChangeService ?? getRunFileChangeService();
  }

  async getProjection(runId: string): Promise<RunFileChangeEntry[]> {
    const projection = await this.readProjection(runId);
    return projection.entries;
  }

  async getEntry(runId: string, filePath: string): Promise<RunFileChangeEntry | null> {
    const normalizedPath = normalizeRunFileChangePath(filePath);
    if (!normalizedPath) {
      return null;
    }

    const projection = await this.readProjection(runId);
    return projection.entries.find((entry) => entry.path === normalizedPath) ?? null;
  }

  private async readProjection(runId: string): Promise<RunFileChangeProjection> {
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (activeRun) {
      return this.readActiveRunProjection(activeRun);
    }

    const metadata = await this.metadataService.readMetadata(runId);
    if (!metadata?.memoryDir) {
      return {
        version: 1,
        entries: [],
      };
    }

    return this.projectionStore.readProjection(metadata.memoryDir);
  }

  private async readActiveRunProjection(run: AgentRun): Promise<RunFileChangeProjection> {
    return this.runFileChangeService.getProjectionForRun(run);
  }
}

let cachedRunFileChangeProjectionService: RunFileChangeProjectionService | null = null;

export const getRunFileChangeProjectionService = (): RunFileChangeProjectionService => {
  if (!cachedRunFileChangeProjectionService) {
    cachedRunFileChangeProjectionService = new RunFileChangeProjectionService();
  }
  return cachedRunFileChangeProjectionService;
};
