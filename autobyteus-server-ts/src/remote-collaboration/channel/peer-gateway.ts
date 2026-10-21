import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";
import { parseTaskAgentCoordinatingRun } from "../../run-history/store/task-agent-own-file-schema.js";
import {
  isoTimestamp,
  objectRecord,
  requiredString,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type {
  AvailabilityAnswer,
  AvailableAgentsAnswer,
  DeliverRemoteMessageAnswer,
  DeliverRemoteMessageRequest,
  RemoteEnvelope,
  RemoteRefusalTarget,
  StartDelegatedRunAnswer,
  StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";

/** The answer of one inbound request: HTTP 200 with an accepted or refused answer, or 400 for a malformed body. */
export type PeerGatewayResponse<TAnswer> =
  | Readonly<{ status: 200; answer: TAnswer }>
  | Readonly<{ status: 400; answer: Readonly<{ accepted: false; nodeId: string; code: string; message: string }> }>;

/** What a delegation handler started (the gateway adds this node's ID): an Agent run, or a Team run with its members. */
export type StartedRunAnswer =
  | Readonly<{ accepted: true; kind: "agent"; agentRunId: string }>
  | Readonly<{ accepted: true; kind: "agent_team"; teamRunId: string; coordinatorAddress: string; members: readonly Readonly<{ address: string; agentRunId: string }>[] }>;

/** A refusal as a handler returns it (with its target when it has one); the gateway adds this node's ID. */
export type PeerHandlerRefusal = Readonly<{ accepted: false; code: string; message: string; target?: RemoteRefusalTarget }>;

export type DelegatedRunHandler = Readonly<{
  start(request: StartDelegatedRunRequest, from: PeerNode): Promise<StartedRunAnswer | PeerHandlerRefusal>;
}>;
export type RemoteMessageHandler = Readonly<{
  accept(request: DeliverRemoteMessageRequest, from: PeerNode): Promise<Readonly<{ accepted: true }> | PeerHandlerRefusal>;
}>;
/** autobyteus-261: what this node offers a peer for delegation. */
export type AvailableAgentsHandler = Readonly<{
  list(): Promise<Readonly<{ accepted: true; agents: readonly AvailableCollaboratorEntry[] }> | PeerHandlerRefusal>;
}>;

class MalformedRequestError extends Error {}

const field = <T>(read: () => T): T => {
  try { return read(); } catch (error) { throw new MalformedRequestError(error instanceof Error ? error.message : String(error)); }
};
const coordinatingRunOf = (value: unknown, label: string): TaskAgentCoordinatingRun => field(() => parseTaskAgentCoordinatingRun(value, label));
const runRef = (value: unknown, label: string) => ({ agentRunId: field(() => requiredString(objectRecord(value, label).agentRunId, `${label}.agentRunId`)) });

const parseEnvelope = (body: Record<string, unknown>): RemoteEnvelope => ({
  fromNodeId: field(() => requiredString(body.fromNodeId, "fromNodeId")),
  toNodeId: field(() => requiredString(body.toNodeId, "toNodeId")),
});

const parseEnvelopeRequest = (value: unknown): RemoteEnvelope => parseEnvelope(field(() => objectRecord(value, "request")));

const parseStartRequest = (value: unknown): StartDelegatedRunRequest => {
  const body = field(() => objectRecord(value, "request"));
  return {
    ...parseEnvelope(body),
    address: field(() => requiredString(body.address, "address")),
    delegator: runRef(body.delegator, "delegator"),
    coordinatingRun: coordinatingRunOf(body.coordinatingRun, "coordinatingRun"),
  };
};

const parseMessageRequest = (value: unknown): DeliverRemoteMessageRequest => {
  const body = field(() => objectRecord(value, "request"));
  if (body.kind !== "work_packet" && body.kind !== "message") throw new MalformedRequestError("kind must be 'work_packet' or 'message'.");
  if (typeof body.content !== "string") throw new MalformedRequestError("content must be a string.");
  return {
    ...parseEnvelope(body),
    kind: body.kind,
    ...(body.kind === "message" ? { messageId: field(() => requiredString(body.messageId, "messageId")) } : {}),
    sender: runRef(body.sender, "sender"),
    targetRoot: coordinatingRunOf(body.targetRoot, "targetRoot"),
    target: runRef(body.target, "target"),
    content: body.content,
    messageType: field(() => requiredString(body.messageType, "messageType")),
    createdAt: field(() => isoTimestamp(body.createdAt, "createdAt")),
  };
};

/**
 * The single entry point of every inbound request kind from peer nodes (REQ-114; the place where peer
 * authentication and permissions are added in S6). Before any dispatch, in this order:
 * 1. a mobile credential on `/rest/remote/*` was already refused by the route policy (N-3);
 * 2. `toNodeId` must be this node → `PEER_IDENTITY_MISMATCH`;
 * 3. the switch must be on → `REMOTE_COLLABORATION_OFF`;
 * 4. `fromNodeId` must be a registered peer → `PEER_NOT_REGISTERED`;
 * 5. dispatch to the one handler of the request kind.
 * Every answer names this node (`nodeId`).
 */
export class PeerGateway {
  constructor(private readonly dependencies: Readonly<{
    ownNodeId(): Promise<string>;
    capability: Readonly<{ isEnabled(): boolean }>;
    peers: Readonly<{ findByNodeId(nodeId: string): Promise<PeerNode | null> }>;
    delegatedRuns: DelegatedRunHandler;
    messages: RemoteMessageHandler;
    availableAgents: AvailableAgentsHandler;
  }>) {}

  /**
   * autobyteus-261: a peer asks whether this node takes its requests now. The admission is the whole answer: it is
   * accepted exactly when a delegation from that peer would be admitted. No handler, nothing changes.
   */
  checkAvailability(body: unknown): Promise<PeerGatewayResponse<AvailabilityAnswer>> {
    return this.admit(body, parseEnvelopeRequest, async () => Object.freeze({ accepted: true as const }));
  }

  /** autobyteus-261: a peer asks what this node offers for delegation (read-only; nothing is created or written). */
  listAvailableAgents(body: unknown): Promise<PeerGatewayResponse<AvailableAgentsAnswer>> {
    return this.admit(body, parseEnvelopeRequest, () => this.dependencies.availableAgents.list());
  }

  startDelegatedRun(body: unknown): Promise<PeerGatewayResponse<StartDelegatedRunAnswer>> {
    return this.admit(body, parseStartRequest, (request, peer) => this.dependencies.delegatedRuns.start(request, peer));
  }

  deliverMessage(body: unknown): Promise<PeerGatewayResponse<DeliverRemoteMessageAnswer>> {
    return this.admit(body, parseMessageRequest, (request, peer) => this.dependencies.messages.accept(request, peer));
  }

  private async admit<TRequest extends RemoteEnvelope, TAccepted extends object>(
    body: unknown,
    parse: (value: unknown) => TRequest,
    handle: (request: TRequest, peer: PeerNode) => Promise<TAccepted | PeerHandlerRefusal>,
  ): Promise<PeerGatewayResponse<(TAccepted & { nodeId: string }) | (PeerHandlerRefusal & { nodeId: string })>> {
    const nodeId = await this.dependencies.ownNodeId();
    let request: TRequest;
    try { request = parse(body); }
    catch (error) {
      if (!(error instanceof MalformedRequestError)) throw error;
      return { status: 400, answer: { accepted: false, nodeId, code: REMOTE_REFUSAL.BAD_REQUEST, message: error.message } };
    }
    const refuse = (code: string, message: string) => ({ status: 200 as const, answer: { accepted: false as const, nodeId, code, message } });
    if (request.toNodeId !== nodeId) return refuse(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, "This request was meant for another node.");
    if (!this.dependencies.capability.isEnabled()) return refuse(REMOTE_REFUSAL.OFF, "Remote collaboration is turned off on this node.");
    const peer = await this.dependencies.peers.findByNodeId(request.fromNodeId);
    if (!peer) return refuse(REMOTE_REFUSAL.PEER_NOT_REGISTERED, "The calling node is not a registered peer of this node.");
    const result = await handle(request, peer);
    return { status: 200, answer: { ...result, nodeId } };
  }
}
