import type { DelegatingRunRef } from "../../run-history/store/agent-run-metadata-types.js";
import { NodeIdentityNotMigratedError } from "../../remote-access/services/node-identity-service.js";
import { parseDelegatingRunRef } from "../../run-history/store/delegated-from-schema.js";
import {
  isoTimestamp,
  nullableString,
  objectRecord,
  requiredString,
} from "../../run-history/store/run-execution-tree-shared-record-schemas.js";
import type { ClientIdentity } from "../../node-access/domain/client-identity.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type {
  AgentProjectionAnswer,
  AgentProjectionRequest,
  AvailabilityAnswer,
  AvailableAgentsAnswer,
  DeliverRemoteMessageAnswer,
  DeliverRemoteMessageRequest,
  DeliverRunMessageRequest,
  DelegatedRunStateAnswer,
  DelegatedRunStateRequest,
  OwnerCommandAnswer,
  OwnerCommandRequest,
  PeerRunMembersAnswer,
  PeerRunMembersRequest,
  RemoteEnvelope,
  RemoteModelRoutingState,
  RemoteRefusalTarget,
  RunObservationOpening,
  RunningAgentsAnswer,
  RunSummariesAnswer,
  RunSummariesRequest,
  StartDelegatedRunAnswer,
  StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import type { AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { RunningAgentEntry } from "../../agent-collaboration/running/running-agent-entry.js";
import type { RemoteAgentLaunch, RemoteAgentProjection, RemoteOwnerCommand, RemoteRunSummary } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RunAgentObservation } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type { RunObservationSink } from "../inbound/remote-run-view-provider.js";

/** The answer of one inbound request: HTTP 200 with an accepted or refused answer, or 400 for a malformed body. */
export type PeerGatewayResponse<TAnswer> =
  | Readonly<{ status: 200; answer: TAnswer }>
  | Readonly<{ status: 400; answer: Readonly<{ accepted: false; nodeId: string; code: string; message: string }> }>
  /** autobyteus-290: this node's identity is held back (`node_identity`), so it cannot name itself yet. */
  | Readonly<{ status: 503; answer: Readonly<{ accepted: false; code: string; message: string }> }>;

/** What a delegation handler started (the gateway adds this node's ID): an Agent run, or a Team run with its members. */
export type StartedRunAnswer =
  | Readonly<{ accepted: true; kind: "agent"; agentRunId: string; launches: readonly RemoteAgentLaunch[] }>
  | Readonly<{
      accepted: true; kind: "agent_team"; teamRunId: string; coordinatorAddress: string;
      members: readonly Readonly<{ address: string; agentRunId: string }>[]; launches: readonly RemoteAgentLaunch[];
    }>;

/**
 * A refusal as a handler returns it (with its target when it has one, and for a target no layer covers this node's
 * Model Routing state or the agent its router failed for); the gateway adds this node's ID.
 */
export type PeerHandlerRefusal = Readonly<{
  accepted: false; code: string; message: string; target?: RemoteRefusalTarget;
  modelRouting?: RemoteModelRoutingState; agentName?: string;
}>;

export type DelegatedRunHandler = Readonly<{
  start(request: StartDelegatedRunRequest, from: PeerNode): Promise<StartedRunAnswer | PeerHandlerRefusal>;
}>;
export type RemoteMessageHandler = Readonly<{
  accept(request: DeliverRemoteMessageRequest, from: PeerNode): Promise<Readonly<{ accepted: true; receiverAddress: string | null }> | PeerHandlerRefusal>;
  /** autobyteus-492: a message by run ID only, for a running agent of this node. */
  acceptRunMessage(request: DeliverRunMessageRequest, from: PeerNode): Promise<Readonly<{ accepted: true; receiverAddress: string | null }> | PeerHandlerRefusal>;
}>;
/** autobyteus-261: what this node offers a peer for delegation. */
export type AvailableAgentsHandler = Readonly<{
  list(): Promise<Readonly<{ accepted: true; agents: readonly AvailableCollaboratorEntry[] }> | PeerHandlerRefusal>;
}>;
/** autobyteus-492: this node's running runs a person started, for a peer (`RunningAgentsListing` with no caller). */
export type RunningAgentsHandler = Readonly<{
  list(): Promise<Readonly<{ accepted: true; agents: readonly RunningAgentEntry[] }> | PeerHandlerRefusal>;
}>;

/**
 * autobyteus-278: what a peer's owner reads and drives on this node, for runs that peer's delegation started (one
 * owner, `RemoteRunViewProvider`).
 */
export type RemoteRunViewHandler = Readonly<{
  summaries(request: RunSummariesRequest, from: PeerNode): Promise<Readonly<{ accepted: true; runs: readonly RemoteRunSummary[] }> | PeerHandlerRefusal>;
  projection(request: AgentProjectionRequest, from: PeerNode): Promise<Readonly<{ accepted: true; projection: RemoteAgentProjection }> | PeerHandlerRefusal>;
  command(request: OwnerCommandRequest, from: PeerNode): Promise<Readonly<{ accepted: true }> | PeerHandlerRefusal>;
  observe(opening: RunObservationOpening, from: PeerNode, sink: RunObservationSink): Promise<Readonly<{ accepted: true; observation: RunAgentObservation }> | PeerHandlerRefusal>;
  /** autobyteus-461 SR-088: one agent's own stream snapshot, and its numbered frames. */
  agentStreamSnapshot(request: AgentProjectionRequest, from: PeerNode): Promise<Readonly<{ accepted: true; snapshot: unknown; status: unknown }> | PeerHandlerRefusal>;
  observeAgentStream(opening: RunObservationOpening & Readonly<{ agentRunId: string }>, from: PeerNode, sink: RunObservationSink): Promise<Readonly<{ accepted: true; observation: RunAgentObservation }> | PeerHandlerRefusal>;
}>;

/** FU-003: a Team run the caller started for this node's delegation changed its members (`PeerRunMembersReceiver`). */
export type PeerRunMembersHandler = Readonly<{
  apply(request: PeerRunMembersRequest, from: PeerNode): Promise<Readonly<{ accepted: true }> | PeerHandlerRefusal>;
}>;

/**
 * autobyteus-591 DN-2: the delegating node's Task state of a run its delegation started here (one owner,
 * `DelegatedRunStateHandler`): closed is recorded and the run stopped before the answer; open clears the record.
 */
export type DelegatedRunStatesHandler = Readonly<{
  apply(request: DelegatedRunStateRequest, from: PeerNode): Promise<Readonly<{ accepted: true; open: boolean }> | PeerHandlerRefusal>;
}>;

class MalformedRequestError extends Error {}

const field = <T>(read: () => T): T => {
  try { return read(); } catch (error) { throw new MalformedRequestError(error instanceof Error ? error.message : String(error)); }
};
const runRefOf = (value: unknown, label: string): DelegatingRunRef => field(() => parseDelegatingRunRef(value, label));
const runRef = (value: unknown, label: string) => ({ agentRunId: field(() => requiredString(objectRecord(value, label).agentRunId, `${label}.agentRunId`)) });
/** A message's sender: its run ID, and its address in its own run, a string or null (autobyteus-565). */
const senderRef = (value: unknown) => {
  const sender = field(() => objectRecord(value, "sender"));
  return { ...runRef(sender, "sender"), address: field(() => nullableString(sender.address, "sender.address")) };
};

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
    delegatingRun: runRefOf(body.delegatingRun, "delegatingRun"),
    task: parseStartTask(body.task),
  };
};

/** The delegated work and its Task (autobyteus-32): the text and title are required, the Task's identity may be null. */
const parseStartTask = (value: unknown): StartDelegatedRunRequest["task"] => {
  const task = field(() => objectRecord(value, "task"));
  if (typeof task.text !== "string") throw new MalformedRequestError("task.text must be a string.");
  if (typeof task.title !== "string") throw new MalformedRequestError("task.title must be a string.");
  return {
    text: task.text,
    title: task.title,
    taskKey: field(() => nullableString(task.taskKey, "task.taskKey")),
    projectId: field(() => nullableString(task.projectId, "task.projectId")),
    taskId: field(() => nullableString(task.taskId, "task.taskId")),
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
    sender: senderRef(body.sender),
    targetRoot: runRefOf(body.targetRoot, "targetRoot"),
    target: runRef(body.target, "target"),
    content: body.content,
    messageType: field(() => requiredString(body.messageType, "messageType")),
    createdAt: field(() => isoTimestamp(body.createdAt, "createdAt")),
  };
};

/** autobyteus-492: a message by run IDs only; no `targetRoot`, no `kind`. */
const parseRunMessageRequest = (value: unknown): DeliverRunMessageRequest => {
  const body = field(() => objectRecord(value, "request"));
  if (typeof body.content !== "string") throw new MalformedRequestError("content must be a string.");
  return {
    ...parseEnvelope(body),
    messageId: field(() => requiredString(body.messageId, "messageId")),
    sender: senderRef(body.sender),
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
    targetRoot: runRefOf(body.targetRoot, "targetRoot"),
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
    targetRoot: runRefOf(body.targetRoot, "targetRoot"),
    agentRunId: field(() => requiredString(body.agentRunId, "agentRunId")),
    command: ownerCommandOf(body.command),
  };
};

/** FU-003: a Team run's members (each address and run ID) and its coordinator's address. */
const parsePeerRunMembersRequest = (value: unknown): PeerRunMembersRequest => {
  const body = field(() => objectRecord(value, "request"));
  if (!Array.isArray(body.members)) throw new MalformedRequestError("members must be an array.");
  return {
    ...parseEnvelope(body),
    run: startedRunRef(body.run, "run"),
    coordinatorAddress: field(() => requiredString(body.coordinatorAddress, "coordinatorAddress")),
    members: body.members.map((member: unknown, index: number) => {
      const entry = field(() => objectRecord(member, `members[${index}]`));
      return { address: field(() => requiredString(entry.address, `members[${index}].address`)), agentRunId: field(() => requiredString(entry.agentRunId, `members[${index}].agentRunId`)) };
    }),
  };
};

const parseDelegatedRunStateRequest = (value: unknown): DelegatedRunStateRequest => {
  const body = field(() => objectRecord(value, "request"));
  if (typeof body.open !== "boolean") throw new MalformedRequestError("open must be a boolean.");
  return { ...parseEnvelope(body), run: startedRunRef(body.run, "run"), open: body.open };
};

/** An observation's opening: a run's (statuses and summaries), or one agent's own stream when it names the agent (SR-088). */
const parseObservationOpening = (value: unknown): RunObservationOpening & Readonly<{ agentRunId?: string }> => {
  const body = field(() => objectRecord(value, "request"));
  const opening = { ...parseEnvelope(body), targetRoot: runRefOf(body.targetRoot, "targetRoot") };
  return body.agentRunId === undefined ? opening : { ...opening, agentRunId: field(() => requiredString(body.agentRunId, "agentRunId")) };
};

/**
 * The single entry point of every inbound request kind from peer nodes (REQ-114). Before any dispatch, in this order:
 * 1. the node access gate already authenticated the caller as a paired peer by its request signature, and checked
 *    the body against the signed hash (node access model NA-9); `caller` is that identity;
 * 2. `toNodeId` must be this node → `PEER_IDENTITY_MISMATCH`;
 * 3. `fromNodeId` must be the authenticated peer → `PEER_IDENTITY_MISMATCH`;
 * 4. the switch must be on → `REMOTE_COLLABORATION_OFF`;
 * 5. `fromNodeId` must be a registered peer → `PEER_NOT_REGISTERED`;
 * 6. dispatch to the one handler of the request kind.
 * Every answer names this node (`nodeId`), except the 503 refusal while this node's identity is held back.
 */
export class PeerGateway {
  constructor(private readonly dependencies: Readonly<{
    ownNodeId(): Promise<string>;
    capability: Readonly<{ isEnabled(): boolean }>;
    peers: Readonly<{ findByNodeId(nodeId: string): Promise<PeerNode | null> }>;
    delegatedRuns: DelegatedRunHandler;
    messages: RemoteMessageHandler;
    availableAgents: AvailableAgentsHandler;
    runningAgents: RunningAgentsHandler;
    runViews: RemoteRunViewHandler;
    delegatedRunStates: DelegatedRunStatesHandler;
    peerRunMembers: PeerRunMembersHandler;
  }>) {}

  /**
   * autobyteus-261: a peer asks whether this node takes its requests now. The admission is the whole answer: it is
   * accepted exactly when a delegation from that peer would be admitted. No handler, nothing changes.
   */
  checkAvailability(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<AvailabilityAnswer>> {
    return this.admit(body, caller, parseEnvelopeRequest, async () => Object.freeze({ accepted: true as const }));
  }

  /** autobyteus-261: a peer asks what this node offers for delegation (read-only; nothing is created or written). */
  listAvailableAgents(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<AvailableAgentsAnswer>> {
    return this.admit(body, caller, parseEnvelopeRequest, () => this.dependencies.availableAgents.list());
  }

  startDelegatedRun(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<StartDelegatedRunAnswer>> {
    return this.admit(body, caller, parseStartRequest, (request, peer) => this.dependencies.delegatedRuns.start(request, peer));
  }

  deliverMessage(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<DeliverRemoteMessageAnswer>> {
    return this.admit(body, caller, parseMessageRequest, (request, peer) => this.dependencies.messages.accept(request, peer));
  }

  /** autobyteus-492: a message to a running agent of this node by its run ID only (`/rest/remote/run-messages`). */
  deliverRunMessage(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<DeliverRemoteMessageAnswer>> {
    return this.admit(body, caller, parseRunMessageRequest, (request, peer) => this.dependencies.messages.acceptRunMessage(request, peer));
  }

  /** autobyteus-492: this node's running runs a person started (read-only; nothing is started or written). */
  listRunningAgents(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<RunningAgentsAnswer>> {
    return this.admit(body, caller, parseEnvelopeRequest, () => this.dependencies.runningAgents.list());
  }

  /** autobyteus-278: the titles and statuses of runs the caller's delegation started (read-only). */
  runSummaries(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<RunSummariesAnswer>> {
    return this.admit(body, caller, parseRunSummariesRequest, (request, peer) => this.dependencies.runViews.summaries(request, peer));
  }

  /** autobyteus-278: one agent's stored conversation in such a run (read-only). */
  agentProjection(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<AgentProjectionAnswer>> {
    return this.admit(body, caller, parseAgentProjectionRequest, (request, peer) => this.dependencies.runViews.projection(request, peer));
  }

  /** autobyteus-278: a command of the caller's owner for one agent of such a run. */
  ownerCommand(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<OwnerCommandAnswer>> {
    return this.admit(body, caller, parseOwnerCommandRequest, (request, peer) => this.dependencies.runViews.command(request, peer));
  }

  /** autobyteus-591 DN-2: the delegating node's Task state of a run its delegation started; answered once applied. */
  deliveredRunState(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<DelegatedRunStateAnswer>> {
    return this.admit(body, caller, parseDelegatedRunStateRequest, (request, peer) => this.dependencies.delegatedRunStates.apply(request, peer));
  }

  /** FU-003 (DS-007): a Team run the caller started for this node's delegation changed its members there. */
  peerRunMembers(body: unknown, caller: ClientIdentity | null): Promise<PeerGatewayResponse<PeerRunMembersAnswer>> {
    return this.admit(body, caller, parsePeerRunMembersRequest, (request, peer) => this.dependencies.peerRunMembers.apply(request, peer));
  }

  /**
   * autobyteus-278: the first frame of an observation stream. Accepted, the answer carries the observation, which the
   * socket closes when it closes; the frames go to `sink`.
   */
  openRunObservation(body: unknown, caller: ClientIdentity | null, sink: RunObservationSink) {
    return this.admit(body, caller, parseObservationOpening, (request, peer) => request.agentRunId === undefined
      ? this.dependencies.runViews.observe(request, peer, sink)
      : this.dependencies.runViews.observeAgentStream({ ...request, agentRunId: request.agentRunId }, peer, sink));
  }

  /** autobyteus-461 SR-088: one agent's own stream snapshot, in a run the caller's delegation started (read-only). */
  agentStreamSnapshot(body: unknown, caller: ClientIdentity | null) {
    return this.admit(body, caller, parseAgentProjectionRequest, (request, peer) => this.dependencies.runViews.agentStreamSnapshot(request, peer));
  }

  private async admit<TRequest extends RemoteEnvelope, TAccepted extends object>(
    body: unknown,
    caller: ClientIdentity | null,
    parse: (value: unknown) => TRequest,
    handle: (request: TRequest, peer: PeerNode) => Promise<TAccepted | PeerHandlerRefusal>,
  ): Promise<PeerGatewayResponse<(TAccepted & { nodeId: string }) | (PeerHandlerRefusal & { nodeId: string })>> {
    let nodeId: string;
    try {
      nodeId = await this.dependencies.ownNodeId();
    } catch (error) {
      if (!(error instanceof NodeIdentityNotMigratedError)) throw error;
      return { status: 503, answer: { accepted: false, code: REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, message: error.message } };
    }
    let request: TRequest;
    try { request = parse(body); }
    catch (error) {
      if (!(error instanceof MalformedRequestError)) throw error;
      return { status: 400, answer: { accepted: false, nodeId, code: REMOTE_REFUSAL.BAD_REQUEST, message: error.message } };
    }
    const refuse = (code: string, message: string) => ({ status: 200 as const, answer: { accepted: false as const, nodeId, code, message } });
    if (request.toNodeId !== nodeId) return refuse(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, "This request was meant for another node.");
    if (caller?.kind !== "peer" || caller.nodeId !== request.fromNodeId) {
      return refuse(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, "This request does not come from the node it names.");
    }
    if (!this.dependencies.capability.isEnabled()) return refuse(REMOTE_REFUSAL.OFF, "Remote collaboration is turned off on this node.");
    const peer = await this.dependencies.peers.findByNodeId(request.fromNodeId);
    if (!peer) return refuse(REMOTE_REFUSAL.PEER_NOT_REGISTERED, "The calling node is not a registered peer of this node.");
    const result = await handle(request, peer);
    return { status: 200, answer: { ...result, nodeId } };
  }
}
