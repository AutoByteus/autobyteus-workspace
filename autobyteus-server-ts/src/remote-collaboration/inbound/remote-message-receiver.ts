import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type { PeerStartedRunDecisions } from "./peer-started-run-decisions.js";
import type {
  RemoteInboundMessage,
  RemoteInboundQuery,
  RemoteInboundWorkPacket,
  StoredRemoteLinkCheck,
} from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { RemoteTargetRoot } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import type { RootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { remoteTargetNotRunning } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import { targetIsTeamRunText } from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";
import type { RunningAgents } from "../../agent-collaboration/running/running-agents.js";
import type { PairedAgentAccess } from "../../agent-collaboration/execution/remote/paired-agent-access.js";
import type { PeerHandlerRefusal, RemoteMessageHandler } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { DeliverRemoteMessageRequest, DeliverRunMessageRequest } from "../domain/remote-requests.js";

/** A collaboration root that admits messages from its linked runs on peer nodes (all three root kinds). */
export type RemoteMessageRoot = Readonly<{ acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
/** autobyteus-492: a live root (any kind) that admits a peer agent's message by run ID only, for an agent it runs now. */
export type RemotePeerRunRoot = Readonly<{ acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
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
  /**
   * autobyteus-278 (AR-401): a run a peer started, by its kind, as this node serves that peer's owner: each kind's
   * own source of output, commands and readiness, offered by its manager. Callers check the link first.
   */
  pairedAgents(kind: "agent" | "agent_team"): PairedAgentAccess;
  /** autobyteus-492: the root as it is live now, never restored; `null` when it is not active. */
  liveRoot(root: RootExecutionIdentity): RemotePeerRunRoot | null;
}>;

/**
 * Where an accepted work packet's content becomes the run's title (autobyteus-269): the run service of the root's kind,
 * which keeps the first non-empty title (a run's title is its first message, whoever sends it).
 */
export type RemoteRunTitles = Readonly<{ recordFirstMessage(root: RemoteTargetRoot, content: string): Promise<void> }>;

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
  constructor(
    private readonly roots: RemoteRootDirectory,
    private readonly titles: RemoteRunTitles,
    /** autobyteus-32: the decision records a run started for a peer keeps until its work packet arrives. */
    private readonly decisions: Pick<PeerStartedRunDecisions, "workArrived">,
    /** autobyteus-492: which live root runs an agent now, and a live team's coordinator. */
    private readonly running: Pick<RunningAgents, "rootOf" | "teamCoordinatorOf">,
  ) {}

  /**
   * autobyteus-492 DS-004 on the receiving node: a peer agent's message by run ID only (the run ID is the address, CM-13).
   * The running agent's live root accepts it in its gate, as from a one-message `unlinked_run` endpoint (its own log;
   * the header names the sender's node); nothing is restored or woken (DEC-003). A team run's ID is refused with the
   * coordinator's run ID when the team runs here (BEH-006); any other run ID is not running.
   */
  async acceptRunMessage(request: DeliverRunMessageRequest, from: PeerNode) {
    const target = request.target.agentRunId;
    const running = this.running.rootOf(target);
    const root = running ? this.roots.liveRoot(running.root) : null;
    if (!root) {
      const coordinator = this.running.teamCoordinatorOf(target);
      return coordinator ? refusal("TARGET_IS_TEAM_RUN", targetIsTeamRunText(target, coordinator)) : refusal(REMOTE_REFUSAL.TARGET_NOT_RUNNING, remoteTargetNotRunning(target).message);
    }
    return answerOf(await root.acceptPeerRunMessage({
      fromNodeId: from.nodeId,
      fromNodeName: from.name,
      message: {
        messageId: request.messageId, senderAgentRunId: request.sender.agentRunId, receiverAgentRunId: target,
        content: request.content, messageType: request.messageType, referenceFiles: [], createdAt: request.createdAt,
      },
    }));
  }

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
      const accepted = await root.acceptRemoteWorkPacket({
        fromNodeId: from.nodeId, fromNodeName: from.name, senderAgentRunId: request.sender.agentRunId,
        targetAgentRunId: request.target.agentRunId, description: request.content,
      });
      // The packet is the run's first message: its description (not the task notification built here) is the title.
      // Not awaited on the answer path; a failure is logged, as on the window's path.
      if (accepted.accepted) {
        void this.titles.recordFirstMessage(request.targetRoot, request.content).catch((error: unknown) => {
          console.warn(`Failed to record the title of run '${request.targetRoot.runId}': ${String(error)}`);
        });
        void this.decisions.workArrived(request.targetRoot.runId);
      }
      return answerOf(accepted);
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
