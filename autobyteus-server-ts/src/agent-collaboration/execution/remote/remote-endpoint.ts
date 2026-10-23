import type {
  RemoteTaskAgentExecution,
  RemoteTaskTeamExecution,
} from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import type { TaskExecutionStopResult } from "../task/task-execution-resource-port.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT, remoteRunClosureText } from "./remote-refusal-codes.js";
import type { RemoteMessageTransmission, RemoteTargetRoot } from "./remote-run-channel.js";
import type { RemoteRunReference } from "./remote-run-reference.js";

/** What every remote endpoint of a root has: the run on the peer and its own rules (design § Remote Messaging). */
type RemoteEndpointCore = Readonly<{
  /** The run on the peer. */
  reference: RemoteRunReference;
  /**
   * The local agents of this root the run is paired with (CM-11): the one representation of the pair rule
   * (autobyteus-247 N-301); `allowsSender` and `allowsTarget` are derived from it.
   */
  pairedAgentRunIds: ReadonlySet<string>;
  /** The name a local agent sees in results: the target address's name, or the run ID. */
  displayName: string;
  /** The pair rule, outbound: may this local agent send to the endpoint? */
  allowsSender(agentRunId: string): boolean;
  /** The pair rule, inbound: may the endpoint send to this local agent? */
  allowsTarget(agentRunId: string): boolean;
  /** The Task ownership of the endpoint's messages on this node (`assertDeliveryAllowed`). */
  ownershipChain(): readonly TaskExecutionReference[];
  /** The refusals of the kind's rules, as the agent reads them. */
  refusals: Readonly<{ notPermitted: Readonly<{ accepted: false; code: string; message: string }> }>;
  /** The request that carries a prepared message from a paired agent to the endpoint, naming its root there. */
  transmission(message: CollaborationCommunicationMessage): RemoteMessageTransmission;
}>;

/**
 * On the delegating node (A): an Agent run this root delegated to a peer, built from a `remoteTaskExecutions` link.
 * Only its delegator messages it; it belongs to the Task the link was recorded under (item 5).
 */
export type DelegatedRunEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegated_run";
  link: RemoteTaskAgentExecution;
  /** AR-007: the Task closed. Nothing is released here; the run stops on its node when it goes idle (S3 stops it). */
  closureFence(execution: TaskExecutionReference, peerName: string): TaskExecutionStopResult;
}>;

/**
 * On the delegating node (A): one member of a Team run this root delegated to a peer (autobyteus-247), one endpoint
 * per member run ID of the Team link (the coordinator included). Only the delegator messages it; it belongs to
 * the Team's Task.
 */
export type DelegatedTeamEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegated_team";
  link: RemoteTaskTeamExecution;
  /** AR-007 for the Team: the same fence and text as for a remote Agent. */
  closureFence(execution: TaskExecutionReference, peerName: string): TaskExecutionStopResult;
}>;

/**
 * On the node that runs a delegated run (B): its delegator on the peer, built from the root's `delegatedFrom`.
 * Its rules apply to every local agent the back-link pairs with (the host of a standalone root; every member of
 * a Team root); there is no Task on this node (N-11). Its messages name the coordinating run as their root.
 */
export type DelegatorEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegator";
  delegatedFrom: DelegatedFrom;
  /** N-6: the work packet comes from the delegator on its node, for a paired agent (the host, or the coordinator). */
  admitsWorkPacket(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): boolean;
}>;

export type RemoteEndpoint = DelegatedRunEndpoint | DelegatedTeamEndpoint | DelegatorEndpoint;

/** The pair rule's refusal: only the delegator and the delegated run (or Team) message each other. */
const pairRefusals = Object.freeze({
  notPermitted: Object.freeze({ accepted: false as const, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: REMOTE_ROOT_REFUSAL_TEXT.notPermitted }),
});

/** The pair rule from the one representation (N-301). */
const pairRule = (paired: readonly string[]) => {
  const pairedAgentRunIds: ReadonlySet<string> = new Set(paired);
  const isPaired = (agentRunId: string) => pairedAgentRunIds.has(agentRunId);
  return { pairedAgentRunIds, allowsSender: isPaired, allowsTarget: isPaired };
};

const messageRequest = (nodeId: string, targetRoot: RemoteTargetRoot, message: CollaborationCommunicationMessage): RemoteMessageTransmission => Object.freeze({
  nodeId,
  kind: "message",
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  targetRoot,
  targetAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  createdAt: message.createdAt,
});

const closureFenceFor = (address: string) => (execution: TaskExecutionReference, peerName: string): TaskExecutionStopResult => Object.freeze({
  execution, outcome: "fenced_remote" as const, stopped: false as const, message: remoteRunClosureText(address, peerName),
});

export const delegatedRunEndpoint = (link: RemoteTaskAgentExecution): DelegatedRunEndpoint => {
  const targetRoot: RemoteTargetRoot = Object.freeze({ kind: "agent", runId: link.agentRunId });
  return Object.freeze({
    kind: "delegated_run" as const,
    link,
    reference: Object.freeze({ nodeId: link.nodeId, agentRunId: link.agentRunId }),
    ...pairRule([link.delegatorAgentRunId]),
    displayName: getAgentTeamAddressBasename(link.address) ?? link.agentRunId,
    refusals: pairRefusals,
    ownershipChain: () => Object.freeze([Object.freeze({ agentRunId: link.agentRunId })]),
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(link.nodeId, targetRoot, message),
    closureFence: closureFenceFor(link.address),
  });
};

/** The endpoints of a remote Team link: one per member (the coordinator included). */
export const delegatedTeamEndpoints = (link: RemoteTaskTeamExecution): readonly DelegatedTeamEndpoint[] => {
  const targetRoot: RemoteTargetRoot = Object.freeze({ kind: "agent_team", runId: link.teamRunId });
  const rule = pairRule([link.delegatorAgentRunId]);
  return Object.freeze(link.members.map((member): DelegatedTeamEndpoint => Object.freeze({
    kind: "delegated_team" as const,
    link,
    reference: Object.freeze({ nodeId: link.nodeId, agentRunId: member.agentRunId }),
    ...rule,
    displayName: getAgentTeamAddressBasename(member.address) ?? member.agentRunId,
    refusals: pairRefusals,
    ownershipChain: () => Object.freeze([Object.freeze({ teamRunId: link.teamRunId })]),
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(link.nodeId, targetRoot, message),
    closureFence: closureFenceFor(link.address),
  })));
};

export const delegatorEndpoint = (pairedAgentRunIds: readonly string[], delegatedFrom: DelegatedFrom): DelegatorEndpoint => {
  const rule = pairRule(pairedAgentRunIds);
  return Object.freeze({
    kind: "delegator" as const,
    delegatedFrom,
    reference: Object.freeze({ nodeId: delegatedFrom.nodeId, agentRunId: delegatedFrom.delegatorAgentRunId }),
    ...rule,
    displayName: delegatedFrom.delegatorAgentRunId,
    refusals: pairRefusals,
    ownershipChain: () => Object.freeze([]),
    // The delegating node receives it in the coordinating run it named at start.
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(delegatedFrom.nodeId, delegatedFrom.coordinatingRun, message),
    admitsWorkPacket: (fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string) =>
      fromNodeId === delegatedFrom.nodeId && senderAgentRunId === delegatedFrom.delegatorAgentRunId && rule.allowsTarget(targetAgentRunId),
  });
};
