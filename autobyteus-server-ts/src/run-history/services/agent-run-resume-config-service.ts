import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  AgentRunStatusProjectionService,
  getAgentRunStatusProjectionService,
} from "../../agent-execution/services/agent-run-status-projection-service.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";
import { AgentRunHistoryCatalogService } from "./agent-run-history-catalog-service.js";
import { runModelConfigEditability, type RunModelConfigEditability } from "../domain/run-model-config.js";

type RunRuntimeReference = {
  runtimeKind: RuntimeKind;
  sessionId: string | null;
  threadId: string | null;
  metadata: Record<string, unknown> | null;
};

type RunResumeMetadataConfig = AgentRunMetadata & {
  runtimeReference: RunRuntimeReference;
};

type RunResumeConfig = {
  runId: string;
  isActive: boolean;
  metadataConfig: RunResumeMetadataConfig;
  modelConfigEditability: RunModelConfigEditability;
};

export class AgentRunResumeConfigService {
  private readonly metadataStore: AgentRunMetadataStore;
  private readonly statusProjectionService: AgentRunStatusProjectionService;
  private readonly historyCatalog: AgentRunHistoryCatalogService;

  constructor(memoryDir: string, dependencies: {
    metadataStore?: AgentRunMetadataStore;
    statusProjectionService?: AgentRunStatusProjectionService;
    historyCatalog?: AgentRunHistoryCatalogService;
  } = {}) {
    this.metadataStore = dependencies.metadataStore ?? new AgentRunMetadataStore(memoryDir);
    this.statusProjectionService = dependencies.statusProjectionService ?? getAgentRunStatusProjectionService();
    this.historyCatalog = dependencies.historyCatalog ?? new AgentRunHistoryCatalogService(memoryDir);
  }

  async getAgentRunResumeConfig(runId: string): Promise<RunResumeConfig> {
    const metadata = await this.metadataStore.readMetadata(runId);
    if (!metadata) {
      throw new Error(`Run metadata not found for '${runId}'.`);
    }

    const projection = await this.statusProjectionService.getRunStatusProjection(runId);
    const isActive = projection.isActive;
    const row = await this.historyCatalog.getCatalogRow(runId);
    const modelConfigEditability = runModelConfigEditability({
      isActive,
      available: Boolean(row),
      archived: Boolean(row?.archivedAt),
    });

    return {
      runId,
      isActive,
      metadataConfig: {
        ...metadata,
        runtimeReference: this.buildRuntimeReference(metadata),
      },
      modelConfigEditability,
    };
  }

  private buildRuntimeReference(metadata: AgentRunMetadata): RunRuntimeReference {
    if (metadata.runtimeKind === RuntimeKind.CODEX_APP_SERVER) {
      return {
        runtimeKind: metadata.runtimeKind,
        sessionId: null,
        threadId: metadata.platformAgentRunId,
        metadata: null,
      };
    }
    if (metadata.runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK) {
      return {
        runtimeKind: metadata.runtimeKind,
        sessionId: metadata.platformAgentRunId,
        threadId: null,
        metadata: null,
      };
    }
    return {
      runtimeKind: metadata.runtimeKind,
      sessionId: null,
      threadId: null,
      metadata: null,
    };
  }
}

let cachedAgentRunResumeConfigService: AgentRunResumeConfigService | null = null;

export const getAgentRunResumeConfigService = (): AgentRunResumeConfigService => {
  if (!cachedAgentRunResumeConfigService) {
    cachedAgentRunResumeConfigService = new AgentRunResumeConfigService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunResumeConfigService;
};
