import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { AgentStatusPayload } from "../domain/agent-status-payload.js";
import type { AgentRunInputLifecycle } from "../input/agent-run-input-contract.js";
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
import type { AgentRun } from "../domain/agent-run.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import {
  getProcessStandaloneRunCommandPort,
  type StandaloneRunCommandPort,
  type StandaloneRunPostResult,
} from "./standalone-run-ports.js";
import type {
  SendMessageCommandAckPayload,
  AgentRunCommandCoordinatorInput,
  AgentRunCommandCoordinatorResult,
  AgentRunCommandErrorCode,
  AgentRunCommandRecord,
} from "./agent-run-command-types.js";

type ValidatedCommandIdentity = { runId: string; messageId: string; dedupeKey: string };
const logger = { warn: (...args: unknown[]) => console.warn(...args) };
const toMessage = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : String(error);

export class AgentRunCommandCoordinator {
  constructor(private readonly deps: {
    agentRunService?: AgentRunService;
    registry?: AgentRunCommandRegistry;
    overlayStore?: AgentRunCommandStatusOverlayStore;
    projectionService?: AgentRunStatusProjectionService;
    broadcaster?: AgentStreamBroadcaster;
    /** The owner of eligible standalone runs; defaults to the process port. */
    standaloneRuns?: StandaloneRunCommandPort | null;
  } = {}) {}

  async postUserMessage(
    input: AgentRunCommandCoordinatorInput,
  ): Promise<AgentRunCommandCoordinatorResult> {
    const identity = this.validateIdentity(input);
    if (!identity.ok) return this.invalidIdentityAck(input, identity.message);

    const begin = this.registry.begin(identity.value);
    if (begin.kind === "duplicate") return this.duplicateResult(begin.record);

    const record = begin.record;
    const activeRunAtStart = this.agentRunService.getAgentRun(record.runId);
    const requiresActivation = !activeRunAtStart;
    if (requiresActivation) {
      this.publishStatus(record.runId, this.overlayStore.publishInitializing({
        runId: record.runId,
        messageId: record.messageId,
      }));
    }

    try {
      const outcome = await this.post(record, input);
      if (outcome.kind === "admission_failed") {
        return this.failCommand(this.latestRecord(record), "COLLABORATOR_ADMISSION_FAILED", outcome.message, { publishErrorStatus: false });
      }
      if (outcome.kind === "admission_rejected") {
        // Nothing was added or posted; the client keeps the draft and shows the notice.
        const { admission } = outcome;
        this.registry.markRejected({
          runId: record.runId,
          messageId: record.messageId,
          code: admission.code === "COLLABORATOR_ADD_FAILED" ? "COLLABORATOR_ADD_FAILED" : "COLLABORATOR_MENTION_UNAVAILABLE",
          message: admission.message,
          ...("collaboratorName" in admission ? { collaboratorName: admission.collaboratorName } : {}),
        });
        return this.recordResult(this.latestRecord(record), "rejected", false, false);
      }
      if (!outcome.post.accepted) {
        this.registry.markRejected({
          runId: record.runId,
          messageId: record.messageId,
          code: "RUNTIME_REJECTED",
          message: outcome.post.message ?? "Runtime rejected the command.",
        });
        return this.recordResult(this.latestRecord(record), "rejected", false, false);
      }

      void this.agentRunService.recordRunActivity(outcome.run, {
        summary: input.summary ?? input.message.content,
      }).catch((error) => {
        logger.warn(`Failed to record activity for run '${record.runId}': ${String(error)}`);
      });
      return this.recordResult(this.latestRecord(record), "accepted", true, false);
    } catch (error) {
      const code = this.isMissingRunError(error) ? "RUN_NOT_FOUND" : "ACTIVATION_FAILED";
      return this.failCommand(this.latestRecord(record), code, toMessage(error), {
        publishErrorStatus: requiresActivation && !this.agentRunService.getAgentRun(record.runId),
      });
    }
  }

  /**
   * An eligible standalone run is activated, admits its mentions and posts inside its root's
   * gate; any other run posts directly to its command-ready AgentRun (it hosts no collaborators).
   */
  private async post(record: AgentRunCommandRecord, input: AgentRunCommandCoordinatorInput): Promise<StandaloneRunPostResult> {
    const message = this.withCommandMetadata(input.message, record);
    const postOptions = { lifecycleObserver: (fact: AgentRunInputLifecycle) => this.applyInputLifecycle(record, fact) };
    const onActiveRunReady = (run: AgentRun) => {
      this.clearOverlayForCommand(record);
      input.onActiveRunReady?.(run);
    };
    const owned = await this.standaloneRuns?.postUserMessage({
      runId: record.runId, message, mentions: input.mentions, postOptions, onActiveRunReady,
    }) ?? null;
    if (owned) return owned;
    const run = await this.agentRunService.resolveCommandReadyAgentRun(record.runId);
    onActiveRunReady(run);
    if (input.mentions?.length) {
      return { kind: "admission_rejected", run, admission: {
        admitted: false, code: "COLLABORATOR_MENTION_UNAVAILABLE", message: "This run cannot bring in collaborators.",
      } };
    }
    const post: AgentOperationResult = await run.postUserMessage(message, postOptions);
    return { kind: "posted", run, post };
  }

  private applyInputLifecycle(
    originalRecord: AgentRunCommandRecord,
    fact: AgentRunInputLifecycle,
  ): void {
    const identity = { runId: originalRecord.runId, messageId: originalRecord.messageId };
    switch (fact.kind) {
      case "admitted":
        this.registry.markAdmitted(identity);
        return;
      case "held":
        this.registry.markHeld({ ...identity, turnId: fact.turnId });
        return;
      case "resumed":
      case "forwarded":
        this.registry.markForwarded({ ...identity, turnId: fact.turnId });
        return;
      case "turn_associated":
        this.registry.associateIdentified({ ...identity, turnId: fact.turnId });
        return;
      case "completed":
        this.registry.markCompleted({ ...identity, turnId: fact.turnId });
        return;
      case "interrupted":
        this.registry.markFailed({
          ...identity,
          turnId: fact.turnId,
          code: "RUNTIME_REJECTED",
          message: "Runtime input was interrupted.",
        });
        return;
      case "failed":
        this.registry.markFailed({
          ...identity,
          turnId: fact.turnId,
          code: "RUNTIME_REJECTED",
          message: fact.message,
        });
        return;
      case "cancelled":
        this.registry.markCancelled(identity);
        return;
    }
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
      : record.state === "CANCELLED" ? "duplicate_cancelled"
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
    state: SendMessageCommandAckPayload["state"],
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
        ...(record.collaboratorName ? { collaborator_name: record.collaboratorName } : {}),
        status: statusPayloadOverride ?? projection!.statusPayload,
      },
      turnId: record.turnId,
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

  private clearOverlayForCommand(record: AgentRunCommandRecord): void {
    const overlay = this.overlayStore.getOverlay(record.runId);
    if (overlay?.messageId === record.messageId) this.overlayStore.clear(record.runId);
  }

  private latestRecord(record: AgentRunCommandRecord): AgentRunCommandRecord {
    return this.registry.getRecord(record.runId, record.messageId) ?? record;
  }

  private publishStatus(runId: string, payload: AgentStatusPayload): void {
    try {
      this.broadcaster.publishToRun(runId, new ServerMessage(ServerMessageType.AGENT_STATUS, payload));
    } catch (error) {
      logger.warn(`Failed to publish command status for run '${runId}'.`, error);
    }
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

  private get standaloneRuns(): StandaloneRunCommandPort | null {
    return this.deps.standaloneRuns === undefined ? getProcessStandaloneRunCommandPort() : this.deps.standaloneRuns;
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
  cachedAgentRunCommandCoordinator ??= new AgentRunCommandCoordinator();
  return cachedAgentRunCommandCoordinator;
};
