import type { AgentRun } from "../domain/agent-run.js";
import type { AgentOperationResult } from "../domain/agent-operation-result.js";
import type {
  CommittedAgentRunTermination,
  PreparedAgentRunTermination,
} from "../domain/prepared-agent-run-termination.js";
import { AgentTerminationError } from "../errors.js";

/** Adds published-run removal semantics around one AgentRun-owned preparation. */
export const createManagedAgentRunTermination = (input: Readonly<{
  expectedRun: AgentRun;
  runPreparation: PreparedAgentRunTermination;
  clearPreparation(): void;
  finishPublished(
    expectedRun: AgentRun,
    runTermination: CommittedAgentRunTermination,
  ): Promise<AgentOperationResult>;
}>): PreparedAgentRunTermination => {
  const runId = input.expectedRun.runId;
  let state: "prepared" | "cancelled" | "committed" = "prepared";
  let committed: CommittedAgentRunTermination | null = null;
  return Object.freeze({
    cancel: () => {
      if (state !== "prepared") return;
      state = "cancelled";
      input.runPreparation.cancel();
      input.clearPreparation();
    },
    commit: () => {
      if (state === "cancelled") {
        throw new AgentTerminationError(
          `Agent run '${runId}' termination preparation was cancelled.`,
        );
      }
      if (committed) return committed;
      state = "committed";
      let runTermination: CommittedAgentRunTermination | null = input.runPreparation.commit();
      let currentAttempt: Promise<AgentOperationResult> | null = null;
      let terminalAttempt: Promise<AgentOperationResult> | null = null;
      committed = Object.freeze({
        finish: () => {
          if (terminalAttempt) return terminalAttempt;
          if (currentAttempt) return currentAttempt;
          const attempt = input.finishPublished(input.expectedRun, runTermination!);
          currentAttempt = attempt;
          void attempt.then((result) => {
            if (result.accepted) { terminalAttempt = attempt; runTermination = null; input = null as never; }
            else if (currentAttempt === attempt) currentAttempt = null;
          }, () => { if (currentAttempt === attempt) currentAttempt = null; });
          return attempt;
        },
      });
      return committed;
    },
  });
};
