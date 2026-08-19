import type {
  AgentRunInputReservation,
  CommittedAgentRunInput,
} from "./agent-run-input-contract.js";

/** One-shot capability over an entry that remains owned by AgentRun admission state. */
export const createAgentRunInputReservation = (input: {
  agentRunId: string;
  entrySequence: number;
  commitEntry(): boolean;
  releaseEntry(): boolean;
  cancelEntry(): boolean;
  eligibilityChanged(): void;
}): AgentRunInputReservation => {
  let state: "reserved" | "committed" | "released" | "cancelled" = "reserved";
  return Object.freeze({
    agentRunId: input.agentRunId,
    commit: (): CommittedAgentRunInput => {
      if (state !== "reserved" || !input.commitEntry()) {
        throw new Error(`AgentRun input reservation '${input.entrySequence}' cannot be committed.`);
      }
      state = "committed";
      return Object.freeze({
        release: () => {
          if (state !== "committed" || !input.releaseEntry()) {
            throw new Error(`Committed AgentRun input '${input.entrySequence}' cannot be released.`);
          }
          state = "released";
          input.eligibilityChanged();
        },
      });
    },
    cancel: () => {
      if (state !== "reserved" || !input.cancelEntry()) {
        throw new Error(`AgentRun input reservation '${input.entrySequence}' cannot be cancelled.`);
      }
      state = "cancelled";
      input.eligibilityChanged();
    },
  });
};
