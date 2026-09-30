import type { MemberExecutionContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import type { AgentRunMetadata } from "../../run-history/store/agent-run-metadata-types.js";
import type { AgentRun } from "../domain/agent-run.js";

/** A standalone run can host collaborators unless it is a server helper or application-owned. */
export const isCollaborationEligibleStandaloneRun = (metadata: AgentRunMetadata): boolean =>
  metadata.launchPurpose !== "server_helper" && !metadata.applicationExecutionContext;

/**
 * The standalone lifecycle's port to the Agent root (implemented by the Agent-root manager).
 * Lock order: a root operation gate may be held while the standalone transition lane is taken;
 * these hooks run inside the lane and never take a root gate.
 */
export type StandaloneAgentRunCollaborationBinding = Readonly<{
  /** The host member context for an eligible run: always-on collaboration tools from session start. */
  buildHostMemberExecutionContext(metadata: AgentRunMetadata): Promise<MemberExecutionContext | null>;
  /** After the host run is published: ensure its Agent root (idempotent). */
  onHostPublished(input: Readonly<{ run: AgentRun; metadata: AgentRunMetadata }>): Promise<void>;
  /** Explicit Stop: end the Agent root (and every child) before the host. Returns whether a root existed. */
  terminateRoot(hostRunId: string): Promise<boolean>;
}>;
