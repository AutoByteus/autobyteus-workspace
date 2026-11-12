import type { RunAgentsReader } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** A test reader from each run's agent run IDs (no stored addresses): `agentsOf` with `address: null`. */
export const readerOfAgentRunIds = (agentRunIdsOf: (run: RootExecutionIdentity) => Promise<readonly string[] | null>): RunAgentsReader => ({
  agentsOf: async (run) => (await agentRunIdsOf(run))?.map((agentRunId) => ({ agentRunId, address: null, agentDefinitionId: null })) ?? null,
});
