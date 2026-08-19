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
import type {
  AgentRunEventTransformer,
  AgentRunEventTransformerInput,
} from "../../agent-run-event-transformer.js";

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
          output.push(...this.diagnostic(event));
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
        else if (result.kind === "REJECTED") output.push(...this.diagnostic(event));
        continue;
      }

      if (event.eventType === AgentRunEventType.SEGMENT_CONTENT) {
        const parsedIdentity = identity(event.payload);
        if (
          !parsedIdentity ||
          !exactKeys(event.payload, CONTENT_KEYS) ||
          typeof event.payload.delta !== "string"
        ) {
          output.push(...this.diagnostic(event));
          continue;
        }
        const result = state.content(parsedIdentity);
        if (result.kind !== "ACCEPTED") {
          output.push(...this.diagnostic(event));
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
          output.push(...this.diagnostic(event));
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
        else if (result.kind === "REJECTED") output.push(...this.diagnostic(event));
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
        continue;
      } else if (event.eventType === AgentRunEventType.ERROR) {
        output.push(event);
        const evidence = resolveAgentRunErrorEvidence(event);
        if (evidence?.kind === "TURN_TERMINAL") {
          state.observeTurnTerminal(evidence.turnId);
        } else if (evidence?.kind === "RUNTIME_GLOBAL") {
          state.observeRuntimeTerminal();
        }
        continue;
      } else if (
        event.eventType === AgentRunEventType.AGENT_STATUS &&
        (event.payload.status === "offline" || event.payload.status === "error")
      ) {
        output.push(event);
        state.observeRuntimeTerminal();
        continue;
      }

      output.push(event);
    }

    state.reconcileAfterBatch(input.runtimeLifecycleSnapshot);
    return output;
  }

  private diagnostic(event: AgentRunEvent): AgentRunEvent[] {
    const turnId = nonEmpty(event.payload.turn_id);
    if (!turnId) return [];
    return [{
      eventType: AgentRunEventType.ERROR,
      runId: event.runId,
      payload: {
        code: "AGENT_SEGMENT_LIFECYCLE_INVALID",
        message: "A runtime segment event violated the canonical lifecycle contract.",
        error_scope: "turn",
        error_effect: "diagnostic",
        turn_id: turnId,
      },
      statusHint: null,
    }];
  }
}
