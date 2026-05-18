import { appConfigProvider } from "../../config/app-config-provider.js";
import { AgentRunManager } from "./agent-run-manager.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../domain/agent-status-payload.js";
import type { RunKnownStatus } from "../../run-history/domain/agent-run-history-index-types.js";
import {
  AgentRunMetadataService,
  getAgentRunMetadataService,
} from "../../run-history/services/agent-run-metadata-service.js";
import {
  AgentRunCommandStatusOverlayStore,
  getAgentRunCommandStatusOverlayStore,
} from "./agent-run-command-status-overlay-store.js";
import {
  AgentRunCommandRegistry,
  getAgentRunCommandRegistry,
} from "./agent-run-command-registry.js";

export type AgentRunStatusSource =
  | "COMMAND_OVERLAY"
  | "ACTIVE_RUNTIME"
  | "PREPARED_IDENTITY"
  | "HISTORICAL_METADATA"
  | "TERMINATED_METADATA"
  | "MISSING";

export type AgentRunStatusProjection = {
  runId: string;
  status: AgentApiStatus;
  canInterrupt: boolean;
  isActive: boolean;
  shouldConnectStream: boolean;
  lastKnownStatus: RunKnownStatus;
  statusSource: AgentRunStatusSource;
  statusPayload: AgentStatusPayload;
  command?: {
    messageId: string;
    state: "STARTING" | "FORWARDED" | "FAILED";
    updatedAt: string;
  } | null;
};

export class AgentRunStatusProjectionService {
  constructor(private readonly deps: {
    agentRunManager?: AgentRunManager;
    metadataService?: Pick<AgentRunMetadataService, "readMetadata">;
    overlayStore?: AgentRunCommandStatusOverlayStore;
    commandRegistry?: AgentRunCommandRegistry;
  } = {}) {}

  async getRunStatusProjection(runId: string): Promise<AgentRunStatusProjection> {
    const normalizedRunId = runId.trim();
    const agentRunManager = this.deps.agentRunManager ?? AgentRunManager.getInstance();
    const metadataService = this.deps.metadataService ?? getAgentRunMetadataService();
    const overlayStore = this.deps.overlayStore ?? getAgentRunCommandStatusOverlayStore();
    const commandRegistry = this.deps.commandRegistry ?? getAgentRunCommandRegistry();

    const activeRun = normalizedRunId ? agentRunManager.getActiveRun(normalizedRunId) : null;
    const overlay = normalizedRunId ? overlayStore.getOverlay(normalizedRunId) : null;
    const inFlight = normalizedRunId ? commandRegistry.getInFlightRecord(normalizedRunId) : null;

    if (overlay) {
      const overlayRecord = overlay.messageId
        ? commandRegistry.getRecord(normalizedRunId, overlay.messageId)
        : inFlight;
      return this.buildProjection({
        runId: normalizedRunId,
        status: overlay.status,
        canInterrupt: false,
        isActive: overlay.status === "initializing",
        shouldConnectStream: overlay.status === "initializing",
        lastKnownStatus: overlay.status === "error" ? "ERROR" : "ACTIVE",
        statusSource: "COMMAND_OVERLAY",
        statusPayload: overlay.statusPayload,
        command: overlayRecord ? {
          messageId: overlayRecord.messageId,
          state: this.toProjectedCommandState(overlayRecord.state),
          updatedAt: overlayRecord.updatedAt,
        } : null,
      });
    }

    if (activeRun) {
      const snapshot = activeRun.getStatusSnapshot();
      return this.buildProjection({
        runId: normalizedRunId,
        status: snapshot.status,
        canInterrupt: snapshot.can_interrupt === true,
        isActive: true,
        shouldConnectStream: true,
        lastKnownStatus: snapshot.status === "error" ? "ERROR" : "ACTIVE",
        statusSource: "ACTIVE_RUNTIME",
        statusPayload: snapshot,
        command: inFlight ? {
          messageId: inFlight.messageId,
          state: inFlight.state === "FORWARDED" ? "FORWARDED" : "STARTING",
          updatedAt: inFlight.updatedAt,
        } : null,
      });
    }

    const metadata = normalizedRunId ? await metadataService.readMetadata(normalizedRunId) : null;
    if (!metadata) {
      return this.fromMetadataFallback({
        runId: normalizedRunId,
        status: "offline",
        lastKnownStatus: "TERMINATED",
        statusSource: "MISSING",
      });
    }

    const activationState = metadata.activationState ?? "ACTIVATED";
    if (activationState === "PREPARED") {
      return this.fromMetadataFallback({
        runId: normalizedRunId,
        status: "offline",
        lastKnownStatus: "IDLE",
        statusSource: "PREPARED_IDENTITY",
      });
    }

    if (metadata.lastKnownStatus === "ERROR" || activationState === "ACTIVATION_FAILED") {
      return this.fromMetadataFallback({
        runId: normalizedRunId,
        status: "error",
        lastKnownStatus: "ERROR",
        statusSource: "HISTORICAL_METADATA",
      });
    }

    if (metadata.lastKnownStatus === "TERMINATED") {
      return this.fromMetadataFallback({
        runId: normalizedRunId,
        status: "offline",
        lastKnownStatus: "TERMINATED",
        statusSource: "TERMINATED_METADATA",
      });
    }

    return this.fromMetadataFallback({
      runId: normalizedRunId,
      status: "offline",
      lastKnownStatus: "IDLE",
      statusSource: "HISTORICAL_METADATA",
    });
  }


  private toProjectedCommandState(
    state: "STARTING" | "FORWARDED" | "COMPLETED" | "FAILED" | "REJECTED",
  ): "STARTING" | "FORWARDED" | "FAILED" {
    if (state === "FORWARDED") {
      return "FORWARDED";
    }
    if (state === "FAILED" || state === "REJECTED") {
      return "FAILED";
    }
    return "STARTING";
  }

  private fromMetadataFallback(input: {
    runId: string;
    status: AgentApiStatus;
    lastKnownStatus: RunKnownStatus;
    statusSource: AgentRunStatusSource;
  }): AgentRunStatusProjection {
    return this.buildProjection({
      ...input,
      canInterrupt: false,
      isActive: false,
      shouldConnectStream: false,
      statusPayload: buildAgentStatusPayload({
        status: input.status,
        canInterrupt: false,
        agentId: input.runId,
      }),
      command: null,
    });
  }

  private buildProjection(input: AgentRunStatusProjection): AgentRunStatusProjection {
    return input;
  }
}

let cachedAgentRunStatusProjectionService: AgentRunStatusProjectionService | null = null;
let cachedProjectionMemoryDir: string | null = null;

export const getAgentRunStatusProjectionService = (): AgentRunStatusProjectionService => {
  const memoryDir = appConfigProvider.config.getMemoryDir();
  if (!cachedAgentRunStatusProjectionService || cachedProjectionMemoryDir !== memoryDir) {
    cachedAgentRunStatusProjectionService = new AgentRunStatusProjectionService();
    cachedProjectionMemoryDir = memoryDir;
  }
  return cachedAgentRunStatusProjectionService;
};
