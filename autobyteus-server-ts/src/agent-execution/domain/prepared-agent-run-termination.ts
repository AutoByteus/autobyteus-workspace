import type { AgentOperationResult } from "./agent-operation-result.js";

export type CommittedAgentRunTermination = Readonly<{
  finish(): Promise<AgentOperationResult>;
}>;

/**
 * Reversible AgentRun quiescence. Preparation closes new input and drains every
 * earlier FIFO entry without terminating the provider runtime.
 */
export type PreparedAgentRunTermination = Readonly<{
  cancel(): void;
  commit(): CommittedAgentRunTermination;
}>;

/** One-shot reversible capability; AgentRun owns all quiescence and teardown work. */
export const createPreparedAgentRunTermination = (input: {
  runId: string;
  cancelPrepared(): void;
  finishCommitted(): Promise<AgentOperationResult>;
}): PreparedAgentRunTermination => {
  let state: "prepared" | "cancelled" | "committed" = "prepared";
  let committed: CommittedAgentRunTermination | null = null;
  return Object.freeze({
    cancel: () => {
      if (state !== "prepared") return;
      state = "cancelled";
      input.cancelPrepared();
    },
    commit: () => {
      if (state === "cancelled") {
        throw new Error(`AgentRun '${input.runId}' termination preparation was cancelled.`);
      }
      if (committed) return committed;
      state = "committed";
      committed = Object.freeze({ finish: input.finishCommitted });
      return committed;
    },
  });
};
