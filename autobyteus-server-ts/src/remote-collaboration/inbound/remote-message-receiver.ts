import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type {
  RemoteInboundMessage,
  RemoteInboundQuery,
  RemoteInboundWorkPacket,
  StoredRemoteLinkCheck,
} from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteTargetRoot } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { PeerHandlerRefusal, RemoteMessageHandler } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { DeliverRemoteMessageRequest } from "../domain/remote-requests.js";

/** A collaboration root that admits messages from its linked runs on peer nodes (all three root kinds). */
export type RemoteMessageRoot = Readonly<{ acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
/** A root a peer started (a standalone root or a Team root), which also admits the work packet that starts it. */
export type RemoteHostRoot = RemoteMessageRoot & Readonly<{ acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> }>;

/**
 * The roots of this node by run ID, through the root managers' public resolve / restore APIs (A-05). `null`
 * when there is no such root (deleted history, or a run that cannot be one).
 */
export type RemoteRootDirectory = Readonly<{
  /**
   * N-303 / N-304: the request checked against the named root's stored links, without restoring or activating
   * anything. The root managers read their stores; this module parses no root files.
   */
  storedLinkCheck(targetRoot: RemoteTargetRoot, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck>;
  standalone(hostRunId: string): Promise<RemoteHostRoot | null>;
  team(teamRunId: string): Promise<RemoteHostRoot | null>;
  org(orgRunId: string): Promise<RemoteMessageRoot | null>;
}>;

const refusal = (code: string, message: string): PeerHandlerRefusal => Object.freeze({ accepted: false, code, message });
const notFound = () => refusal(REMOTE_REFUSAL.TARGET_NOT_FOUND, "That run does not exist on this node.");
const notLinked = () => refusal(REMOTE_REFUSAL.TARGET_NOT_PERMITTED, "That run is not linked with the sender.");
const answerOf = (result: AgentOperationResult) => result.accepted
  ? Object.freeze({ accepted: true as const })
  : Object.freeze({ accepted: false as const, code: result.code ?? "REMOTE_MESSAGE_NOT_ACCEPTED", message: result.message ?? "The message was not accepted." });

/**
 * Resolves the root an inbound request names (`targetRoot`, autobyteus-247 G-2) and hands it over (DS-002, DS-003):
 * one rule for both directions. A work packet is for a root a peer started (an Agent or a Team); a message is
 * for any root kind. An inactive root is checked against its stored links first (N-303), then restored; the
 * root's own link check stays the authority.
 */
export class RemoteMessageReceiver implements RemoteMessageHandler {
  constructor(private readonly roots: RemoteRootDirectory) {}

  async accept(request: DeliverRemoteMessageRequest, from: PeerNode) {
    const query: RemoteInboundQuery = Object.freeze({
      kind: request.kind, fromNodeId: from.nodeId, senderAgentRunId: request.sender.agentRunId, targetAgentRunId: request.target.agentRunId,
    });
    const stored = await this.resolve(() => this.roots.storedLinkCheck(request.targetRoot, query));
    if (stored === "not_linked") return notLinked();
    if (stored !== "proceed") return notFound();
    if (request.kind === "work_packet") {
      const root = await this.resolve(() => this.hostRoot(request.targetRoot));
      if (!root) return notFound();
      return answerOf(await root.acceptRemoteWorkPacket({
        fromNodeId: from.nodeId, fromNodeName: from.name, senderAgentRunId: request.sender.agentRunId,
        targetAgentRunId: request.target.agentRunId, description: request.content,
      }));
    }
    const root = await this.resolve(() => this.messageRoot(request.targetRoot));
    if (!root) return notFound();
    return answerOf(await root.acceptRemoteMessage({
      fromNodeId: from.nodeId,
      fromNodeName: from.name,
      message: {
        messageId: request.messageId!,
        senderAgentRunId: request.sender.agentRunId,
        receiverAgentRunId: request.target.agentRunId,
        content: request.content,
        messageType: request.messageType,
        referenceFiles: [],
        createdAt: request.createdAt,
      },
    }));
  }

  /** The root a peer started: only Agents and Agent Teams are started for a peer. */
  private hostRoot(root: RemoteTargetRoot): Promise<RemoteHostRoot | null> {
    switch (root.kind) {
      case "agent": return this.roots.standalone(root.runId);
      case "agent_team": return this.roots.team(root.runId);
      case "agent_org": return Promise.resolve(null);
    }
  }

  private messageRoot(root: RemoteTargetRoot): Promise<RemoteMessageRoot | null> {
    return root.kind === "agent_org" ? this.roots.org(root.runId) : this.hostRoot(root);
  }

  /** A root that cannot be found, checked or restored is `null` (the sender reads "not found"). */
  private async resolve<T>(find: () => Promise<T | null>): Promise<T | null> {
    try { return await find(); } catch { return null; }
  }
}
