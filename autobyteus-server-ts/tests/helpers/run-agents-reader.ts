import type { RunAgent } from "../../src/agent-collaboration/delegation/run-parts.js";
import type { RunFilesReader } from "../../src/agent-collaboration/delegation/collaboration-tree.js";
import type { RootExecutionIdentity } from "../../src/agent-collaboration/execution/domain/root-execution-identity.js";

/** A test reader of each run's agents (no coordinator, no mounted team); `null`: the run's own file is absent. */
export const readerOfAgents = (agentsOf: (run: RootExecutionIdentity) => Promise<readonly RunAgent[] | null>, files: Partial<Pick<RunFilesReader, "orgPlacementsOf" | "configuredPlacementOf">> = {}): RunFilesReader => ({
  orgPlacementsOf: files.orgPlacementsOf ?? (async () => null),
  configuredPlacementOf: files.configuredPlacementOf ?? (async () => null),
  isStored: async () => true,
  partsOf: async (run) => {
    const agents = await agentsOf(run);
    return agents ? { agents, formerAgents: [], coordinatorAddress: null, mountedTeams: [] } : null;
  },
});

/** A test reader from each run's agent run IDs (no stored addresses, no definitions). */
export const readerOfAgentRunIds = (agentRunIdsOf: (run: RootExecutionIdentity) => Promise<readonly string[] | null>): RunFilesReader =>
  readerOfAgents(async (run) => (await agentRunIdsOf(run))?.map((agentRunId) => ({ agentRunId, address: null, agentDefinitionId: null })) ?? null);

/** A test reader for tests that read no run's own file: every run's file is absent. */
export const NO_RUN_PARTS: RunFilesReader = Object.freeze({ partsOf: async () => null, orgPlacementsOf: async () => null, configuredPlacementOf: async () => null, isStored: async () => true });
