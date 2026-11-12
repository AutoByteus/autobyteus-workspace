import type { RunAgent, RunPartsReader } from "../../src/agent-collaboration/delegation/delegation-tree.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** A test reader of each run's agents (no coordinator, no mounted team); `null`: the run's own file is absent. */
export const readerOfAgents = (agentsOf: (run: RootExecutionIdentity) => Promise<readonly RunAgent[] | null>): RunPartsReader => ({
  partsOf: async (run) => {
    const agents = await agentsOf(run);
    return agents ? { agents, coordinatorAddress: null, mountedTeams: [] } : null;
  },
});

/** A test reader from each run's agent run IDs (no stored addresses, no definitions). */
export const readerOfAgentRunIds = (agentRunIdsOf: (run: RootExecutionIdentity) => Promise<readonly string[] | null>): RunPartsReader =>
  readerOfAgents(async (run) => (await agentRunIdsOf(run))?.map((agentRunId) => ({ agentRunId, address: null, agentDefinitionId: null })) ?? null);

/** A test reader for tests that read no run's own file: every run's file is absent. */
export const NO_RUN_PARTS: RunPartsReader = Object.freeze({ partsOf: async () => null });
