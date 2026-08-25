import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRun } from "../domain/agent-run.js";
import { AgentRunManager } from "./agent-run-manager.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { getWorkspaceManager } from "../../workspaces/workspace-manager.js";
import {
  type AgentRunMetadata,
} from "../../run-history/store/agent-run-metadata-types.js";
import {
  AgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunHistoryCatalogService,
} from "../../run-history/services/agent-run-history-catalog-service.js";
import type { ApplicationExecutionProducerRuntimeKind } from "@autobyteus/application-sdk-contracts";
import type { ObservedRunLifecycleEvent } from "../../runtime-management/domain/observed-run-lifecycle-event.js";
import { isAgentRunEvent } from "../domain/agent-run-event.js";
import { AgentRunCanonicalFailureObserver } from "../events/agent-run-canonical-failure-observer.js";
import { AgentRunProvisioningService } from "./agent-run-provisioning-service.js";
import type { AgentRunIdentityAllocator } from "./agent-run-identity-allocator.js";
import { StandaloneAgentRunLifecycleService } from "./standalone-agent-run-lifecycle-service.js";
import type { RunModelConfigUpdateResult } from "../../run-history/domain/run-model-config.js";

export interface CreateAgentRunInput {
  agentDefinitionId: string;
  workspaceRootPath: string;
  workspaceId?: string | null;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  llmConfig?: Record<string, unknown> | null;
  skillAccessMode: SkillAccessMode;
  runtimeKind: string;
  applicationBinding?: {
    applicationId: string;
    bindingId: string;
    displayName: string | null;
    runtimeKind: ApplicationExecutionProducerRuntimeKind;
  } | null;
}

export interface CreateAgentRunResult {
  runId: string;
}

export interface PrepareAgentRunInput extends CreateAgentRunInput {
  initialSummary?: string | null;
}

export interface PrepareAgentRunResult {
  runId: string;
  activationState: "PREPARED";
  preparedExpiresAt: string;
}

export interface RestoreAgentRunResult {
  run: AgentRun;
  metadata: AgentRunMetadata;
}

export interface CancelPreparedAgentRunResult {
  success: boolean;
  message: string;
}

export type AgentRunTerminationRoute = "native" | "runtime" | "not_found";

export interface AgentRunTerminationResult {
  success: boolean;
  message: string;
  route: AgentRunTerminationRoute;
  runtimeKind: RuntimeKind | null;
}


export class AgentRunService {
  private agentRunManager: AgentRunManager;
  private metadataService: AgentRunMetadataService;
  private historyCatalogService: AgentRunHistoryCatalogService;
  private readonly provisioningService: AgentRunProvisioningService;
  private readonly lifecycleService: StandaloneAgentRunLifecycleService;

  constructor(
    memoryDir: string,
    deps: {
      agentRunManager?: AgentRunManager;
      metadataService?: AgentRunMetadataService;
      historyCatalogService?: AgentRunHistoryCatalogService;
      workspaceManager?: ReturnType<typeof getWorkspaceManager>;
      agentRunIdentityAllocator?: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
      lifecycleService?: StandaloneAgentRunLifecycleService;
    } = {},
  ) {
    this.agentRunManager = deps.agentRunManager ?? AgentRunManager.getInstance();
    this.metadataService =
      deps.metadataService ?? new AgentRunMetadataService(memoryDir);
    this.historyCatalogService =
      deps.historyCatalogService ?? new AgentRunHistoryCatalogService(memoryDir);
    const workspaceManager = deps.workspaceManager ?? getWorkspaceManager();
    this.provisioningService = new AgentRunProvisioningService(memoryDir, {
      agentRunManager: this.agentRunManager,
      metadataService: this.metadataService,
      historyCatalogService: this.historyCatalogService,
      workspaceManager,
      agentRunIdentityAllocator: deps.agentRunIdentityAllocator,
    });
    this.lifecycleService = deps.lifecycleService ?? new StandaloneAgentRunLifecycleService(memoryDir, {
      agentRunManager: this.agentRunManager,
      metadataService: this.metadataService,
      historyCatalogService: this.historyCatalogService,
      workspaceManager,
    });
  }

  async terminateAgentRun(runId: string): Promise<AgentRunTerminationResult> {
    const activeRun = this.agentRunManager.getActiveRun(runId);
    if (!activeRun) {
      return this.notFound(null);
    }

    const route: AgentRunTerminationRoute =
      activeRun.runtimeKind === RuntimeKind.AUTOBYTEUS ? "native" : "runtime";
    const terminated = await this.agentRunManager.terminateAgentRun(runId);
    if (!terminated) {
      return this.notFound(activeRun.runtimeKind);
    }

    await this.historyCatalogService.recordRunTerminated({ runId });
    return {
      success: true,
      message: "Agent run terminated successfully.",
      route,
      runtimeKind: activeRun.runtimeKind,
    };
  }

  getAgentRun(runId: string): AgentRun | null {
    return this.agentRunManager.getActiveRun(normalizeRequiredRunId(runId));
  }

  async resolveAgentRun(runId: string): Promise<AgentRun | null> {
    const normalizedRunId = normalizeRequiredRunId(runId);
    const activeRun = this.getAgentRun(normalizedRunId);
    if (activeRun) {
      return activeRun;
    }
    try {
      const restored = await this.restoreAgentRun(normalizedRunId);
      return restored.run;
    } catch {
      return null;
    }
  }

  async observeAgentRunLifecycle(
    runId: string,
    listener: (event: ObservedRunLifecycleEvent) => void,
  ): Promise<(() => void) | null> {
    const run = await this.resolveAgentRun(runId);
    if (!run) {
      return null;
    }

    listener({
      runtimeSubject: "AGENT_RUN",
      runId: run.runId,
      phase: "ATTACHED",
      occurredAt: new Date().toISOString(),
    });

    let terminalPhase: ObservedRunLifecycleEvent["phase"] | null = null;
    const failureObserver = new AgentRunCanonicalFailureObserver();
    const unsubscribe = run.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      if (terminalPhase) {
        return;
      }
      const failure = failureObserver.observe(event);
      if (!failure) return;
      terminalPhase = "FAILED";
      listener({
        runtimeSubject: "AGENT_RUN",
        runId: run.runId,
        phase: "FAILED",
        occurredAt: new Date().toISOString(),
        errorMessage: failure.message,
      });
    });

    const inactivePollHandle = setInterval(() => {
      if (terminalPhase || run.isActive()) {
        return;
      }
      terminalPhase = "TERMINATED";
      listener({
        runtimeSubject: "AGENT_RUN",
        runId: run.runId,
        phase: "TERMINATED",
        occurredAt: new Date().toISOString(),
      });
    }, 1_000);
    inactivePollHandle.unref?.();

    return () => {
      clearInterval(inactivePollHandle);
      unsubscribe();
    };
  }

  async createAgentRun(
    input: CreateAgentRunInput,
  ): Promise<CreateAgentRunResult> {
    const prepared = await this.provisioningService.prepareAgentRun(input);
    const activeRun = await this.lifecycleService.activatePreparedRun(prepared.runId);
    return { runId: activeRun.runId };
  }

  async prepareAgentRun(
    input: PrepareAgentRunInput,
  ): Promise<PrepareAgentRunResult> {
    return this.provisioningService.prepareAgentRun(input);
  }

  async activatePreparedRun(runId: string): Promise<AgentRun> {
    return this.lifecycleService.activatePreparedRun(runId);
  }

  resolveCommandReadyAgentRun(runId: string): Promise<AgentRun> {
    return this.lifecycleService.resolveCommandReadyAgentRun(runId);
  }

  async cancelPreparedAgentRun(runId: string): Promise<CancelPreparedAgentRunResult> {
    return this.provisioningService.cancelPreparedAgentRun(runId);
  }

  async cleanupStalePreparedRuns(now: Date = new Date()): Promise<number> {
    return this.provisioningService.cleanupStalePreparedRuns(now);
  }

  async hasRunIdentity(runId: string): Promise<boolean> {
    return this.provisioningService.hasRunIdentity(runId);
  }

  async getRunMetadata(runId: string): Promise<AgentRunMetadata | null> {
    return this.provisioningService.getRunMetadata(runId);
  }

  async recordRunActivity(
    run: AgentRun,
    input: {
      summary?: string | null;
    } = {},
  ): Promise<void> {
    await this.historyCatalogService.recordRunSummary({
      runId: run.runId,
      summary: input.summary ?? "",
    });
  }

  async restoreAgentRun(runId: string): Promise<RestoreAgentRunResult> {
    return this.lifecycleService.restorePersistedRun(normalizeRequiredRunId(runId));
  }

  updateStoppedModelConfig(input: {
    agentRunId: string;
    llmConfig: Readonly<Record<string, unknown>> | null;
  }): Promise<RunModelConfigUpdateResult<AgentRunMetadata | null>> {
    return this.lifecycleService.updateStoppedModelConfig(input);
  }

  private notFound(runtimeKind: RuntimeKind | null): AgentRunTerminationResult {
    return {
      success: false,
      message: "Agent run not found.",
      route: "not_found",
      runtimeKind,
    };
  }

}

const normalizeRequiredRunId = (runId: string): string => {
  const normalized = runId.trim();
  if (!normalized) {
    throw new Error("runId is required.");
  }
  return normalized;
};

let cachedAgentRunService: AgentRunService | null = null;

export const getAgentRunService = (): AgentRunService => {
  if (!cachedAgentRunService) {
    cachedAgentRunService = new AgentRunService(
      appConfigProvider.config.getMemoryDir(),
    );
  }
  return cachedAgentRunService;
};
