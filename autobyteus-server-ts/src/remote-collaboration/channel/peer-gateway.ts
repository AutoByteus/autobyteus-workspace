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
  AgentProjectionAnswer,
  AgentProjectionRequest,
  AvailabilityAnswer,
  AvailableAgentsAnswer,
  DeliverRemoteMessageAnswer,
  DeliverRemoteMessageRequest,
  OwnerCommandAnswer,
  OwnerCommandRequest,
  RemoteEnvelope,
  RemoteRefusalTarget,
  RunObservationOpening,
  RunSummariesAnswer,
  RunSummariesRequest,
  StartDelegatedRunAnswer,
  StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { RemoteAgentProjection, RemoteOwnerCommand, RemoteRunSummary } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PairedAgentObservation } from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import type { RunObservationSink } from "../inbound/remote-run-view-provider.js";

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

/**
 * autobyteus-278: what a peer's owner reads and drives on this node, for runs that peer's delegation started (one
 * owner, `RemoteRunViewProvider`).
 */
export type RemoteRunViewHandler = Readonly<{
  summaries(request: RunSummariesRequest, from: PeerNode): Promise<Readonly<{ accepted: true; runs: readonly RemoteRunSummary[] }> | PeerHandlerRefusal>;
  projection(request: AgentProjectionRequest, from: PeerNode): Promise<Readonly<{ accepted: true; projection: RemoteAgentProjection }> | PeerHandlerRefusal>;
  command(request: OwnerCommandRequest, from: PeerNode): Promise<Readonly<{ accepted: true }> | PeerHandlerRefusal>;
  observe(opening: RunObservationOpening, from: PeerNode, sink: RunObservationSink): Promise<Readonly<{ accepted: true; observation: PairedAgentObservation }> | PeerHandlerRefusal>;
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

const startedRunRef = (value: unknown, label: string) => {
  const entry = field(() => objectRecord(value, label));
  if (entry.kind !== "agent" && entry.kind !== "agent_team") throw new MalformedRequestError(`${label}.kind must be 'agent' or 'agent_team'.`);
  return { kind: entry.kind, runId: field(() => requiredString(entry.runId, `${label}.runId`)) } as const;
};

const parseRunSummariesRequest = (value: unknown): RunSummariesRequest => {
  const body = field(() => objectRecord(value, "request"));
  if (!Array.isArray(body.runs)) throw new MalformedRequestError("runs must be an array.");
  return { ...parseEnvelope(body), runs: body.runs.map((run, index) => startedRunRef(run, `runs[${index}]`)) };
};

const parseAgentProjectionRequest = (value: unknown): AgentProjectionRequest => {
  const body = field(() => objectRecord(value, "request"));
  return {
    ...parseEnvelope(body),
    targetRoot: coordinatingRunOf(body.targetRoot, "targetRoot"),
    agentRunId: field(() => requiredString(body.agentRunId, "agentRunId")),
  };
};

const ownerCommandOf = (value: unknown): RemoteOwnerCommand => {
  const command = field(() => objectRecord(value, "command"));
  if (command.kind === "interrupt" || command.kind === "terminate") return { kind: command.kind };
  if (command.kind !== "post_message") throw new MalformedRequestError("command.kind must be 'post_message', 'interrupt' or 'terminate'.");
  if (typeof command.content !== "string") throw new MalformedRequestError("command.content must be a string.");
  return {
    kind: "post_message",
    content: command.content,
    messageId: field(() => requiredString(command.messageId, "command.messageId")),
    dedupeKey: field(() => requiredString(command.dedupeKey, "command.dedupeKey")),
  };
};

const parseOwnerCommandRequest = (value: unknown): OwnerCommandRequest => {
  const body = field(() => objectRecord(value, "request"));
  return {
    ...parseEnvelope(body),
    targetRoot: coordinatingRunOf(body.targetRoot, "targetRoot"),
    agentRunId: field(() => requiredString(body.agentRunId, "agentRunId")),
    command: ownerCommandOf(body.command),
  };
};

const parseObservationOpening = (value: unknown): RunObservationOpening => {
  const body = field(() => objectRecord(value, "request"));
  return { ...parseEnvelope(body), targetRoot: coordinatingRunOf(body.targetRoot, "targetRoot") };
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
    runViews: RemoteRunViewHandler;
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

  /** autobyteus-278: the titles and statuses of runs the caller's delegation started (read-only). */
  runSummaries(body: unknown): Promise<PeerGatewayResponse<RunSummariesAnswer>> {
    return this.admit(body, parseRunSummariesRequest, (request, peer) => this.dependencies.runViews.summaries(request, peer));
  }

  /** autobyteus-278: one agent's stored conversation in such a run (read-only). */
  agentProjection(body: unknown): Promise<PeerGatewayResponse<AgentProjectionAnswer>> {
    return this.admit(body, parseAgentProjectionRequest, (request, peer) => this.dependencies.runViews.projection(request, peer));
  }

  /** autobyteus-278: a command of the caller's owner for one agent of such a run. */
  ownerCommand(body: unknown): Promise<PeerGatewayResponse<OwnerCommandAnswer>> {
    return this.admit(body, parseOwnerCommandRequest, (request, peer) => this.dependencies.runViews.command(request, peer));
  }

  /**
   * autobyteus-278: the first frame of an observation stream. Accepted, the answer carries the observation, which the
   * socket closes when it closes; the frames go to `sink`.
   */
  openRunObservation(body: unknown, sink: RunObservationSink) {
    return this.admit(body, parseObservationOpening, (request, peer) => this.dependencies.runViews.observe(request, peer, sink));
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
