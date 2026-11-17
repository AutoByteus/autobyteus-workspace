import { isPeerStarted, type AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * A standalone run is collaboration-eligible (it can delegate) unless it is application-owned or system-owned (autobyteus-32 AR-001: the
 * Model Router agent's run gets no member context, so no automatic collaboration tools).
 */
export const isCollaborationEligibleStandaloneRun = (metadata: AgentRunMetadata): boolean =>
  !metadata.applicationExecutionContext && !metadata.systemRunOwner;

/**
 * A stopped standalone Agent run can switch its agent runtime (autobyteus-316) when it was started, is not application-owned,
 * system-owned or started by a peer (AR-016: a local delegated run is an ordinary run and switches like any, REQ-006).
 * The one rule; the server decides, the web uses only the coarse run kind.
 */
export const canSwitchRuntime = (metadata: AgentRunMetadata): boolean =>
  isCollaborationEligibleStandaloneRun(metadata) && !isPeerStarted(metadata) && Boolean(metadata.startedAt);
