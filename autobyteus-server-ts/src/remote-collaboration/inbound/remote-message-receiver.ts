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
import type { RunAgentAccess } from "../../agent-collaboration/execution/remote/run-agent-access.js";
import type { PeerHandlerRefusal, RemoteMessageHandler } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { DeliverRemoteMessageRequest, DeliverRunMessageRequest } from "../domain/remote-requests.js";
import type { ReceivedFiles } from "./received-files.js";
import { REFERENCE_FILE_REFUSAL_TEXT } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import type { TransferredFile } from "../../agent-collaboration/execution/remote/transferred-files.js";
import type { ClosedDelegations } from "./closed-delegations.js";

/** A collaboration root that admits messages from its linked runs on peer nodes (all three root kinds). */
export type RemoteMessageRoot = Readonly<{ acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
/** autobyteus-492: a live root (any kind) that admits a peer agent's message by run ID only, for an agent it runs now. */
export type RemotePeerRunRoot = Readonly<{ acceptPeerRunMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
/** A root a peer started (a standalone root or a Team root), which also admits the work packet that starts it. */
export type RemoteDelegationRoot = RemoteMessageRoot & Readonly<{ acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> }>;

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
  standalone(agentRunId: string): Promise<RemoteDelegationRoot | null>;
  team(teamRunId: string): Promise<RemoteDelegationRoot | null>;
  org(orgRunId: string): Promise<RemoteMessageRoot | null>;
  /**
   * autobyteus-278 (AR-401): a run a peer started, by its kind, as this node serves that peer's owner: each kind's
   * own source of output, commands and readiness, offered by its manager. Callers check the link first.
   */
  runAgents(kind: "agent" | "agent_team"): RunAgentAccess;
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
/** The root's answer on the wire: accepted with the receiving agent's address (autobyteus-565), or the refusal. */
const answerOf = (result: AgentOperationResult) => result.accepted
  ? Object.freeze({ accepted: true as const, receiverAddress: result.agentAddress ?? null })
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
    /**
     * autobyteus-591 S-5: a peer-started run its delegating node's linked message or work reached is open again, so its
     * closed-delegation record goes (this covers an "open" notice still in flight).
     */
    private readonly closedDelegations: Pick<ClosedDelegations, "openedBy">,
    /** autobyteus-587: every file a message or work packet names is complete here before any root sees it. */
    private readonly receivedFiles: Pick<ReceivedFiles, "verify">,
  ) {}

  /** A file the request names is not complete in this node's received files (RF-5): nothing is delivered. */
  private async missingFile(files: readonly TransferredFile[]): Promise<PeerHandlerRefusal | null> {
    const verified = await this.receivedFiles.verify(files);
    return verified.ok ? null : refusal(REMOTE_REFUSAL.REFERENCE_FILE_CHECK_FAILED, REFERENCE_FILE_REFUSAL_TEXT.notReceived(verified.name));
  }

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
    const missing = await this.missingFile(request.files);
    if (missing) return missing;
    return answerOf(await root.acceptPeerRunMessage({
      fromNodeId: from.nodeId,
      fromNodeName: from.name,
      senderAddress: request.sender.address,
      message: {
        messageId: request.messageId, senderAgentRunId: request.sender.agentRunId, receiverAgentRunId: target,
        content: request.content, messageType: request.messageType, referenceFiles: [], createdAt: request.createdAt,
      },
      files: request.files,
    }));
  }

  async accept(request: DeliverRemoteMessageRequest, from: PeerNode) {
    const query: RemoteInboundQuery = Object.freeze({
      kind: request.kind, fromNodeId: from.nodeId, senderAgentRunId: request.sender.agentRunId, targetAgentRunId: request.target.agentRunId,
    });
    const stored = await this.resolve(() => this.roots.storedLinkCheck(request.targetRoot, query));
    if (stored === "not_linked") return notLinked();
    if (stored !== "proceed") return notFound();
    // autobyteus-587 (RF-5): every file it names arrived complete, before any root sees it.
    const missing = await this.missingFile(request.files);
    if (missing) return missing;
    if (request.kind === "work_packet") {
      const root = await this.resolve(() => this.delegationRoot(request.targetRoot));
      if (!root) return notFound();
      const accepted = await root.acceptRemoteWorkPacket({
        fromNodeId: from.nodeId, fromNodeName: from.name, senderAgentRunId: request.sender.agentRunId,
        targetAgentRunId: request.target.agentRunId, description: request.content, files: request.files,
      });
      // The packet is the run's first message: its description (not the task notification built here) is the title.
      // Not awaited on the answer path; a failure is logged, as on the window's path.
      if (accepted.accepted) {
        await this.reopened(request.targetRoot, from);
        void this.titles.recordFirstMessage(request.targetRoot, request.content).catch((error: unknown) => {
          console.warn(`Failed to record the title of run '${request.targetRoot.runId}': ${String(error)}`);
        });
        void this.decisions.workArrived(request.targetRoot.runId);
      }
      return answerOf(accepted);
    }
    const root = await this.resolve(() => this.messageRoot(request.targetRoot));
    if (!root) return notFound();
    const accepted = await root.acceptRemoteMessage({
      fromNodeId: from.nodeId,
      fromNodeName: from.name,
      senderAddress: request.sender.address,
      message: {
        messageId: request.messageId!,
        senderAgentRunId: request.sender.agentRunId,
        receiverAgentRunId: request.target.agentRunId,
        content: request.content,
        messageType: request.messageType,
        referenceFiles: [],
        createdAt: request.createdAt,
      },
      files: request.files,
    });
    if (accepted.accepted) await this.reopened(request.targetRoot, from);
    return answerOf(accepted);
  }

  /** S-5: the run took its delegating node's message or work, so it is open (an Org root is never a peer-started run). */
  private async reopened(root: RemoteTargetRoot, from: PeerNode): Promise<void> {
    if (root.kind === "agent_org") return;
    await this.closedDelegations.openedBy({ kind: root.kind, runId: root.runId }, from.nodeId)
      .catch((error: unknown) => console.warn("CLOSED_DELEGATIONS_WRITE_FAILED", { run: root, error: String(error) }));
  }

  /** The root a peer started: only Agents and Agent Teams are started for a peer. */
  private delegationRoot(root: RemoteTargetRoot): Promise<RemoteDelegationRoot | null> {
    switch (root.kind) {
      case "agent": return this.roots.standalone(root.runId);
      case "agent_team": return this.roots.team(root.runId);
      case "agent_org": return Promise.resolve(null);
    }
  }

  private messageRoot(root: RemoteTargetRoot): Promise<RemoteMessageRoot | null> {
    return root.kind === "agent_org" ? this.roots.org(root.runId) : this.delegationRoot(root);
  }

  /**
   * A root that cannot be found, checked or restored is `null` (the sender reads "not found"); why it failed is logged here,
   * on the node that owns it (CRR-004: a restore refusal was otherwise invisible).
   */
  private async resolve<T>(find: () => Promise<T | null>): Promise<T | null> {
    try { return await find(); } catch (error) {
      console.warn("REMOTE_TARGET_ROOT_UNAVAILABLE", { error: error instanceof Error ? error.message : String(error) });
      return null;
    }
  }
}
