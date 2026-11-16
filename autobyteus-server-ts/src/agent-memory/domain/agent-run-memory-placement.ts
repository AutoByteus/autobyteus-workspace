import type { RootExecutionPhysicalScope } from "../../agent-collaboration/execution/domain/root-execution-identity.js";

/**
 * Where one agent's memory directory is (memory-layout contract L1): a part of its run (a standalone run's agent is the
 * run itself, a team run's member, an organization's agent or mounted-team member), inside that run's folder by physical
 * scope. A delegated run is its own run (autobyteus-461), so it has no other placement. Resolved through
 * `AgentMemoryLayout.getAgentRunMemoryDirPath`.
 */
export type AgentRunMemoryPlacement = Readonly<{ kind: "run_part"; scope: RootExecutionPhysicalScope }>;

export const runPartPlacement = (scope: RootExecutionPhysicalScope): AgentRunMemoryPlacement =>
  Object.freeze({ kind: "run_part", scope });
