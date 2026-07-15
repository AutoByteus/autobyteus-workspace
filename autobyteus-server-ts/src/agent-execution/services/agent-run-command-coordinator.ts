import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import {
  resolveAgentRunErrorEvidence,
} from "../domain/agent-run-error-evidence.js";
import { resolveAgentRunEventTurnId } from "../domain/agent-run-event-turn-id.js";
import { AgentRunEventType, isAgentRunEvent, type AgentRunEvent } from "../domain/agent-run-event.js";
import type { AgentRun } from "../domain/agent-run.js";
import {
  buildAgentStatusPayload,
  normalizeAgentApiStatus,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../domain/agent-status-payload.js";
import { AgentRunService, getAgentRunService } from "./agent-run-service.js";
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

type ValidatedCommandIdentity = { runId: string; messageId: string; dedupeKey: string };
type CommandEvidence =
  | { kind: "START_IDENTIFIED"; sequence: number; turnId: string }
  | { kind: "START_ANONYMOUS"; sequence: number }
  | { kind: "TERMINAL_IDENTIFIED"; sequence: number; turnId: string }
  | { kind: "TERMINAL_ANONYMOUS"; sequence: number }
  | { kind: "TURN_TERMINAL"; sequence: number; turnId: string }
  | { kind: "STATUS"; sequence: number; status: AgentApiStatus }
  | { kind: "RUNTIME_GLOBAL"; sequence: number };

type CommandObservation = {
  unsubscribe: () => void;
  reconcileAcceptedResult: (turnId: string | null) => void;
};

const logger = { warn: (...args: unknown[]) => console.warn(...args) };
const toMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);
const isInFlight = (record: AgentRunCommandRecord): boolean =>
  record.state === "STARTING" || record.state === "FORWARDED";

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
    if (!identity.ok) return this.invalidIdentityAck(input, identity.message);

    const begin = this.registry.begin(identity.value);
    if (begin.kind === "duplicate") return this.duplicateResult(begin.record);
    if (begin.kind === "busy") return this.recordResult(begin.record, "rejected", false, false);

    const record = begin.record;
    const activeRunAtStart = this.agentRunService.getAgentRun(record.runId);
    const startedFromInactiveIdentity = !activeRunAtStart;
    if (startedFromInactiveIdentity) {
      this.publishStatus(record.runId, this.overlayStore.publishInitializing({
        runId: record.runId,
        messageId: record.messageId,
      }));
    }

    let observation: CommandObservation | null = null;
    try {
      const activeRun = activeRunAtStart ?? await this.resolveRuntimeForCommand(record.runId);
      let messageHandoffStarted = false;
      observation = this.observeRuntimeCommand(activeRun, record, () => messageHandoffStarted);
      input.onActiveRunReady?.(activeRun);
      this.registry.markForwarded({ runId: record.runId, messageId: record.messageId });
      messageHandoffStarted = true;

      const result = await activeRun.postUserMessage(this.withCommandMetadata(input.message, record));
      if (!result.accepted) {
        observation.unsubscribe();
        return this.failCommand(
          this.latestRecord(record),
          "RUNTIME_REJECTED",
          result.message ?? "Runtime rejected the command.",
          { publishErrorStatus: startedFromInactiveIdentity },
        );
      }

      observation.reconcileAcceptedResult(result.turnId ?? null);
      await this.agentRunService.recordRunActivity(activeRun, {
        summary: input.summary ?? input.message.content,
      });
      const latest = this.latestRecord(record);
      if (latest.state === "FAILED" || latest.state === "REJECTED") {
        return this.recordResult(latest, "failed", false, false);
      }
      return this.recordResult(latest, "accepted", true, false);
    } catch (error) {
      observation?.unsubscribe();
      const code = this.isMissingRunError(error) ? "RUN_NOT_FOUND" : "ACTIVATION_FAILED";
      return this.failCommand(this.latestRecord(record), code, toMessage(error), {
        publishErrorStatus: startedFromInactiveIdentity,
      });
    }
  }

  private observeRuntimeCommand(
    activeRun: AgentRun,
    originalRecord: AgentRunCommandRecord,
    isMessageHandoffStarted: () => boolean,
  ): CommandObservation {
    let sequence = 0;
    let bufferedEvidence: CommandEvidence[] = [];
    let unsubscribe: () => void = () => {};
    const scheduleUnsubscribe = () => queueMicrotask(() => unsubscribe());

    const settleCompleted = (turnId: string | null, publishReplacement: boolean) => {
      const current = this.currentRecord(originalRecord);
      if (!current) return;
      this.registry.markCompleted({
        runId: current.runId,
        messageId: current.messageId,
        turnId,
      });
      this.clearOverlay(current, activeRun, "idle", publishReplacement);
      bufferedEvidence = [];
      scheduleUnsubscribe();
    };
    const settleFailed = (turnId: string | null) => {
      const current = this.currentRecord(originalRecord);
      if (!current) return;
      this.registry.markFailed({
        runId: current.runId,
        messageId: current.messageId,
        turnId,
        code: "RUNTIME_REJECTED",
        message: "Runtime reported an error while handling the command.",
      });
      this.clearOverlay(current, activeRun, "error", true);
      bufferedEvidence = [];
      scheduleUnsubscribe();
    };

    const applyEvidence = (evidence: CommandEvidence, replaying = false): void => {
      const current = this.currentRecord(originalRecord);
      if (!current) {
        scheduleUnsubscribe();
        return;
      }
      if (evidence.kind === "RUNTIME_GLOBAL") {
        settleFailed(current.turnId ?? null);
        return;
      }

      const association = current.association;
      if (association.kind === "PENDING_IDENTITY") {
        if (!replaying) bufferedEvidence.push(evidence);
        return;
      }
      if (association.kind === "IDENTIFIED") {
        if (
          evidence.kind === "TERMINAL_IDENTIFIED" &&
          evidence.turnId === association.turnId
        ) {
          settleCompleted(association.turnId, true);
        } else if (
          evidence.kind === "TURN_TERMINAL" &&
          evidence.turnId === association.turnId
        ) {
          settleFailed(association.turnId);
        }
        return;
      }
      if (association.kind === "AWAITING_ANONYMOUS_START") {
        if (evidence.kind === "START_IDENTIFIED") {
          this.registry.associateIdentified({
            runId: current.runId,
            messageId: current.messageId,
            turnId: evidence.turnId,
          });
          this.clearOverlay(current, activeRun, "running", true);
        } else if (
          evidence.kind === "START_ANONYMOUS" ||
          (evidence.kind === "STATUS" && evidence.status === "running")
        ) {
          this.registry.armAnonymous({
            runId: current.runId,
            messageId: current.messageId,
            armedAtSequence: evidence.sequence,
          });
          this.clearOverlay(current, activeRun, "running", evidence.kind !== "STATUS");
        }
        return;
      }

      if (evidence.kind === "START_IDENTIFIED") {
        this.registry.associateIdentified({
          runId: current.runId,
          messageId: current.messageId,
          turnId: evidence.turnId,
        });
        return;
      }
      if (evidence.sequence <= association.armedAtSequence) return;
      if (evidence.kind === "TERMINAL_ANONYMOUS") {
        settleCompleted(null, true);
      } else if (evidence.kind === "STATUS" && evidence.status === "idle") {
        settleCompleted(null, false);
      }
    };

    unsubscribe = activeRun.subscribeToEvents((event) => {
      if (!isMessageHandoffStarted() || !isAgentRunEvent(event)) return;
      const evidence = this.resolveCommandEvidence(event, ++sequence);
      if (evidence) applyEvidence(evidence);
    });

    const reconcileAcceptedResult = (turnId: string | null): void => {
      const current = this.currentRecord(originalRecord);
      if (!current) return;

      if (turnId) {
        this.registry.associateIdentified({
          runId: current.runId,
          messageId: current.messageId,
          turnId,
        });
        this.clearOverlay(current, activeRun, "running", true);
      } else {
        const identifiedStart = bufferedEvidence
          .filter((item): item is Extract<CommandEvidence, { kind: "START_IDENTIFIED" }> =>
            item.kind === "START_IDENTIFIED")
          .at(-1);
        const anonymousStart = bufferedEvidence.find((item) =>
          item.kind === "START_ANONYMOUS" ||
          (item.kind === "STATUS" && item.status === "running"));
        if (identifiedStart) {
          this.registry.associateIdentified({
            runId: current.runId,
            messageId: current.messageId,
            turnId: identifiedStart.turnId,
          });
          this.clearOverlay(current, activeRun, "running", true);
        } else if (anonymousStart) {
          this.registry.armAnonymous({
            runId: current.runId,
            messageId: current.messageId,
            armedAtSequence: anonymousStart.sequence,
          });
          this.clearOverlay(current, activeRun, "running", true);
        } else {
          this.registry.awaitAnonymousStart({
            runId: current.runId,
            messageId: current.messageId,
          });
        }
      }

      const replay = bufferedEvidence;
      bufferedEvidence = [];
      for (const evidence of replay) {
        if (!this.currentRecord(originalRecord)) break;
        applyEvidence(evidence, true);
      }
    };

    return { unsubscribe: () => unsubscribe(), reconcileAcceptedResult };
  }

  private resolveCommandEvidence(event: AgentRunEvent, sequence: number): CommandEvidence | null {
    if (event.eventType === AgentRunEventType.ERROR) {
      const evidence = resolveAgentRunErrorEvidence(event);
      if (evidence?.kind === "RUNTIME_GLOBAL") return { kind: "RUNTIME_GLOBAL", sequence };
      return evidence?.kind === "TURN_TERMINAL"
        ? { kind: "TURN_TERMINAL", sequence, turnId: evidence.turnId }
        : null;
    }
    if (event.eventType === AgentRunEventType.AGENT_STATUS) {
      const status = event.payload.status;
      if (
        status !== "offline" && status !== "initializing" && status !== "idle" &&
        status !== "running" && status !== "error"
      ) return null;
      return status === "offline"
        ? { kind: "RUNTIME_GLOBAL", sequence }
        : { kind: "STATUS", sequence, status };
    }
    if (event.eventType === AgentRunEventType.TURN_STARTED) {
      const turnId = resolveAgentRunEventTurnId(event);
      return turnId
        ? { kind: "START_IDENTIFIED", sequence, turnId }
        : { kind: "START_ANONYMOUS", sequence };
    }
    if (
      event.eventType === AgentRunEventType.TURN_COMPLETED ||
      event.eventType === AgentRunEventType.TURN_INTERRUPTED
    ) {
      const turnId = resolveAgentRunEventTurnId(event);
      return turnId
        ? { kind: "TERMINAL_IDENTIFIED", sequence, turnId }
        : { kind: "TERMINAL_ANONYMOUS", sequence };
    }
    return null;
  }

  private currentRecord(original: AgentRunCommandRecord): AgentRunCommandRecord | null {
    const latest = this.registry.getRecord(original.runId, original.messageId);
    const inFlight = this.registry.getInFlightRecord(original.runId);
    return latest && isInFlight(latest) && inFlight?.messageId === original.messageId
      ? latest
      : null;
  }

  private latestRecord(record: AgentRunCommandRecord): AgentRunCommandRecord {
    return this.registry.getRecord(record.runId, record.messageId) ?? record;
  }

  private clearOverlay(
    record: AgentRunCommandRecord,
    activeRun: AgentRun,
    status: AgentApiStatus,
    publishReplacement: boolean,
  ): void {
    const overlay = this.overlayStore.getOverlay(record.runId);
    if (!overlay || overlay.messageId !== record.messageId) return;
    this.overlayStore.clear(record.runId);
    if (publishReplacement) {
      this.publishStatus(record.runId, this.buildReplacementStatusPayload(activeRun, record.runId, status));
    }
  }

  private async resolveRuntimeForCommand(runId: string): Promise<AgentRun> {
    const activeRun = this.agentRunService.getAgentRun(runId);
    if (activeRun) return activeRun;
    const metadata = await this.agentRunService.getRunMetadata(runId);
    if (!metadata) throw new Error(`Run '${runId}' was not found or cannot accept commands.`);
    if (metadata.preparedAt && !metadata.startedAt) {
      return this.agentRunService.activatePreparedRun(runId);
    }
    return (await this.agentRunService.restoreAgentRun(runId)).run;
  }

  private async failCommand(
    record: AgentRunCommandRecord,
    code: AgentRunCommandErrorCode,
    message: string,
    options: { publishErrorStatus: boolean },
  ): Promise<AgentRunCommandCoordinatorResult> {
    this.registry.markFailed({ runId: record.runId, messageId: record.messageId, code, message });
    const latest = this.latestRecord(record);
    let statusPayload: AgentStatusPayload | null = null;
    if (options.publishErrorStatus) {
      statusPayload = this.overlayStore.publishError({
        runId: record.runId,
        messageId: record.messageId,
        errorMessage: message,
      });
      this.publishStatus(record.runId, statusPayload);
    }
    return this.recordResult(latest, "failed", false, false, statusPayload ?? undefined);
  }

  private duplicateResult(record: AgentRunCommandRecord): Promise<AgentRunCommandCoordinatorResult> {
    const state = record.state === "COMPLETED" ? "duplicate_completed"
      : record.state === "FAILED" ? "duplicate_failed"
      : record.state === "REJECTED" ? "duplicate_rejected"
      : "duplicate_in_progress";
    return this.recordResult(
      record,
      state,
      state === "duplicate_in_progress" || state === "duplicate_completed",
      true,
    );
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
    const projection = runId ? await this.projectionService.getRunStatusProjection(runId) : null;
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
    return new AgentInputUserMessage(message.content, message.senderType, message.contextFiles, {
      ...message.metadata,
      message_id: record.messageId,
      dedupe_key: record.dedupeKey,
    });
  }

  private publishStatus(runId: string, payload: AgentStatusPayload): void {
    try {
      this.broadcaster.publishToRun(runId, new ServerMessage(ServerMessageType.AGENT_STATUS, payload));
    } catch (error) {
      logger.warn(`Failed to publish command status for run '${runId}'.`, error);
    }
  }

  private buildReplacementStatusPayload(
    activeRun: AgentRun,
    runId: string,
    status: AgentApiStatus,
  ): AgentStatusPayload {
    const snapshot = activeRun.getStatusSnapshot();
    if (normalizeAgentApiStatus(snapshot.status) === status) return snapshot;
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
    if (!runId) return { ok: false, message: "runId is required." };
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
