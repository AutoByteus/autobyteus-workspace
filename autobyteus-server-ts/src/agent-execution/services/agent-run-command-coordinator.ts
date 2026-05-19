import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunEventType, isAgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRun } from "../domain/agent-run.js";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../domain/agent-status-payload.js";
import {
  AgentRunService,
  getAgentRunService,
} from "./agent-run-service.js";
import {
  AgentRunCommandRegistry,
  getAgentRunCommandRegistry,
} from "./agent-run-command-registry.js";
import {
  AgentRunCommandStatusOverlayStore,
  getAgentRunCommandStatusOverlayStore,
} from "./agent-run-command-status-overlay-store.js";
import {
  AgentRunStatusProjectionService,
  getAgentRunStatusProjectionService,
} from "./agent-run-status-projection-service.js";
import {
  AgentStreamBroadcaster,
  getAgentStreamBroadcaster,
} from "../../services/agent-streaming/agent-stream-broadcaster.js";
import { ServerMessage, ServerMessageType } from "../../services/agent-streaming/models.js";
import type {
  AgentCommandAckPayload,
  AgentRunCommandCoordinatorInput,
  AgentRunCommandCoordinatorResult,
  AgentRunCommandErrorCode,
  AgentRunCommandRecord,
} from "./agent-run-command-types.js";

type ValidatedCommandIdentity = {
  runId: string;
  messageId: string;
  dedupeKey: string;
};

type CommandCorrelatedStatus = {
  status: AgentApiStatus;
  shouldPublishReplacement: boolean;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const toMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);

export class AgentRunCommandCoordinator {
  constructor(private readonly deps: {
    agentRunService?: AgentRunService;
    registry?: AgentRunCommandRegistry;
    overlayStore?: AgentRunCommandStatusOverlayStore;
    projectionService?: AgentRunStatusProjectionService;
    broadcaster?: AgentStreamBroadcaster;
  } = {}) {}

  async postUserMessage(
    input: AgentRunCommandCoordinatorInput,
  ): Promise<AgentRunCommandCoordinatorResult> {
    const identity = this.validateIdentity(input);
    if (!identity.ok) {
      return this.invalidIdentityAck(input, identity.message);
    }

    const registry = this.registry;
    const begin = registry.begin(identity.value);
    if (begin.kind === "duplicate") {
      return this.duplicateResult(begin.record);
    }
    if (begin.kind === "busy") {
      return this.recordResult(begin.record, "rejected", false, false);
    }

    const record = begin.record;
    const activeRunAtStart = this.agentRunService.getAgentRun(record.runId);
    const startedFromInactiveIdentity = !activeRunAtStart;

    if (startedFromInactiveIdentity) {
      const statusPayload = this.overlayStore.publishInitializing({
        runId: record.runId,
        messageId: record.messageId,
      });
      this.publishStatus(record.runId, statusPayload);
    }

    try {
      const activeRun = activeRunAtStart ?? await this.resolveRuntimeForCommand(record.runId);
      let messageHandoffStarted = false;
      const unsubscribe = this.observeRuntimeStatus(
        activeRun,
        record,
        () => messageHandoffStarted,
      );
      input.onActiveRunReady?.(activeRun);
      registry.markForwarded({ runId: record.runId, messageId: record.messageId });
      messageHandoffStarted = true;

      const result = await activeRun.postUserMessage(
        this.withCommandMetadata(input.message, record),
      );
      if (!result.accepted) {
        unsubscribe();
        return this.failCommand(record, "RUNTIME_REJECTED", result.message ?? "Runtime rejected the command.", {
          publishErrorStatus: startedFromInactiveIdentity,
        });
      }

      if (result.turnId) {
        registry.markForwarded({
          runId: record.runId,
          messageId: record.messageId,
          turnId: result.turnId,
        });
      }
      await this.agentRunService.recordRunActivity(activeRun, {
        summary: input.summary ?? input.message.content,
        lastKnownStatus: "ACTIVE",
        lastActivityAt: new Date().toISOString(),
      });
      return this.recordResult(
        registry.getRecord(record.runId, record.messageId) ?? record,
        "accepted",
        true,
        false,
      );
    } catch (error) {
      const code = this.isMissingRunError(error) ? "RUN_NOT_FOUND" : "ACTIVATION_FAILED";
      return this.failCommand(record, code, toMessage(error), {
        publishErrorStatus: startedFromInactiveIdentity,
      });
    }
  }

  private async resolveRuntimeForCommand(runId: string): Promise<AgentRun> {
    const activeRun = this.agentRunService.getAgentRun(runId);
    if (activeRun) {
      return activeRun;
    }

    const metadata = await this.agentRunService.getRunMetadata(runId);
    if (!metadata || metadata.lastKnownStatus === "TERMINATED") {
      throw new Error(`Run '${runId}' was not found or cannot accept commands.`);
    }

    const activationState = metadata.activationState ?? "ACTIVATED";
    if (activationState === "PREPARED" || activationState === "ACTIVATION_FAILED") {
      return this.agentRunService.activatePreparedRun(runId);
    }
    if (activationState === "ACTIVATING") {
      throw new Error(`Run '${runId}' is already activating.`);
    }
    return (await this.agentRunService.restoreAgentRun(runId)).run;
  }

  private observeRuntimeStatus(
    activeRun: AgentRun,
    record: AgentRunCommandRecord,
    isMessageHandoffStarted: () => boolean,
  ): () => void {
    let overlayReplaced = false;
    const unsubscribe = activeRun.subscribeToEvents((event) => {
      if (!isAgentRunEvent(event)) {
        return;
      }
      const resolvedStatus = this.resolveCommandCorrelatedStatus(
        event,
        record,
        isMessageHandoffStarted(),
      );
      if (!resolvedStatus) {
        return;
      }
      if (!overlayReplaced && this.clearOverlayForCommandEvent(record)) {
        overlayReplaced = true;
        if (resolvedStatus.shouldPublishReplacement) {
          this.publishStatus(
            record.runId,
            this.buildReplacementStatusPayload(activeRun, record.runId, resolvedStatus.status),
          );
        }
      }
      const status = resolvedStatus.status;
      if (status !== "idle" && status !== "offline" && status !== "error") {
        return;
      }

      if (status === "error") {
        this.registry.markFailed({
          runId: record.runId,
          messageId: record.messageId,
          code: "RUNTIME_REJECTED",
          message: "Runtime reported an error while handling the command.",
        });
      } else {
        this.registry.markCompleted({
          runId: record.runId,
          messageId: record.messageId,
        });
      }
      unsubscribe();
    });
    return unsubscribe;
  }

  private clearOverlayForCommandEvent(record: AgentRunCommandRecord): boolean {
    const overlay = this.overlayStore.getOverlay(record.runId);
    if (!overlay || overlay.messageId !== record.messageId) {
      return false;
    }
    return this.overlayStore.clear(record.runId);
  }

  private async failCommand(
    record: AgentRunCommandRecord,
    code: AgentRunCommandErrorCode,
    message: string,
    options: { publishErrorStatus: boolean },
  ): Promise<AgentRunCommandCoordinatorResult> {
    this.registry.markFailed({
      runId: record.runId,
      messageId: record.messageId,
      code,
      message,
    });
    let statusPayload: AgentStatusPayload | null = null;
    if (options.publishErrorStatus) {
      statusPayload = this.overlayStore.publishError({
        runId: record.runId,
        messageId: record.messageId,
        errorMessage: message,
      });
      this.publishStatus(record.runId, statusPayload);
    }
    return this.recordResult(
      this.registry.getRecord(record.runId, record.messageId) ?? record,
      "failed",
      false,
      false,
      statusPayload ?? undefined,
    );
  }

  private duplicateResult(
    record: AgentRunCommandRecord,
  ): Promise<AgentRunCommandCoordinatorResult> {
    const state = record.state === "COMPLETED"
      ? "duplicate_completed"
      : record.state === "FAILED"
        ? "duplicate_failed"
        : record.state === "REJECTED"
          ? "duplicate_rejected"
          : "duplicate_in_progress";
    const accepted = state === "duplicate_in_progress" || state === "duplicate_completed";
    return this.recordResult(record, state, accepted, true);
  }

  private async recordResult(
    record: AgentRunCommandRecord,
    state: AgentCommandAckPayload["state"],
    accepted: boolean,
    duplicate: boolean,
    statusPayloadOverride?: AgentStatusPayload,
  ): Promise<AgentRunCommandCoordinatorResult> {
    const projection = statusPayloadOverride
      ? null
      : await this.projectionService.getRunStatusProjection(record.runId);
    return {
      ack: {
        command_type: "SEND_MESSAGE",
        run_id: record.runId,
        message_id: record.messageId,
        dedupe_key: record.dedupeKey,
        state,
        accepted,
        duplicate,
        ...(record.code ? { code: record.code } : {}),
        ...(record.message ? { message: record.message } : {}),
        status: statusPayloadOverride ?? projection!.statusPayload,
      },
      turnId: record.turnId ?? null,
    };
  }

  private async invalidIdentityAck(
    input: AgentRunCommandCoordinatorInput,
    message: string,
  ): Promise<AgentRunCommandCoordinatorResult> {
    const runId = input.runId.trim();
    const projection = runId
      ? await this.projectionService.getRunStatusProjection(runId)
      : null;
    return {
      ack: {
        command_type: "SEND_MESSAGE",
        run_id: runId,
        message_id: input.messageId,
        dedupe_key: input.dedupeKey,
        state: "rejected",
        accepted: false,
        duplicate: false,
        code: "INVALID_COMMAND_ID",
        message,
        ...(projection ? { status: projection.statusPayload } : {}),
      },
      turnId: null,
    };
  }

  private withCommandMetadata(
    message: AgentRunCommandCoordinatorInput["message"],
    record: AgentRunCommandRecord,
  ): AgentInputUserMessage {
    return new AgentInputUserMessage(
      message.content,
      message.senderType,
      message.contextFiles,
      {
        ...message.metadata,
        message_id: record.messageId,
        dedupe_key: record.dedupeKey,
      },
    );
  }

  private publishStatus(runId: string, payload: AgentStatusPayload): void {
    try {
      this.broadcaster.publishToRun(
        runId,
        new ServerMessage(ServerMessageType.AGENT_STATUS, payload),
      );
    } catch (error) {
      logger.warn(`Failed to publish command status for run '${runId}'.`, error);
    }
  }

  private resolveCommandCorrelatedStatus(
    event: unknown,
    record: AgentRunCommandRecord,
    messageHandoffStarted: boolean,
  ): CommandCorrelatedStatus | null {
    if (!messageHandoffStarted || !isAgentRunEvent(event) || !this.isCurrentInFlightCommand(record)) {
      return null;
    }
    if (event.eventType === AgentRunEventType.AGENT_STATUS) {
      const status = event.payload.status;
      return status === "offline" || status === "initializing" || status === "idle" || status === "running" || status === "error"
        ? { status, shouldPublishReplacement: false }
        : null;
    }
    if (event.eventType === AgentRunEventType.TURN_STARTED) {
      return { status: "running", shouldPublishReplacement: true };
    }
    if (event.eventType === AgentRunEventType.ERROR || event.statusHint === "ERROR") {
      return { status: "error", shouldPublishReplacement: true };
    }
    if (event.statusHint === "IDLE") {
      return { status: "idle", shouldPublishReplacement: true };
    }
    return null;
  }

  private isCurrentInFlightCommand(record: AgentRunCommandRecord): boolean {
    const current = this.registry.getInFlightRecord(record.runId);
    return current?.messageId === record.messageId;
  }

  private buildReplacementStatusPayload(
    activeRun: AgentRun,
    runId: string,
    status: AgentApiStatus,
  ): AgentStatusPayload {
    const snapshot = activeRun.getStatusSnapshot();
    if (normalizeAgentApiStatus(snapshot.status) === status) {
      return snapshot;
    }
    return buildAgentStatusPayload({
      status,
      canInterrupt: status === "running" && snapshot.can_interrupt === true,
      agentId: runId,
    });
  }

  private validateIdentity(input: AgentRunCommandCoordinatorInput):
    | { ok: true; value: ValidatedCommandIdentity }
    | { ok: false; message: string } {
    const runId = input.runId.trim();
    const messageId = input.messageId.trim();
    const dedupeKey = input.dedupeKey.trim();
    if (!runId) {
      return { ok: false, message: "runId is required." };
    }
    if (!messageId || messageId.length > 128) {
      return { ok: false, message: "message_id must be a non-empty string no longer than 128 characters." };
    }
    if (!dedupeKey || dedupeKey.length > 256) {
      return { ok: false, message: "dedupe_key must be a non-empty string no longer than 256 characters." };
    }
    return { ok: true, value: { runId, messageId, dedupeKey } };
  }

  private isMissingRunError(error: unknown): boolean {
    const message = toMessage(error).toLowerCase();
    return message.includes("not found") || message.includes("metadata is missing");
  }

  private get agentRunService(): AgentRunService {
    return this.deps.agentRunService ?? getAgentRunService();
  }

  private get registry(): AgentRunCommandRegistry {
    return this.deps.registry ?? getAgentRunCommandRegistry();
  }

  private get overlayStore(): AgentRunCommandStatusOverlayStore {
    return this.deps.overlayStore ?? getAgentRunCommandStatusOverlayStore();
  }

  private get projectionService(): AgentRunStatusProjectionService {
    return this.deps.projectionService ?? getAgentRunStatusProjectionService();
  }

  private get broadcaster(): AgentStreamBroadcaster {
    return this.deps.broadcaster ?? getAgentStreamBroadcaster();
  }
}

let cachedAgentRunCommandCoordinator: AgentRunCommandCoordinator | null = null;

export const getAgentRunCommandCoordinator = (): AgentRunCommandCoordinator => {
  if (!cachedAgentRunCommandCoordinator) {
    cachedAgentRunCommandCoordinator = new AgentRunCommandCoordinator();
  }
  return cachedAgentRunCommandCoordinator;
};
