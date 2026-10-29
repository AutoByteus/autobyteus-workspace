import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * A standalone run can host delegated copies unless it is application-owned or system-owned (autobyteus-32 AR-001: the
 * Model Router agent's run gets no member context, so no automatic collaboration tools).
 */
export const isCollaborationEligibleStandaloneRun = (metadata: AgentRunMetadata): boolean =>
  !metadata.applicationExecutionContext && !metadata.systemRunOwner;
