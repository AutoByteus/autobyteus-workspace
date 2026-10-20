import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/** A standalone run can host delegated copies unless it is application-owned. */
export const isCollaborationEligibleStandaloneRun = (metadata: AgentRunMetadata): boolean =>
  !metadata.applicationExecutionContext;
