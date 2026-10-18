import {
  isAgentSegmentJsonValue,
  isAgentSegmentType,
  type AgentSegmentIdentity,
} from "../../../domain/agent-segment.js";
import { resolveAgentRunErrorEvidence } from "../../../domain/agent-run-error-evidence.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../domain/agent-run-event.js";
import { resolveAgentRunEventTurnId } from "../../../domain/agent-run-event-turn-id.js";
import type { AgentRunContext, RuntimeAgentRunContext } from "../../../domain/agent-run-context.js";
import type {
  AgentRunEventTransformer,
  AgentRunEventTransformerInput,
} from "../../agent-run-event-transformer.js";
import type {
  AgentSegmentLifecycleState,
  AgentSegmentRejectionReason,
  AgentSegmentRejectionSummary,
} from "./agent-segment-lifecycle-state.js";
import {
  logAgentSegmentRejection,
  logAgentSegmentRejectionSummaries,
  type AgentSegmentRejectionLogContext,
} from "./agent-segment-rejection-log.js";

const REJECTION_NOTICE_MESSAGE = "Some of the agent's output in this turn could not be shown.";

const START_KEYS = new Set(["id", "turn_id", "segment_type", "metadata"]);
const CONTENT_KEYS = new Set(["id", "turn_id", "delta"]);
const END_KEYS = new Set([
  "id",
  "turn_id",
  "metadata",
  "interrupted",
  "reason",
  "failed",
  "error",
]);

const exactKeys = (payload: Record<string, unknown>, allowed: ReadonlySet<string>): boolean =>
  Object.keys(payload).every((key) => allowed.has(key));

const hasOwn = (payload: Record<string, unknown>, key: string): boolean =>
  Object.prototype.hasOwnProperty.call(payload, key);

const validOptionalMetadata = (payload: Record<string, unknown>): boolean =>
  !hasOwn(payload, "metadata") || isAgentSegmentJsonValue(payload.metadata);

const validOptionalBoolean = (payload: Record<string, unknown>, key: string): boolean =>
  !hasOwn(payload, key) || typeof payload[key] === "boolean";

const validOptionalString = (payload: Record<string, unknown>, key: string): boolean =>
  !hasOwn(payload, key) || typeof payload[key] === "string";

const nonEmpty = (value: unknown): string | null => {
  if (typeof value !== "string") return null;
  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const identity = (payload: Record<string, unknown>): AgentSegmentIdentity | null => {
  const turnId = nonEmpty(payload.turn_id);
  const segmentId = nonEmpty(payload.id);
  return turnId && segmentId ? { turnId, segmentId } : null;
};

/** Read only when a line is written: run identity is not needed on the accepted-event path. */
const logContext = (
  runContext: AgentRunContext<RuntimeAgentRunContext>,
): AgentSegmentRejectionLogContext => ({ runtimeKind: runContext.config.runtimeKind, runId: runContext.runId });

const logSummaries = (
  runContext: AgentRunContext<RuntimeAgentRunContext>,
  summaries: readonly AgentSegmentRejectionSummary[],
): void => {
  if (summaries.length > 0) logAgentSegmentRejectionSummaries(logContext(runContext), summaries);
};

export class AgentSegmentLifecycleEventTransformer implements AgentRunEventTransformer {
  transform(input: AgentRunEventTransformerInput): AgentRunEvent[] {
    const state = input.segmentLifecycleState;
    const turnState = input.lifecycleState;
    if (!state || !turnState) {
      throw new Error(
        "AgentSegmentLifecycleEventTransformer requires run-owned segment and turn lifecycle state.",
      );
    }

    state.reconcileBeforeBatch(input.runtimeLifecycleSnapshot);
    const output: AgentRunEvent[] = [];
    const reject = (event: AgentRunEvent, reason: AgentSegmentRejectionReason): void => {
      output.push(...this.rejection(state, input.runContext, event, reason));
    };
    const releasedSummaries: AgentSegmentRejectionSummary[] = [];
    let reachedBoundary = false;

    for (const event of input.events) {
      if (event.eventType === AgentRunEventType.SEGMENT_START) {
        const parsedIdentity = identity(event.payload);
        const type = event.payload.segment_type;
        if (
          !parsedIdentity ||
          !exactKeys(event.payload, START_KEYS) ||
          !isAgentSegmentType(type) ||
          !validOptionalMetadata(event.payload)
        ) {
          reject(event, "PAYLOAD_INVALID");
          continue;
        }
        const result = state.start(parsedIdentity, type, turnState);
        if (result.kind === "ACCEPTED") {
          output.push({
            ...event,
            payload: {
              id: parsedIdentity.segmentId,
              turn_id: parsedIdentity.turnId,
              segment_type: type,
              ...(hasOwn(event.payload, "metadata")
                ? { metadata: event.payload.metadata }
                : {}),
            },
          });
        }
        else if (result.kind === "REJECTED") reject(event, result.reason);
        continue;
      }

      if (event.eventType === AgentRunEventType.SEGMENT_CONTENT) {
        const parsedIdentity = identity(event.payload);
        if (
          !parsedIdentity ||
          !exactKeys(event.payload, CONTENT_KEYS) ||
          typeof event.payload.delta !== "string"
        ) {
          reject(event, "PAYLOAD_INVALID");
          continue;
        }
        const result = state.content(parsedIdentity);
        if (result.kind === "REJECTED") {
          reject(event, result.reason);
          continue;
        }
        output.push({
          ...event,
          payload: {
            id: parsedIdentity.segmentId,
            turn_id: parsedIdentity.turnId,
            segment_type: result.type,
            delta: event.payload.delta,
          },
        });
        continue;
      }

      if (event.eventType === AgentRunEventType.SEGMENT_END) {
        const parsedIdentity = identity(event.payload);
        if (
          !parsedIdentity ||
          !exactKeys(event.payload, END_KEYS) ||
          !validOptionalMetadata(event.payload) ||
          !validOptionalBoolean(event.payload, "interrupted") ||
          !validOptionalString(event.payload, "reason") ||
          !validOptionalBoolean(event.payload, "failed") ||
          !validOptionalString(event.payload, "error")
        ) {
          reject(event, "PAYLOAD_INVALID");
          continue;
        }
        const result = state.end(parsedIdentity);
        if (result.kind === "ACCEPTED") {
          output.push({
            ...event,
            payload: {
              id: parsedIdentity.segmentId,
              turn_id: parsedIdentity.turnId,
              ...(hasOwn(event.payload, "metadata")
                ? { metadata: event.payload.metadata }
                : {}),
              ...(hasOwn(event.payload, "interrupted")
                ? { interrupted: event.payload.interrupted }
                : {}),
              ...(hasOwn(event.payload, "reason")
                ? { reason: event.payload.reason }
                : {}),
              ...(hasOwn(event.payload, "failed")
                ? { failed: event.payload.failed }
                : {}),
              ...(hasOwn(event.payload, "error")
                ? { error: event.payload.error }
                : {}),
            },
          });
        }
        else if (result.kind === "REJECTED") reject(event, result.reason);
        continue;
      }

      if (event.eventType === AgentRunEventType.TURN_STARTED) {
        state.observeTurnStarted(resolveAgentRunEventTurnId(event));
      } else if (
        event.eventType === AgentRunEventType.TURN_COMPLETED ||
        event.eventType === AgentRunEventType.TURN_INTERRUPTED
      ) {
        output.push(event);
        state.observeTurnTerminal(resolveAgentRunEventTurnId(event));
        reachedBoundary = true;
        continue;
      } else if (event.eventType === AgentRunEventType.ERROR) {
        output.push(event);
        const evidence = resolveAgentRunErrorEvidence(event);
        if (evidence?.kind === "TURN_TERMINAL") {
          state.observeTurnTerminal(evidence.turnId);
          reachedBoundary = true;
        } else if (evidence?.kind === "RUNTIME_GLOBAL") {
          releasedSummaries.push(...state.observeRuntimeTerminal());
          reachedBoundary = true;
        }
        continue;
      } else if (
        event.eventType === AgentRunEventType.AGENT_STATUS &&
        (event.payload.status === "offline" || event.payload.status === "error")
      ) {
        output.push(event);
        releasedSummaries.push(...state.observeRuntimeTerminal());
        reachedBoundary = true;
        continue;
      }

      output.push(event);
    }

    releasedSummaries.push(...state.reconcileAfterBatch(input.runtimeLifecycleSnapshot));
    logSummaries(input.runContext, releasedSummaries);
    // A turn ending or a release is a lifecycle boundary: report counts pending since then too.
    if (reachedBoundary) logSummaries(input.runContext, state.takeRejectionSummaries());
    return output;
  }

  /**
   * A rejected segment event is never displayed. Its turn's first rejection is logged in detail
   * and later ones are counted; the run's current turn gets one plain-language notice.
   */
  private rejection(
    state: AgentSegmentLifecycleState,
    runContext: AgentRunContext<RuntimeAgentRunContext>,
    event: AgentRunEvent,
    reason: AgentSegmentRejectionReason,
  ): AgentRunEvent[] {
    const turnId = nonEmpty(event.payload.turn_id);
    const decision = state.recordRejection(turnId);
    if (decision.warn) {
      logAgentSegmentRejection({
        ...logContext(runContext),
        turnId,
        eventType: event.eventType,
        segmentId: nonEmpty(event.payload.id),
        reason,
      });
    }
    if (!decision.showNotice || !turnId) return [];
    return [{
      eventType: AgentRunEventType.ERROR,
      runId: event.runId,
      payload: {
        code: "AGENT_SEGMENT_LIFECYCLE_INVALID",
        message: REJECTION_NOTICE_MESSAGE,
        error_scope: "turn",
        error_effect: "diagnostic",
        turn_id: turnId,
      },
      statusHint: null,
    }];
  }
}
