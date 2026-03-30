import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { AgentRunMetadata } from "../store/agent-run-metadata-types.js";
import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";

type RunEditableFieldFlags = {
  llmModelIdentifier: boolean;
  llmConfig: boolean;
  autoExecuteTools: boolean;
  skillAccessMode: boolean;
  workspaceRootPath: boolean;
  runtimeKind: boolean;
};

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
  editableFields: RunEditableFieldFlags;
};

export class AgentRunResumeConfigService {
  private readonly agentRunManager: AgentRunManager;
  private readonly metadataStore: AgentRunMetadataStore;

  constructor(memoryDir: string) {
    this.agentRunManager = AgentRunManager.getInstance();
    this.metadataStore = new AgentRunMetadataStore(memoryDir);
  }

  async getAgentRunResumeConfig(runId: string): Promise<RunResumeConfig> {
    const metadata = await this.metadataStore.readMetadata(runId);
    if (!metadata) {
      throw new Error(`Run metadata not found for '${runId}'.`);
    }

    const isActive = this.agentRunManager.hasActiveRun(runId);
    const editableFields: RunEditableFieldFlags = {
      llmModelIdentifier: !isActive,
      llmConfig: !isActive,
      autoExecuteTools: !isActive,
      skillAccessMode: !isActive,
      workspaceRootPath: false,
      runtimeKind: false,
    };

    return {
      runId,
      isActive,
      metadataConfig: {
        ...metadata,
        runtimeReference: this.buildRuntimeReference(metadata),
      },
      editableFields,
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
