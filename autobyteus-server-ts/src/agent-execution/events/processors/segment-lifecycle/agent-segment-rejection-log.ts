/**
 * Server-log formats for canonical segment lifecycle rejections. The run's segment lifecycle
 * state decides when a line is due (first rejection per turn account, pending counts at a run
 * lifecycle boundary); this module only writes the lines.
 */
import type {
  AgentSegmentRejectionReason,
  AgentSegmentRejectionSummary,
} from "./agent-segment-lifecycle-state.js";

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export type AgentSegmentRejectionLogContext = Readonly<{ runtimeKind: string; runId: string }>;

export const logAgentSegmentRejection = (
  input: AgentSegmentRejectionLogContext & Readonly<{
    turnId: string | null;
    eventType: string;
    segmentId: string | null;
    reason: AgentSegmentRejectionReason;
  }>,
): void => {
  logger.warn("[AgentSegmentLifecycleRejected]", {
    runtimeKind: input.runtimeKind,
    runId: input.runId,
    turnId: input.turnId,
    eventType: input.eventType,
    segmentId: input.segmentId,
    reason: input.reason,
  });
};

export const logAgentSegmentRejectionSummaries = (
  context: AgentSegmentRejectionLogContext,
  summaries: readonly AgentSegmentRejectionSummary[],
): void => {
  for (const summary of summaries) {
    logger.warn("[AgentSegmentLifecycleRejectedSummary]", {
      runtimeKind: context.runtimeKind,
      runId: context.runId,
      turnId: summary.turnId,
      count: summary.count,
    });
  }
};
