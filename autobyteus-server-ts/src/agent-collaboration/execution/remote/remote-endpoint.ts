import type { RemoteTaskAgentExecution } from "../../../run-history/domain/run-execution-tree-shared-records.js";
import type { DelegatedFrom } from "../../../run-history/store/agent-run-metadata-types.js";
import { getAgentTeamAddressBasename } from "../../domain/agent-team-address.js";
import type { CollaborationCommunicationMessage } from "../communication/collaboration-communication-message.js";
import type { TaskExecutionReference } from "../task/task-execution-reference.js";
import type { TaskExecutionStopResult } from "../task/task-execution-resource-port.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT, remoteRunClosureText } from "./remote-refusal-codes.js";
import type { RemoteMessageTransmission } from "./remote-run-channel.js";
import type { RemoteRunReference } from "./remote-run-reference.js";

/** What every remote endpoint of a root has: the run on the peer and its own rules (design § Remote Messaging). */
type RemoteEndpointCore = Readonly<{
  /** The run on the peer. */
  reference: RemoteRunReference;
  /** The one local agent of this root the run is paired with (CM-11). */
  pairedAgentRunId: string;
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
  /** The request that carries a prepared message from the paired agent to the endpoint. */
  transmission(message: CollaborationCommunicationMessage): RemoteMessageTransmission;
}>;

/**
 * On the delegating node (A): a run this root delegated to a peer, built from a `remoteTaskExecutions` link.
 * Only its delegator messages it; it belongs to the Task the link was recorded under (item 5).
 */
export type DelegatedRunEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegated_run";
  link: RemoteTaskAgentExecution;
  /** AR-007: the Task closed. Nothing is released here; the run stops on its node when it goes idle (S3 stops it). */
  closureFence(execution: TaskExecutionReference, peerName: string): TaskExecutionStopResult;
}>;

/**
 * On the node that runs a delegated run (B): its delegator on the peer, built from the host's `delegatedFrom`.
 * Only the host (the remote run itself) messages it; there is no Task on this node (N-11).
 */
export type DelegatorEndpoint = RemoteEndpointCore & Readonly<{
  kind: "delegator";
  delegatedFrom: DelegatedFrom;
  /** N-6: the work packet comes from the delegator on its node, for the host. */
  admitsWorkPacket(fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string): boolean;
}>;

export type RemoteEndpoint = DelegatedRunEndpoint | DelegatorEndpoint;

/** The pair rule's refusal: only the delegator and the delegated run message each other. */
const pairRefusals = Object.freeze({
  notPermitted: Object.freeze({ accepted: false as const, code: REMOTE_REFUSAL.TARGET_NOT_PERMITTED, message: REMOTE_ROOT_REFUSAL_TEXT.notPermitted }),
});

const messageRequest = (nodeId: string, message: CollaborationCommunicationMessage): RemoteMessageTransmission => Object.freeze({
  nodeId,
  kind: "message",
  messageId: message.messageId,
  senderAgentRunId: message.senderAgentRunId,
  targetAgentRunId: message.receiverAgentRunId,
  content: message.content,
  messageType: message.messageType,
  createdAt: message.createdAt,
});

export const delegatedRunEndpoint = (link: RemoteTaskAgentExecution): DelegatedRunEndpoint => {
  const isDelegator = (agentRunId: string) => agentRunId === link.delegatorAgentRunId;
  const reference: RemoteRunReference = Object.freeze({ nodeId: link.nodeId, agentRunId: link.agentRunId });
  return Object.freeze({
    kind: "delegated_run" as const,
    link,
    reference,
    pairedAgentRunId: link.delegatorAgentRunId,
    displayName: getAgentTeamAddressBasename(link.address) ?? link.agentRunId,
    allowsSender: isDelegator,
    allowsTarget: isDelegator,
    refusals: pairRefusals,
    ownershipChain: () => Object.freeze([Object.freeze({ agentRunId: link.agentRunId })]),
    transmission: (message: CollaborationCommunicationMessage) => messageRequest(link.nodeId, message),
    closureFence: (execution: TaskExecutionReference, peerName: string): TaskExecutionStopResult => Object.freeze({
      execution, outcome: "fenced_remote" as const, stopped: false as const, message: remoteRunClosureText(link.address, peerName),
    }),
  });
};

export const delegatorEndpoint = (hostRunId: string, delegatedFrom: DelegatedFrom): DelegatorEndpoint => {
  const isHost = (agentRunId: string) => agentRunId === hostRunId;
  const reference: RemoteRunReference = Object.freeze({ nodeId: delegatedFrom.nodeId, agentRunId: delegatedFrom.delegatorAgentRunId });
  return Object.freeze({
    kind: "delegator" as const,
    delegatedFrom,
    reference,
    pairedAgentRunId: hostRunId,
    displayName: delegatedFrom.delegatorAgentRunId,
    allowsSender: isHost,
    allowsTarget: isHost,
    refusals: pairRefusals,
    ownershipChain: () => Object.freeze([]),
    // The delegating node finds the root that holds the link by the coordinating run it gave at start.
    transmission: (message: CollaborationCommunicationMessage) => Object.freeze({
      ...messageRequest(delegatedFrom.nodeId, message), coordinatingRun: delegatedFrom.coordinatingRun,
    }),
    admitsWorkPacket: (fromNodeId: string, senderAgentRunId: string, targetAgentRunId: string) =>
      fromNodeId === delegatedFrom.nodeId && senderAgentRunId === delegatedFrom.delegatorAgentRunId && isHost(targetAgentRunId),
  });
};
