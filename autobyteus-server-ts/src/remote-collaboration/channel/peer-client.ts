import { NodeIdentityNotMigratedError, NODE_IDENTITY_NOT_MIGRATED_TEXT } from "../../remote-access/services/node-identity-service.js";
import type {
  RemoteAgentProjectionAnswer,
  RemoteAgentStreamObserver,
  RemoteAgentStreamSnapshotAnswer,
  RemoteDeliveryReceipt,
  RemoteMessageReceipt,
  RemoteMessageTransmission,
  RemoteOwnerCommand,
  PeerNodeRef,
  ReceivedFilePieceReceipt,
  ReceivedFilesStatusReceipt,
  RemoteRunChannel,
  RemoteRunObservationStream,
  RemoteRunObserver,
  RemoteRunMembers,
  RemoteRunSummaries,
  RemoteStartedRun,
  RemoteStartedRunRef,
  RemoteTargetRoot,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { remoteAgentLaunchesOf as launchesOf, remoteAgentProjectionOf, remoteRunSummariesOf } from "./peer-run-view-answers.js";
import { runningAgentsOf } from "./peer-running-agents-answer.js";
import type { RunningAgentEntry } from "../../agent-collaboration/running/running-agent-entry.js";
import { openPeerRunObservation, type OpenWebSocket } from "./peer-run-observation-client.js";
import type { DelegatingRunRef } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerNode } from "../domain/peer-node.js";
import type { PeerRefusal } from "../domain/peer-refusal.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { localRefusalText, peerRefusalText, REMOTE_REFUSAL, type PeerRefusalRouting } from "../domain/remote-refusals.js";
import type { DelegationWork } from "../../model-routing/domain/model-routing-types.js";
import {
  REMOTE_AGENT_PROJECTION_PATH,
  REMOTE_AGENT_STREAM_SNAPSHOT_PATH,
  REMOTE_AVAILABILITY_PATH,
  REMOTE_AVAILABLE_AGENTS_PATH,
  REMOTE_DELEGATED_RUN_STATES_PATH,
  REMOTE_PEER_RUN_MEMBERS_PATH,
  REMOTE_DELEGATED_RUNS_PATH,
  REMOTE_MESSAGES_PATH,
  REMOTE_OWNER_COMMANDS_PATH,
  REMOTE_RECEIVED_FILES_PATH,
  REMOTE_RECEIVED_FILES_STATUS_PATH,
  REMOTE_RUN_OBSERVATIONS_PATH,
  REMOTE_RUN_MESSAGES_PATH,
  REMOTE_RUN_SUMMARIES_PATH,
  REMOTE_RUNNING_AGENTS_PATH,
  type AgentProjectionRequest,
  type DeliverRemoteMessageRequest,
  type DeliverRunMessageRequest,
  type DelegatedRunStateRequest,
  type PeerRunMembersRequest,
  type OwnerCommandRequest,
  type RemoteRefusalTarget,
  type RunSummariesRequest,
  type StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import { availableCollaboratorEntry, type AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { PeerIdentityProbe } from "../settings/peer-directory.js";
import { transportFailureReason, type TransportFailureReason } from "./transport-failure-reason.js";
import { peerRequestTarget, signPeerRequest } from "./peer-request-signature.js";
import type {
  PeerPairingExchangeAnswer,
  PeerPairingExchangeRequest,
  PeerPairingExchangeTransport,
} from "../settings/peer-pairing-service.js";
import { REMOTE_PEER_PAIRING_EXCHANGES_PATH } from "../domain/remote-requests.js";

/** QR-102: a call to a peer answers or is refused within this bound, under the runtimes' tool-call timeouts (A-11). */
export const PEER_REQUEST_TIMEOUT_MS = 20_000;
/**
 * autobyteus-32 QR-001: the start request gets its own bound, so the peer's routing (≤ 40 s) and its start fit inside it,
 * under the runtimes' tool-call time-outs (Codex 60 s).
 */
export const PEER_START_REQUEST_TIMEOUT_MS = 50_000;
/** autobyteus-587: one file piece (≤ 8 MiB) gets its own bound, for a slow upload link (8 MiB at 1 MiB/s is 8 s). */
export const PEER_FILE_PIECE_TIMEOUT_MS = 120_000;

/** A request body of raw bytes (a file piece, autobyteus-587), sent with PUT; every other body is JSON, sent with POST. */
class RawPeerBody { constructor(readonly bytes: Buffer) {} }

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

type PeerAnswer = Readonly<{ accepted: boolean; nodeId?: unknown; code?: unknown; message?: unknown; target?: unknown; [field: string]: unknown }>;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;

/** The peer's status of the files asked about, read strictly: one entry per file, in order; `null` when malformed. */
const receivedFilesOf = (answer: PeerAnswer, asked: readonly Readonly<{ sha256: string }>[]) => {
  if (!count(answer.maxFileBytes) || !Array.isArray(answer.files) || answer.files.length !== asked.length) return null;
  const files = answer.files.map((value: unknown, index) => {
    const file = value as { sha256?: unknown; receivedBytes?: unknown; complete?: unknown } | null;
    return file && file.sha256 === asked[index]!.sha256 && count(file.receivedBytes) && typeof file.complete === "boolean"
      ? Object.freeze({ sha256: file.sha256, receivedBytes: file.receivedBytes, complete: file.complete }) : null;
  });
  return files.some((file) => file === null) ? null
    : Object.freeze({ accepted: true as const, maxFileBytes: answer.maxFileBytes, files: Object.freeze(files as NonNullable<(typeof files)[number]>[]) });
};

/**
 * What the peer started, read strictly from its accepted answer (autobyteus-247 G-7): an Agent run, or a Team run
 * whose coordinator is one of its members. Anything else is `null` (a malformed answer).
 */
/** The peer's launches, read strictly: each agent's address, runtime, model and a valid launch source; null when malformed. */

const startedRunOf = (answer: PeerAnswer): Exclude<RemoteStartedRun, { accepted: false }> | null => {
  const launches = launchesOf(answer.launches);
  if (!launches) return null;
  if (answer.kind === "agent") return nonEmpty(answer.agentRunId) ? Object.freeze({ accepted: true as const, kind: "agent" as const, agentRunId: answer.agentRunId, launches }) : null;
  if (answer.kind !== "agent_team" || !nonEmpty(answer.teamRunId) || !nonEmpty(answer.coordinatorAddress) || !Array.isArray(answer.members)) return null;
  const members = answer.members.map((member: unknown) => {
    const entry = member as { address?: unknown; agentRunId?: unknown } | null;
    return entry && nonEmpty(entry.address) && nonEmpty(entry.agentRunId) ? Object.freeze({ address: entry.address, agentRunId: entry.agentRunId }) : null;
  });
  if (!members.length || members.some((member) => member === null) || !members.some((member) => member!.address === answer.coordinatorAddress)) return null;
  return Object.freeze({ accepted: true as const, kind: "agent_team" as const, teamRunId: answer.teamRunId, coordinatorAddress: answer.coordinatorAddress,
    members: Object.freeze(members as Readonly<{ address: string; agentRunId: string }>[]), launches });
};

const isKind = (value: unknown): value is "agent" | "agent_team" => value === "agent" || value === "agent_team";
const ENTRY_FIELDS = new Set(["name", "kind", "address", "description"]);

/**
 * A peer's offer, read strictly (autobyteus-261 N-401): this parser, not the entry builder, decides what a peer may
 * send. Each entry has exactly `name`, `kind`, `address` and, optionally, a string `description`; an entry with any
 * other field (for example `members`) or a missing one makes the whole answer malformed (`null`).
 */
const availableAgentsOf = (answer: PeerAnswer): readonly AvailableCollaboratorEntry[] | null => {
  if (!Array.isArray(answer.agents)) return null;
  const entries = answer.agents.map((value: unknown) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const entry = value as Record<string, unknown>;
    if (Object.keys(entry).some((key) => !ENTRY_FIELDS.has(key))) return null;
    if (!nonEmpty(entry.name) || !isKind(entry.kind) || !nonEmpty(entry.address) || !entry.address.startsWith("/")) return null;
    if (entry.description !== undefined && typeof entry.description !== "string") return null;
    return availableCollaboratorEntry({ name: entry.name, kind: entry.kind, address: entry.address, description: entry.description as string | undefined });
  });
  return entries.some((entry) => entry === null) ? null : Object.freeze(entries as AvailableCollaboratorEntry[]);
};

/** The refused target, when the peer named a valid one (`{kind, name}`); anything else is left out. */
const refusalTargetOf = (value: unknown): RemoteRefusalTarget | undefined => {
  const target = value as { kind?: unknown; name?: unknown } | null;
  return target && typeof target === "object" && isKind(target.kind) && nonEmpty(target.name)
    ? Object.freeze({ kind: target.kind, name: target.name }) : undefined;
};

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);

/** The plain cause of an identity probe that got no answer (the settings error the Nodes page words itself). */
const PROBE_FAILURE_TEXT: Readonly<Record<TransportFailureReason, string>> = Object.freeze({
  refused: "nothing answers at that address and port",
  timeout: "it did not answer in time",
  not_found: "its host name cannot be found",
  unreachable: "it cannot be reached from this node",
});

/**
 * Outbound transport to peer nodes (design § Contract Between Nodes). It applies this node's switch and the
 * peer registration, sends the envelope `{fromNodeId, toNodeId}` with a bounded timeout, refuses an answer
 * whose `nodeId` is not the pinned one (a different server behind the URL), and maps every failure to a
 * refusal the agent reads. It knows nothing about runs and never retries (QR-101). Every request to a peer is signed
 * with the pair's peer secret (node access model NA-9); the secret itself is never sent.
 */
export class PeerClient implements RemoteRunChannel, PeerIdentityProbe, PeerPairingExchangeTransport {
  constructor(private readonly dependencies: Readonly<{
    peers: Readonly<{
      findByName(name: string): Promise<PeerNode | null>;
      findByNodeId(nodeId: string): Promise<PeerNode | null>;
      peerSecret(nodeId: string): Promise<string | null>;
    }>;
    capability: Readonly<{ isEnabled(): boolean }>;
    ownNodeId(): Promise<string>;
    timeoutMs?: number;
    fetch?: FetchLike;
    /** The WebSocket client of observation streams (the runtime's `WebSocket` by default). */
    openWebSocket?: OpenWebSocket;
  }>) {}

  async findPeer(name: string): Promise<PeerNodeRef | PeerRefusal> {
    if (!this.dependencies.capability.isEnabled()) return refusal(REMOTE_REFUSAL.OFF, localRefusalText.off());
    const peer = await this.dependencies.peers.findByName(name);
    return peer
      ? Object.freeze({ nodeId: peer.nodeId, name: peer.name })
      : refusal(REMOTE_REFUSAL.PEER_NOT_REGISTERED, localRefusalText.peerNotRegistered(name.trim()));
  }

  async peerName(nodeId: string): Promise<string> {
    return (await this.registeredPeerName(nodeId)) ?? nodeId;
  }

  async registeredPeerName(nodeId: string): Promise<string | null> {
    return (await this.dependencies.peers.findByNodeId(nodeId))?.name ?? null;
  }

  async startDelegatedRun(input: Readonly<{
    nodeId: string; address: string; delegatorAgentRunId: string; delegatingRun: DelegatingRunRef; work: DelegationWork;
  }>): Promise<RemoteStartedRun> {
    return this.call(input.nodeId, REMOTE_DELEGATED_RUNS_PATH, (envelope): StartDelegatedRunRequest => ({
      ...envelope,
      address: input.address,
      delegator: { agentRunId: input.delegatorAgentRunId },
      delegatingRun: { kind: input.delegatingRun.kind, runId: input.delegatingRun.runId },
      task: { text: input.work.text, title: input.work.task.title, taskKey: input.work.task.taskKey,
        projectId: input.work.task.projectId, taskId: input.work.task.taskId },
    }), "did not answer in time", (answer, peer) => startedRunOf(answer)
      ?? refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the run it started")),
    PEER_START_REQUEST_TIMEOUT_MS);
  }

  /** autobyteus-261: whether the peer takes this node's requests now (accepted), or the refusal that says why not. */
  checkAvailability(nodeId: string): Promise<Readonly<{ accepted: true }> | PeerRefusal> {
    return this.call(nodeId, REMOTE_AVAILABILITY_PATH, (envelope) => ({ ...envelope }), "did not answer in time",
      () => Object.freeze({ accepted: true as const }));
  }

  /** autobyteus-261: what the peer offers for delegation; a malformed answer is unreachable ("without its list"). */
  listAvailableAgents(nodeId: string): Promise<Readonly<{ accepted: true; agents: readonly AvailableCollaboratorEntry[] }> | PeerRefusal> {
    return this.call(nodeId, REMOTE_AVAILABLE_AGENTS_PATH, (envelope) => ({ ...envelope }), "did not answer in time", (answer, peer) => {
      const agents = availableAgentsOf(answer);
      return agents ? Object.freeze({ accepted: true as const, agents })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without its list"));
    });
  }

  /** autobyteus-492: the peer's running runs a person started; a malformed answer is unreachable ("without its list"). */
  runningAgents(nodeId: string): Promise<Readonly<{ accepted: true; agents: readonly RunningAgentEntry[] }> | PeerRefusal> {
    return this.call(nodeId, REMOTE_RUNNING_AGENTS_PATH, (envelope) => ({ ...envelope }), "did not answer in time", (answer, peer) => {
      const agents = runningAgentsOf(answer.agents);
      return agents ? Object.freeze({ accepted: true as const, agents })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without its list"));
    });
  }

  /** A linked message or work packet (`messages`, its root named), or a message by run ID only (`run-messages`, autobyteus-492). */
  async deliverMessage(input: RemoteMessageTransmission): Promise<RemoteMessageReceipt> {
    const timeoutText = "did not answer in time; the message may have been delivered";
    // The receiving agent's address, read strictly (autobyteus-565): a string or null, else the answer is malformed.
    const receipt = (answer: PeerAnswer, peer: PeerNode): RemoteMessageReceipt => answer.receiverAddress === null || nonEmpty(answer.receiverAddress)
      ? Object.freeze({ accepted: true as const, receiverAddress: answer.receiverAddress as string | null })
      : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the receiving agent"));
    const files = input.files.map((file) => ({ sha256: file.sha256, size: file.size, name: file.name }));
    if (input.kind === "run_message") {
      return this.call(input.nodeId, REMOTE_RUN_MESSAGES_PATH, (envelope): DeliverRunMessageRequest => ({
        ...envelope, messageId: input.messageId, sender: { agentRunId: input.senderAgentRunId, address: input.senderAddress },
        target: { agentRunId: input.targetAgentRunId }, content: input.content, messageType: input.messageType, createdAt: input.createdAt, files,
      }), timeoutText, receipt);
    }
    return this.call(input.nodeId, REMOTE_MESSAGES_PATH, (envelope): DeliverRemoteMessageRequest => ({
      ...envelope,
      kind: input.kind,
      ...(input.messageId ? { messageId: input.messageId } : {}),
      sender: { agentRunId: input.senderAgentRunId, address: input.senderAddress },
      targetRoot: { kind: input.targetRoot.kind, runId: input.targetRoot.runId },
      target: { agentRunId: input.targetAgentRunId },
      content: input.content,
      messageType: input.messageType,
      createdAt: input.createdAt,
      files,
    }), timeoutText, receipt);
  }

  /** autobyteus-587: what the peer holds of these files, and its per-file limit; a malformed answer is unreachable. */
  receivedFilesStatus(nodeId: string, files: readonly Readonly<{ sha256: string; size: number }>[]): Promise<ReceivedFilesStatusReceipt> {
    return this.call(nodeId, REMOTE_RECEIVED_FILES_STATUS_PATH, (envelope) => ({
      ...envelope, files: files.map((file) => ({ sha256: file.sha256, size: file.size })),
    }), "did not answer in time", (answer, peer) => receivedFilesOf(answer, files)
      ?? refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the files' status")));
  }

  /** autobyteus-587: one piece of a file, raw bytes in a signed PUT (the envelope in its query, NA-9). */
  putReceivedFilePiece(input: Readonly<{ nodeId: string; sha256: string; offset: number; size: number; bytes: Buffer }>): Promise<ReceivedFilePieceReceipt> {
    const query = (envelope: Readonly<{ fromNodeId: string; toNodeId: string }>) => new URLSearchParams({
      fromNodeId: envelope.fromNodeId, toNodeId: envelope.toNodeId, offset: String(input.offset), size: String(input.size) });
    return this.call(input.nodeId, (envelope) => `${REMOTE_RECEIVED_FILES_PATH}/${input.sha256}?${query(envelope)}`, () => new RawPeerBody(input.bytes),
      "did not answer in time", (answer, peer) => count(answer.receivedBytes) && typeof answer.complete === "boolean"
        ? Object.freeze({ accepted: true as const, receivedBytes: answer.receivedBytes, complete: answer.complete })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the bytes it holds")),
      PEER_FILE_PIECE_TIMEOUT_MS);
  }

  /** autobyteus-278: titles and statuses of runs this node's delegation started on that peer; a malformed answer is unreachable. */
  runSummaries(nodeId: string, runs: readonly RemoteStartedRunRef[]): Promise<RemoteRunSummaries> {
    return this.call(nodeId, REMOTE_RUN_SUMMARIES_PATH, (envelope): RunSummariesRequest => ({
      ...envelope, runs: runs.map((run) => ({ kind: run.kind, runId: run.runId })),
    }), "did not answer in time", (answer, peer) => {
      const summaries = remoteRunSummariesOf(answer);
      return summaries ? Object.freeze({ accepted: true as const, runs: summaries })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the runs"));
    });
  }

  /** autobyteus-278: one agent's stored conversation in a run this node's delegation started. */
  agentProjection(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string): Promise<RemoteAgentProjectionAnswer> {
    return this.call(nodeId, REMOTE_AGENT_PROJECTION_PATH, (envelope): AgentProjectionRequest => ({
      ...envelope, targetRoot: { kind: targetRoot.kind, runId: targetRoot.runId }, agentRunId,
    }), "did not answer in time", (answer, peer) => {
      const projection = remoteAgentProjectionOf(answer.projection);
      return projection ? Object.freeze({ accepted: true as const, projection })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the conversation"));
    });
  }

  /** autobyteus-591 DN-2: the run's Task state on this node; the peer answers once it applied it (closed: stopped). */
  deliveredRunState(nodeId: string, run: RemoteStartedRunRef, open: boolean): Promise<RemoteDeliveryReceipt> {
    return this.call(nodeId, REMOTE_DELEGATED_RUN_STATES_PATH, (envelope): DelegatedRunStateRequest => ({
      ...envelope, run: { kind: run.kind, runId: run.runId }, open,
    }), "did not answer in time; the state may have been applied", () => Object.freeze({ accepted: true as const }));
  }

  /** FU-003 (DS-007): a Team run the delegating node started here changed its members; that node updates its record. */
  deliveredRunMembers(nodeId: string, run: RemoteStartedRunRef, team: RemoteRunMembers): Promise<RemoteDeliveryReceipt> {
    return this.call(nodeId, REMOTE_PEER_RUN_MEMBERS_PATH, (envelope): PeerRunMembersRequest => ({
      ...envelope, run: { kind: run.kind, runId: run.runId }, coordinatorAddress: team.coordinatorAddress,
      members: team.members.map((member) => ({ address: member.address, agentRunId: member.agentRunId })),
    }), "did not answer in time; it is reconciled at the next contact", () => Object.freeze({ accepted: true as const }));
  }

  /** autobyteus-278: a command of this node's owner for one agent of such a run. */
  ownerCommand(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string, command: RemoteOwnerCommand): Promise<RemoteDeliveryReceipt> {
    return this.call(nodeId, REMOTE_OWNER_COMMANDS_PATH, (envelope): OwnerCommandRequest => ({
      ...envelope, targetRoot: { kind: targetRoot.kind, runId: targetRoot.runId }, agentRunId, command,
    }), "did not answer in time; the command may have been applied", () => Object.freeze({ accepted: true as const }));
  }

  /**
   * autobyteus-278: the run's live output. The peer's first frame must name the pinned node (N-401); a refusal, a
   * different node or any failure ends the stream (`onEnd`), which never reconnects (DEC-807).
   */
  observeRun(nodeId: string, targetRoot: RemoteTargetRoot, observer: RemoteRunObserver): RemoteRunObservationStream {
    return openPeerRunObservation({
      resolvePeer: async () => this.dependencies.capability.isEnabled() ? this.dependencies.peers.findByNodeId(nodeId) : null,
      peerSecret: (peerNodeId) => this.dependencies.peers.peerSecret(peerNodeId),
      ownNodeId: this.dependencies.ownNodeId,
      path: REMOTE_RUN_OBSERVATIONS_PATH,
      targetRoot,
      observer,
      openWebSocket: this.dependencies.openWebSocket,
      openingTimeoutMs: this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS,
    });
  }

  /** autobyteus-461 SR-088: one agent's own stream snapshot on its node. */
  agentStreamSnapshot(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string): Promise<RemoteAgentStreamSnapshotAnswer> {
    return this.call(nodeId, REMOTE_AGENT_STREAM_SNAPSHOT_PATH, (envelope): AgentProjectionRequest => ({
      ...envelope, targetRoot: { kind: targetRoot.kind, runId: targetRoot.runId }, agentRunId,
    }), "did not answer in time", (answer, peer) => {
      const record = (value: unknown) => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
      const snapshot = record(answer.snapshot), status = record(answer.status);
      return snapshot && status ? Object.freeze({ accepted: true as const, snapshot, status })
        : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the snapshot"));
    });
  }

  /** autobyteus-461 SR-088: one agent's own numbered frames, on the observation route opened for the agent. */
  observeAgentStream(nodeId: string, targetRoot: RemoteTargetRoot, agentRunId: string, observer: RemoteAgentStreamObserver): RemoteRunObservationStream {
    return openPeerRunObservation({
      resolvePeer: async () => this.dependencies.capability.isEnabled() ? this.dependencies.peers.findByNodeId(nodeId) : null,
      peerSecret: (peerNodeId) => this.dependencies.peers.peerSecret(peerNodeId),
      ownNodeId: this.dependencies.ownNodeId,
      path: REMOTE_RUN_OBSERVATIONS_PATH,
      targetRoot,
      observer: { onFrame: () => undefined, onEnd: () => observer.onEnd() },
      agentStream: { agentRunId, onFrame: (liveSequenceId, frame) => observer.onFrame(liveSequenceId, frame) },
      openWebSocket: this.dependencies.openWebSocket,
      openingTimeoutMs: this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS,
    });
  }

  /**
   * `PeerIdentityProbe`: the node ID behind a URL, read from its public status route (DS-004). Only a
   * transport failure or a timeout is `PEER_UNREACHABLE`, with its classified `reason` (one-nodes-tab REQ-707); a
   * server that answered with anything but its identity (another status, a page that is not JSON, JSON without
   * `nodeId`) is not an AutoByteus node (CR-002).
   */
  async fetchNodeId(baseUrl: string): Promise<string> {
    const unreachable = (error: unknown) => {
      const reason = transportFailureReason(error);
      return new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${baseUrl} could not be reached: ${PROBE_FAILURE_TEXT[reason]}.`,
        { reason, address: baseUrl });
    };
    const notAutobyteus = () => new RemoteCollaborationSettingsError("PEER_NOT_AUTOBYTEUS", `${baseUrl} is not an AutoByteus node.`);
    const response = await this.fetchJson(`${baseUrl}/rest/remote-access/status`, { method: "GET" })
      .catch((error: unknown) => { throw unreachable(error); });
    if (await isNodeIdentityPendingAnswer(response)) {
      throw new RemoteCollaborationSettingsError("NODE_IDENTITY_NOT_MIGRATED", `${baseUrl}: ${NODE_IDENTITY_NOT_MIGRATED_TEXT}`, { address: baseUrl });
    }
    if (response.status === 403) {
      // A node's Host gate refuses a name it does not serve (autobyteus-426 REQ-020); any other 403 is not a node's status.
      const refused = await response.json().catch(() => null) as { code?: unknown } | null;
      if (refused?.code === "REMOTE_ACCESS_HOST_REFUSED") {
        const host = new URL(baseUrl).hostname;
        throw new RemoteCollaborationSettingsError("PEER_HOST_REFUSED",
          `${baseUrl} refuses the name ${host}; add it to AUTOBYTEUS_ALLOWED_HOSTS on that node.`, { address: baseUrl, host });
      }
      throw notAutobyteus();
    }
    if (!response.ok) throw notAutobyteus();
    let answer: unknown;
    try {
      answer = await response.json();
    } catch (error) {
      // The body stopped arriving in time is still the transport; a body that is not JSON is an answer.
      throw transportFailureReason(error) === "timeout" ? unreachable(error) : notAutobyteus();
    }
    const id = (answer as { nodeId?: unknown } | null)?.nodeId;
    if (typeof id !== "string" || !/^srv_[A-Za-z0-9_-]{32,}$/.test(id)) throw notAutobyteus();
    return id;
  }

  /**
   * `PeerPairingExchangeTransport`: calls the inviting node's pairing exchange at `baseUrl` (unsigned: the two nodes
   * share no secret yet). A refusal becomes the settings error the Nodes page words.
   */
  async exchangePeerInvite(baseUrl: string, request: PeerPairingExchangeRequest): Promise<PeerPairingExchangeAnswer> {
    let response: Awaited<ReturnType<PeerClient["fetchJson"]>>;
    try {
      response = await this.fetchJson(`${baseUrl}${REMOTE_PEER_PAIRING_EXCHANGES_PATH}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(request),
      }, PEER_START_REQUEST_TIMEOUT_MS);
    } catch (error) {
      const reason = transportFailureReason(error);
      throw new RemoteCollaborationSettingsError("PEER_UNREACHABLE", `${baseUrl} could not be reached: ${PROBE_FAILURE_TEXT[reason]}.`,
        { reason, address: baseUrl });
    }
    const answer = await response.json().catch(() => null) as { nodeId?: unknown; peerSecret?: unknown; code?: unknown; message?: unknown } | null;
    if (response.ok && typeof answer?.nodeId === "string" && typeof answer.peerSecret === "string" && answer.peerSecret) {
      return Object.freeze({ nodeId: answer.nodeId, peerSecret: answer.peerSecret });
    }
    const message = typeof answer?.message === "string" ? answer.message : `The node at ${baseUrl} refused the pairing (HTTP ${response.status}).`;
    throw new RemoteCollaborationSettingsError(answer?.code === "PEER_INVITE_INVALID" ? "PEER_INVITE_INVALID" : "PEER_PAIRING_REFUSED", message, { address: baseUrl });
  }

  private async call<TResult>(
    nodeId: string,
    path: string | ((envelope: Readonly<{ fromNodeId: string; toNodeId: string }>) => string),
    body: (envelope: Readonly<{ fromNodeId: string; toNodeId: string }>) => object | RawPeerBody,
    timeoutText: string,
    accepted: (answer: PeerAnswer, peer: PeerNode) => TResult | PeerRefusal,
    timeoutMs: number = this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS,
  ): Promise<TResult | PeerRefusal> {
    if (!this.dependencies.capability.isEnabled()) return refusal(REMOTE_REFUSAL.OFF, localRefusalText.off());
    const peer = await this.dependencies.peers.findByNodeId(nodeId);
    if (!peer) {
      return refusal(REMOTE_REFUSAL.PEER_NOT_REGISTERED, `The node of that run (${nodeId}) is no longer a registered peer of this node, so nothing was sent.`);
    }
    const unreachable = (detail: string, reason?: TransportFailureReason) =>
      refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, detail), reason);
    let fromNodeId: string;
    try {
      fromNodeId = await this.dependencies.ownNodeId();
    } catch (error) {
      if (error instanceof NodeIdentityNotMigratedError) {
        return refusal(REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, localRefusalText.nodeIdentityPending());
      }
      throw error;
    }
    const secret = await this.dependencies.peers.peerSecret(peer.nodeId);
    const notPaired = () => refusal(REMOTE_REFUSAL.PEER_NOT_PAIRED, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_NOT_PAIRED, ""));
    const identityMismatch = () => refusal(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, ""));
    if (!secret) return notPaired();
    let answer: PeerAnswer;
    try {
      const envelope = { fromNodeId, toNodeId: peer.nodeId };
      const built = body(envelope);
      const requestBody = built instanceof RawPeerBody ? new Uint8Array(built.bytes) : JSON.stringify(built);
      const method = built instanceof RawPeerBody ? "PUT" : "POST";
      const { url, pathWithQuery } = peerRequestTarget(peer.baseUrl, typeof path === "string" ? path : path(envelope));
      const response = await this.fetchJson(url.toString(), {
        method,
        headers: {
          "content-type": built instanceof RawPeerBody ? "application/octet-stream" : "application/json",
          ...signPeerRequest({ secret, method, pathWithQuery, fromNodeId, toNodeId: peer.nodeId,
            body: built instanceof RawPeerBody ? built.bytes : requestBody as string }),
        },
        body: requestBody,
      }, timeoutMs);
      if (await isNodeIdentityPendingAnswer(response)) {
        return refusal(REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, peerRefusalText(peer.name, REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, ""));
      }
      // The gate there does not accept this node's signature: either the peer has no secret for this node (unpaired
      // there), or the address now reaches another node, whose gate refuses a request signed for the peer (NA-9).
      if (response.status === 401) return await this.answersAs(peer) ? notPaired() : identityMismatch();
      if (!response.ok) return unreachable(`it answered HTTP ${response.status}`);
      answer = await response.json() as PeerAnswer;
    } catch (error) {
      const reason = transportFailureReason(error);
      return unreachable(reason === "timeout" ? `it ${timeoutText}` : messageOf(error), reason);
    }
    if (!answer || typeof answer !== "object" || answer.nodeId !== peer.nodeId) return identityMismatch();
    if (answer.accepted !== true) {
      const code = typeof answer.code === "string" ? answer.code : REMOTE_REFUSAL.BAD_REQUEST;
      return refusal(code, peerRefusalText(peer.name, code, typeof answer.message === "string" ? answer.message : "no reason given",
        refusalTargetOf(answer.target), refusalRoutingOf(answer)));
    }
    return accepted(answer, peer);
  }

  /** Whether the peer's address still answers with the peer's node ID (its exempt status route). */
  private async answersAs(peer: PeerNode): Promise<boolean> {
    return this.fetchNodeId(peer.baseUrl).then((nodeId) => nodeId === peer.nodeId, () => true);
  }

  private fetchJson(url: string, init: RequestInit, timeoutMs: number = this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS) {
    const timeout = AbortSignal.timeout(timeoutMs);
    return (this.dependencies.fetch ?? fetch)(url, { ...init, signal: timeout });
  }
}

/**
 * autobyteus-290 N-910: another node answered that its identity is waiting for its data migration (HTTP 503 with
 * `NODE_IDENTITY_NOT_MIGRATED`); every other non-OK answer keeps its meaning.
 */
const isNodeIdentityPendingAnswer = async (response: Pick<Response, "json" | "status">): Promise<boolean> => {
  if (response.status !== 503) return false;
  // Only a 503 is read here; a non-OK answer's body is not read again.
  const answer = await response.json().catch(() => null) as { code?: unknown } | null;
  return answer?.code === REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED;
};

/** The peer's Model Routing state and failed agent on a refusal (autobyteus-32), read leniently: a malformed one is left out. */
const refusalRoutingOf = (answer: PeerAnswer): PeerRefusalRouting => {
  const state = answer.modelRouting as { state?: unknown; reason?: unknown } | undefined;
  const modelRouting = state?.state === "off" ? { state: "off" as const }
    : state?.state === "not_active" && nonEmpty(state.reason) ? { state: "not_active" as const, reason: state.reason } : undefined;
  return { ...(modelRouting ? { modelRouting } : {}), ...(nonEmpty(answer.agentName) ? { agentName: answer.agentName } : {}) };
};

const refusal = (code: string, message: string, reason?: TransportFailureReason): PeerRefusal =>
  Object.freeze({ accepted: false as const, code, message, ...(reason ? { reason } : {}) });
