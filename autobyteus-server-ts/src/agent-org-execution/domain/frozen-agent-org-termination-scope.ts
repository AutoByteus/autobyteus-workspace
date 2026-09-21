import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { ConfiguredAgentExecutionHandle } from "../../agent-collaboration/execution/backends/configured-agent-execution-handle.js";
import type { FrozenTeamRunTerminationScope } from "../../agent-team-execution/domain/frozen-team-run-termination-scope.js";

export type FrozenAgentOrgTerminationScope = Readonly<{
  fenceAgentRunsForRootShutdown(): Promise<AgentOperationResult>;
  finish(): Promise<AgentOperationResult>;
}>;

export const createFrozenAgentOrgTerminationScope = (input: Readonly<{
  agentHandles: readonly ConfiguredAgentExecutionHandle[];
  teamScopes: readonly FrozenTeamRunTerminationScope[];
}>): FrozenAgentOrgTerminationScope => {
  let fencing: Promise<AgentOperationResult> | null = null;
  let finishing: Promise<AgentOperationResult> | null = null;
  return Object.freeze({
    fenceAgentRunsForRootShutdown: () => {
      if (fencing) return fencing;
      fencing = Promise.all([
        ...input.agentHandles.map((handle) => handle.fenceForRootShutdown()),
        ...input.teamScopes.map((scope) => scope.fenceAgentRunsForRootShutdown()),
      ]).then((results) => results.find((result) => !result.accepted) ?? { accepted: true });
      return fencing;
    },
    finish: () => {
      if (finishing) return finishing;
      finishing = (async () => {
        for (const scope of input.teamScopes) {
          const result = await scope.finish();
          if (!result.accepted) return result;
        }
        for (const handle of [...input.agentHandles].reverse()) {
          const result = await handle.terminate();
          if (!result.accepted) return result;
        }
        return { accepted: true };
      })();
      return finishing;
    },
  });
};
