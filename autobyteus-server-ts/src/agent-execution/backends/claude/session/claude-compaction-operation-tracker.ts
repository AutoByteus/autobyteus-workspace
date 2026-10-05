import { asObject, asString, logger, type ClaudeSessionEvent } from "../claude-runtime-shared.js";
import { ClaudeSessionEventName } from "../events/claude-session-event-name.js";
import type { ClaudeTurnSettlement } from "./claude-turn-tracker.js";

export type ClaudeCompactionFrameContext = Readonly<{ turnId: string; sessionId: string }>;

export type ClaudeCompactionCloseReason =
  | "turn_ended_before_boundary"
  | "interrupted"
  | "process_exited";

/** Why a still-open compaction operation is closed when its canonical turn settles. */
export const resolveClaudeCompactionCloseReason = (
  settlement: ClaudeTurnSettlement,
): ClaudeCompactionCloseReason => {
  if (settlement.kind === "interrupted") return "interrupted";
  if (settlement.kind === "error" && settlement.failure.code === "CLAUDE_PROCESS_EXITED") return "process_exited";
  return "turn_ended_before_boundary";
};

type OpenCompactionOperation = {
  operationId: string;
  suppressedStatusCount: number;
};

const asFiniteNumber = (value: unknown): number | null =>
  typeof value === "number" && Number.isFinite(value) ? value : null;

const CLOSE_REASON_MESSAGES: Record<ClaudeCompactionCloseReason, string> = {
  turn_ended_before_boundary: "Claude compaction ended without a compact boundary.",
  interrupted: "Claude compaction was interrupted before a compact boundary.",
  process_exited: "Claude process exited before the compaction completed.",
};

/**
 * Owns one Claude session's compaction operations. It recognizes the real SDK frames
 * (`system/status` and `system/compact_boundary`), collapses the ~30 s "compacting"
 * keepalives into one operation and gives every event of an operation the same id.
 */
export class ClaudeCompactionOperationTracker {
  private open: OpenCompactionOperation | null = null;

  observeFrame(frame: Record<string, unknown>, ctx: ClaudeCompactionFrameContext): ClaudeSessionEvent[] {
    if (frame.type !== "system") {
      return [];
    }
    if (frame.subtype === "compact_boundary") {
      return [this.completeOperation(frame, ctx)];
    }
    if (frame.subtype !== "status") {
      return [];
    }
    if (frame.status === "compacting") {
      return this.observeCompacting(frame, ctx);
    }
    if (frame.status === null && frame.compact_result === "failed") {
      return [this.failOperation(frame, ctx)];
    }
    return [];
  }

  /** Closes an operation still open when its turn settles; emits nothing when none is open. */
  closeOpenOperation(
    ctx: ClaudeCompactionFrameContext & { reason: ClaudeCompactionCloseReason },
  ): ClaudeSessionEvent[] {
    const operation = this.takeOpenOperation();
    if (!operation) {
      return [];
    }
    return [this.buildFailedEvent(operation.operationId, ctx, CLOSE_REASON_MESSAGES[ctx.reason], ctx.reason)];
  }

  private observeCompacting(frame: Record<string, unknown>, ctx: ClaudeCompactionFrameContext): ClaudeSessionEvent[] {
    if (this.open) {
      this.open.suppressedStatusCount += 1;
      return [];
    }
    const frameUuid = asString(frame.uuid);
    if (!frameUuid) {
      logger.warn("Claude compacting status frame has no uuid; compaction operation not tracked.");
      return [];
    }
    this.open = { operationId: frameUuid, suppressedStatusCount: 0 };
    return [{
      method: ClaudeSessionEventName.STATUS_COMPACTING,
      params: { sessionId: ctx.sessionId, turnId: ctx.turnId, operationId: frameUuid, frameUuid },
    }];
  }

  private completeOperation(frame: Record<string, unknown>, ctx: ClaudeCompactionFrameContext): ClaudeSessionEvent {
    const frameUuid = asString(frame.uuid);
    const operationId = this.takeOpenOperation()?.operationId ?? frameUuid;
    const metadata = asObject(frame.compact_metadata);
    return {
      method: ClaudeSessionEventName.COMPACT_BOUNDARY,
      params: {
        sessionId: ctx.sessionId,
        turnId: ctx.turnId,
        operationId,
        frameUuid,
        trigger: asString(metadata?.trigger),
        pre_tokens: asFiniteNumber(metadata?.pre_tokens),
        post_tokens: asFiniteNumber(metadata?.post_tokens),
        duration_ms: asFiniteNumber(metadata?.duration_ms),
        result: "success",
      },
    };
  }

  private failOperation(frame: Record<string, unknown>, ctx: ClaudeCompactionFrameContext): ClaudeSessionEvent {
    const operationId = this.takeOpenOperation()?.operationId ?? asString(frame.uuid);
    const errorMessage = asString(frame.compact_error) ?? "Claude compaction failed.";
    return this.buildFailedEvent(operationId, ctx, errorMessage, "compact_result_failed");
  }

  private buildFailedEvent(
    operationId: string | null,
    ctx: ClaudeCompactionFrameContext,
    errorMessage: string,
    reason: ClaudeCompactionCloseReason | "compact_result_failed",
  ): ClaudeSessionEvent {
    return {
      method: ClaudeSessionEventName.COMPACTION_FAILED,
      params: {
        sessionId: ctx.sessionId,
        turnId: ctx.turnId,
        operationId,
        error_message: errorMessage,
        reason,
      },
    };
  }

  private takeOpenOperation(): OpenCompactionOperation | null {
    const operation = this.open;
    this.open = null;
    if (operation && operation.suppressedStatusCount > 0) {
      logger.info(
        `Claude compaction ${operation.operationId} suppressed ${operation.suppressedStatusCount} repeated compacting status frame(s).`,
      );
    }
    return operation;
  }
}
