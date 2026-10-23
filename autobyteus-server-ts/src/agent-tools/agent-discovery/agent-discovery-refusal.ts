import { CollaborationContractError } from "../../agent-collaboration/domain/collaboration-contract-error.js";
import type { MemberCollaborationContext } from "../../agent-collaboration/execution/domain/member-execution-context.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { RemoteChannelRefusal } from "../../agent-collaboration/execution/remote/remote-run-channel.js";

/**
 * A discovery tool's refusal (autobyteus-261): the code and the text the agent reads, from this node or the peer
 * (the same texts as `delegate_task`, REQ-406). The native tools raise it as an error; Agent Tools MCP returns it
 * as an error result.
 */
export type AgentDiscoveryRefusal = RemoteChannelRefusal;

export const isAgentDiscoveryRefusal = (value: unknown): value is AgentDiscoveryRefusal =>
  typeof value === "object" && value !== null && (value as { accepted?: unknown }).accepted === false;

/** Where remote collaboration is not composed, nothing can be sent: the same refusal as the switch off. */
export const remoteCollaborationOff = (): AgentDiscoveryRefusal =>
  Object.freeze({ accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off });

/**
 * The discovery tools' availability (the same rule for both): a sender whose member context can list available
 * agents, that is a run that can delegate.
 */
export const requireDiscoveryContext = (collaboration: MemberCollaborationContext | null | undefined, toolName: string) => {
  const lister = collaboration?.listAvailableAgents;
  if (!lister) {
    throw new CollaborationContractError(
      "COLLABORATION_CONTEXT_REQUIRED",
      `${toolName} requires an agent run that can delegate to available agents.`,
    );
  }
  return lister;
};

/** The native tools' text: the result as JSON, or the refusal raised as the tool's error. */
export const agentDiscoveryToolText = (outcome: object): string => {
  if (isAgentDiscoveryRefusal(outcome)) throw new Error(outcome.message);
  return JSON.stringify(outcome);
};
