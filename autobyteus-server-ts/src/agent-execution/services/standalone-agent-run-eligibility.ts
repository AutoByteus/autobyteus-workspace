import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";

/**
 * A standalone run can host delegated copies unless it is application-owned or system-owned (autobyteus-32 AR-001: the
 * Model Router agent's run gets no member context, so no automatic collaboration tools).
 */
export const isCollaborationEligibleStandaloneRun = (metadata: AgentRunMetadata): boolean =>
  !metadata.applicationExecutionContext && !metadata.systemRunOwner;

/**
 * A stopped standalone Agent run can switch its agent runtime (autobyteus-316) when it was started, is not application-owned,
 * system-owned or a delegated copy. Team members, Org members and delegated copies keep their runtime (a later delivery).
 * The one rule; the server decides, the web uses only the coarse run kind.
 */
export const canSwitchRuntime = (metadata: AgentRunMetadata): boolean =>
  isCollaborationEligibleStandaloneRun(metadata) && !metadata.delegatedFrom && Boolean(metadata.startedAt);
