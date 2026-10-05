import type { AgentOperationResult } from "../../../agent-execution/domain/agent-operation-result.js";
import type { ConfiguredAgentExecutionHandle } from "./configured-agent-execution-handle.js";
import type { FrozenTeamRunTerminationScope } from "../../../agent-team-execution/domain/frozen-team-run-termination-scope.js";

/** Frozen root-hosted executions (Agents and Teams) of an AgentOrg or Agent root, fenced then finished. */
export type FrozenRootTerminationScope = Readonly<{
  fenceAgentRunsForRootShutdown(): Promise<AgentOperationResult>;
  finish(): Promise<AgentOperationResult>;
}>;

export const createFrozenRootTerminationScope = (input: Readonly<{
  agentHandles: readonly Pick<ConfiguredAgentExecutionHandle, "fenceForRootShutdown" | "terminate">[];
  teamScopes: readonly FrozenTeamRunTerminationScope[];
  onReleased?(): void;
}>): FrozenRootTerminationScope => {
  let fencing: Promise<AgentOperationResult> | null = null;
  let finishing: Promise<AgentOperationResult> | null = null;
  return Object.freeze({
    fenceAgentRunsForRootShutdown: () => {
      if (fencing) return fencing;
      const attempt = Promise.all([
        ...input.agentHandles.map((handle) => handle.fenceForRootShutdown()),
        ...input.teamScopes.map((scope) => scope.fenceAgentRunsForRootShutdown()),
      ]).then((results) => results.find((result) => !result.accepted) ?? { accepted: true });
      fencing = attempt;
      void attempt.then((result) => {
        if (!result.accepted && fencing === attempt) fencing = null;
      }, () => {
        if (fencing === attempt) fencing = null;
      });
      return attempt;
    },
    finish: () => {
      if (finishing) return finishing;
      const attempt = (async (): Promise<AgentOperationResult> => {
        for (const scope of input.teamScopes) {
          const result = await scope.finish();
          if (!result.accepted) return result;
        }
        for (const handle of [...input.agentHandles].reverse()) {
          const result = await handle.terminate();
          if (!result.accepted) return result;
        }
        input.onReleased?.();
        return { accepted: true };
      })();
      finishing = attempt;
      void attempt.then((result) => {
        if (!result.accepted && finishing === attempt) finishing = null;
      }, () => {
        if (finishing === attempt) finishing = null;
      });
      return attempt;
    },
  });
};
