import { NodeIdentityNotMigratedError, NODE_IDENTITY_NOT_MIGRATED_TEXT } from "../../remote-access/services/node-identity-service.js";
import type {
  RemoteAgentProjectionAnswer,
  RemoteDeliveryReceipt,
  RemoteMessageTransmission,
  RemoteOwnerCommand,
  PeerNodeRef,
  RemoteRunChannel,
  RemoteRunObservationStream,
  RemoteRunObserver,
  RemoteRunSummaries,
  RemoteStartedRun,
  RemoteStartedRunRef,
  RemoteTargetRoot,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { remoteAgentProjectionOf, remoteRunSummariesOf } from "./peer-run-view-answers.js";
import { openPeerRunObservation, type OpenWebSocket } from "./peer-run-observation-client.js";
import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerNode } from "../domain/peer-node.js";
import type { PeerRefusal } from "../domain/peer-refusal.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { localRefusalText, peerRefusalText, REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import {
  REMOTE_AGENT_PROJECTION_PATH,
  REMOTE_AVAILABILITY_PATH,
  REMOTE_AVAILABLE_AGENTS_PATH,
  REMOTE_DELEGATED_RUNS_PATH,
  REMOTE_MESSAGES_PATH,
  REMOTE_OWNER_COMMANDS_PATH,
  REMOTE_RUN_OBSERVATIONS_PATH,
  REMOTE_RUN_SUMMARIES_PATH,
  type AgentProjectionRequest,
  type DeliverRemoteMessageRequest,
  type OwnerCommandRequest,
  type RemoteRefusalTarget,
  type RunSummariesRequest,
  type StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import { availableCollaboratorEntry, type AvailableCollaboratorEntry } from "../../agent-collaboration/collaborators/available-collaborator-entry.js";
import type { PeerIdentityProbe } from "../settings/peer-directory.js";
import { transportFailureReason, type TransportFailureReason } from "./transport-failure-reason.js";

/** QR-102: a call to a peer answers or is refused within this bound, under the runtimes' tool-call timeouts (A-11). */
export const PEER_REQUEST_TIMEOUT_MS = 20_000;

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

type PeerAnswer = Readonly<{ accepted: boolean; nodeId?: unknown; code?: unknown; message?: unknown; target?: unknown; [field: string]: unknown }>;

const nonEmpty = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;

/**
 * What the peer started, read strictly from its accepted answer (autobyteus-247 G-7): an Agent run, or a Team run
 * whose coordinator is one of its members. Anything else is `null` (a malformed answer).
 */
const startedRunOf = (answer: PeerAnswer): Exclude<RemoteStartedRun, { accepted: false }> | null => {
  if (answer.kind === "agent") return nonEmpty(answer.agentRunId) ? Object.freeze({ accepted: true as const, kind: "agent" as const, agentRunId: answer.agentRunId }) : null;
  if (answer.kind !== "agent_team" || !nonEmpty(answer.teamRunId) || !nonEmpty(answer.coordinatorAddress) || !Array.isArray(answer.members)) return null;
  const members = answer.members.map((member: unknown) => {
    const entry = member as { address?: unknown; agentRunId?: unknown } | null;
    return entry && nonEmpty(entry.address) && nonEmpty(entry.agentRunId) ? Object.freeze({ address: entry.address, agentRunId: entry.agentRunId }) : null;
  });
  if (!members.length || members.some((member) => member === null) || !members.some((member) => member!.address === answer.coordinatorAddress)) return null;
  return Object.freeze({ accepted: true as const, kind: "agent_team" as const, teamRunId: answer.teamRunId, coordinatorAddress: answer.coordinatorAddress,
    members: Object.freeze(members as Readonly<{ address: string; agentRunId: string }>[]) });
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
 * refusal the agent reads. It knows nothing about runs and never retries (QR-101). It carries no credential.
 */
export class PeerClient implements RemoteRunChannel, PeerIdentityProbe {
  constructor(private readonly dependencies: Readonly<{
    peers: Readonly<{ findByName(name: string): Promise<PeerNode | null>; findByNodeId(nodeId: string): Promise<PeerNode | null> }>;
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
    return (await this.dependencies.peers.findByNodeId(nodeId))?.name ?? nodeId;
  }

  async startDelegatedRun(input: Readonly<{
    nodeId: string; address: string; delegatorAgentRunId: string; coordinatingRun: TaskAgentCoordinatingRun;
  }>): Promise<RemoteStartedRun> {
    return this.call(input.nodeId, REMOTE_DELEGATED_RUNS_PATH, (envelope): StartDelegatedRunRequest => ({
      ...envelope,
      address: input.address,
      delegator: { agentRunId: input.delegatorAgentRunId },
      coordinatingRun: { kind: input.coordinatingRun.kind, runId: input.coordinatingRun.runId },
    }), "did not answer in time", (answer, peer) => startedRunOf(answer)
      ?? refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without the run it started")));
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

  async deliverMessage(input: RemoteMessageTransmission): Promise<RemoteDeliveryReceipt> {
    return this.call(input.nodeId, REMOTE_MESSAGES_PATH, (envelope): DeliverRemoteMessageRequest => ({
      ...envelope,
      kind: input.kind,
      ...(input.messageId ? { messageId: input.messageId } : {}),
      sender: { agentRunId: input.senderAgentRunId },
      targetRoot: { kind: input.targetRoot.kind, runId: input.targetRoot.runId },
      target: { agentRunId: input.targetAgentRunId },
      content: input.content,
      messageType: input.messageType,
      createdAt: input.createdAt,
    }), "did not answer in time; the message may have been delivered", () => Object.freeze({ accepted: true as const }));
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
      ownNodeId: this.dependencies.ownNodeId,
      path: REMOTE_RUN_OBSERVATIONS_PATH,
      targetRoot,
      observer,
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

  private async call<TResult>(
    nodeId: string,
    path: string,
    body: (envelope: Readonly<{ fromNodeId: string; toNodeId: string }>) => object,
    timeoutText: string,
    accepted: (answer: PeerAnswer, peer: PeerNode) => TResult | PeerRefusal,
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
    let answer: PeerAnswer;
    try {
      const response = await this.fetchJson(`${peer.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body({ fromNodeId, toNodeId: peer.nodeId })),
      });
      if (await isNodeIdentityPendingAnswer(response)) {
        return refusal(REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, peerRefusalText(peer.name, REMOTE_REFUSAL.NODE_IDENTITY_NOT_MIGRATED, ""));
      }
      if (!response.ok) return unreachable(`it answered HTTP ${response.status}`);
      answer = await response.json() as PeerAnswer;
    } catch (error) {
      const reason = transportFailureReason(error);
      return unreachable(reason === "timeout" ? `it ${timeoutText}` : messageOf(error), reason);
    }
    if (!answer || typeof answer !== "object" || answer.nodeId !== peer.nodeId) {
      return refusal(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, ""));
    }
    if (answer.accepted !== true) {
      const code = typeof answer.code === "string" ? answer.code : REMOTE_REFUSAL.BAD_REQUEST;
      return refusal(code, peerRefusalText(peer.name, code, typeof answer.message === "string" ? answer.message : "no reason given",
        refusalTargetOf(answer.target)));
    }
    return accepted(answer, peer);
  }

  private fetchJson(url: string, init: RequestInit) {
    const timeout = AbortSignal.timeout(this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS);
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

const refusal = (code: string, message: string, reason?: TransportFailureReason): PeerRefusal =>
  Object.freeze({ accepted: false as const, code, message, ...(reason ? { reason } : {}) });
