import type {
  RemoteChannelRefusal,
  RemoteDeliveryReceipt,
  RemoteMessageTransmission,
  RemotePeer,
  RemoteRunChannel,
  RemoteStartedRun,
} from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerNode } from "../domain/peer-node.js";
import { RemoteCollaborationSettingsError } from "../domain/remote-collaboration-settings-error.js";
import { localRefusalText, peerRefusalText, REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import {
  REMOTE_DELEGATED_RUNS_PATH,
  REMOTE_MESSAGES_PATH,
  type DeliverRemoteMessageRequest,
  type StartDelegatedRunRequest,
} from "../domain/remote-requests.js";
import type { PeerIdentityProbe } from "../settings/peer-directory.js";

/** QR-102: a call to a peer answers or is refused within this bound, under the runtimes' tool-call timeouts (A-11). */
export const PEER_REQUEST_TIMEOUT_MS = 20_000;

type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, "ok" | "status" | "json">>;

type PeerAnswer = Readonly<{ accepted: boolean; nodeId?: unknown; code?: unknown; message?: unknown; targetName?: unknown; agentRunId?: unknown }>;

const messageOf = (error: unknown): string => error instanceof Error ? error.message : String(error);
const isTimeout = (error: unknown): boolean => (error as { name?: string } | null)?.name === "TimeoutError"
  || (error as { name?: string } | null)?.name === "AbortError";

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
  }>) {}

  async findPeer(name: string): Promise<RemotePeer | RemoteChannelRefusal> {
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
    }), "did not answer in time", (answer, peer) => typeof answer.agentRunId === "string" && answer.agentRunId.trim()
      ? Object.freeze({ accepted: true as const, agentRunId: answer.agentRunId })
      : refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, "it answered without a run id")));
  }

  async deliverMessage(input: RemoteMessageTransmission): Promise<RemoteDeliveryReceipt> {
    return this.call(input.nodeId, REMOTE_MESSAGES_PATH, (envelope): DeliverRemoteMessageRequest => ({
      ...envelope,
      kind: input.kind,
      ...(input.messageId ? { messageId: input.messageId } : {}),
      sender: { agentRunId: input.senderAgentRunId },
      target: { agentRunId: input.targetAgentRunId },
      ...(input.coordinatingRun ? { coordinatingRun: { kind: input.coordinatingRun.kind, runId: input.coordinatingRun.runId } } : {}),
      content: input.content,
      messageType: input.messageType,
      createdAt: input.createdAt,
    }), "did not answer in time; the message may have been delivered", () => Object.freeze({ accepted: true as const }));
  }

  /**
   * `PeerIdentityProbe`: the server identity behind a URL, read from its public status route (DS-004). Only a
   * transport failure or a timeout is `PEER_UNREACHABLE`; a server that answered with anything but its identity
   * (another status, a page that is not JSON, JSON without `serverInstanceId`) is not an AutoByteus node (CR-002).
   */
  async fetchServerInstanceId(baseUrl: string): Promise<string> {
    const unreachable = (error: unknown) => new RemoteCollaborationSettingsError("PEER_UNREACHABLE",
      `${baseUrl} could not be reached: ${isTimeout(error) ? "it did not answer in time" : messageOf(error)}.`);
    const notAutobyteus = () => new RemoteCollaborationSettingsError("PEER_NOT_AUTOBYTEUS", `${baseUrl} is not an AutoByteus node.`);
    const response = await this.fetchJson(`${baseUrl}/rest/remote-access/status`, { method: "GET" })
      .catch((error: unknown) => { throw unreachable(error); });
    if (!response.ok) throw notAutobyteus();
    let answer: unknown;
    try {
      answer = await response.json();
    } catch (error) {
      // The body stopped arriving in time is still the transport; a body that is not JSON is an answer.
      throw isTimeout(error) ? unreachable(error) : notAutobyteus();
    }
    const id = (answer as { serverInstanceId?: unknown } | null)?.serverInstanceId;
    if (typeof id !== "string" || !/^srv_[A-Za-z0-9_-]{32,}$/.test(id)) throw notAutobyteus();
    return id;
  }

  private async call<TResult>(
    nodeId: string,
    path: string,
    body: (envelope: Readonly<{ fromNodeId: string; toNodeId: string }>) => object,
    timeoutText: string,
    accepted: (answer: PeerAnswer, peer: PeerNode) => TResult | RemoteChannelRefusal,
  ): Promise<TResult | RemoteChannelRefusal> {
    if (!this.dependencies.capability.isEnabled()) return refusal(REMOTE_REFUSAL.OFF, localRefusalText.off());
    const peer = await this.dependencies.peers.findByNodeId(nodeId);
    if (!peer) {
      return refusal(REMOTE_REFUSAL.PEER_NOT_REGISTERED, `The node of that run (${nodeId}) is no longer a registered peer of this node, so nothing was sent.`);
    }
    const unreachable = (detail: string) => refusal(REMOTE_REFUSAL.PEER_UNREACHABLE, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_UNREACHABLE, detail));
    let answer: PeerAnswer;
    try {
      const response = await this.fetchJson(`${peer.baseUrl}${path}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(body({ fromNodeId: await this.dependencies.ownNodeId(), toNodeId: peer.nodeId })),
      });
      if (!response.ok) return unreachable(`it answered HTTP ${response.status}`);
      answer = await response.json() as PeerAnswer;
    } catch (error) {
      return unreachable(isTimeout(error) ? `it ${timeoutText}` : messageOf(error));
    }
    if (!answer || typeof answer !== "object" || answer.nodeId !== peer.nodeId) {
      return refusal(REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, peerRefusalText(peer.name, REMOTE_REFUSAL.PEER_IDENTITY_MISMATCH, ""));
    }
    if (answer.accepted !== true) {
      const code = typeof answer.code === "string" ? answer.code : REMOTE_REFUSAL.BAD_REQUEST;
      return refusal(code, peerRefusalText(peer.name, code, typeof answer.message === "string" ? answer.message : "no reason given",
        typeof answer.targetName === "string" && answer.targetName.trim() ? answer.targetName : undefined));
    }
    return accepted(answer, peer);
  }

  private fetchJson(url: string, init: RequestInit) {
    const timeout = AbortSignal.timeout(this.dependencies.timeoutMs ?? PEER_REQUEST_TIMEOUT_MS);
    return (this.dependencies.fetch ?? fetch)(url, { ...init, signal: timeout });
  }
}

const refusal = (code: string, message: string): RemoteChannelRefusal => Object.freeze({ accepted: false, code, message });
