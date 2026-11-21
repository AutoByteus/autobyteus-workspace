import { ROOT_NOT_ACTIVE_MESSAGE } from "../../agent-collaboration/execution/task/task-delegation-command.js";
import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import { AgentRunManager } from "../../agent-execution/services/agent-run-manager.js";
import type { AgentRunMessageSenderContext } from "../domain/agent-run-message-sender.js";
import {
  buildDirectAgentRunInputMessage,
  buildDirectAgentRunInterAgentEvent,
  buildDirectAgentRunMessageId,
} from "./global-agent-run-message-runtime-builders.js";
import {
  ActiveCollaborationRootDirectory,
  getActiveCollaborationRootDirectory,
} from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { sameRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { notDeliveredAfterReopen, type CrossRunMessageDelivery } from "../../agent-collaboration/communication/cross-run-message-delivery.js";
import type { OutgoingFiles } from "../../agent-collaboration/execution/remote/outgoing-files.js";
import type { PeerRunNodes } from "../../agent-collaboration/execution/remote/peer-run-nodes.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { PeerNodeRef, RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
import { deliverMessageToPeerRun } from "./peer-run-message-delivery.js";
import { REMOTE_REFUSAL, REMOTE_ROOT_REFUSAL_TEXT } from "../../agent-collaboration/execution/remote/remote-refusal-codes.js";
import {
  SEND_MESSAGE_TO_NODE_NEEDS_COLLABORATION_RUN,
  targetAgentNotRunningText,
  targetIsTeamRunText,
} from "../../agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

export type GlobalAgentRunMessageDeliveryInput = {
  sender: AgentRunMessageSenderContext;
  targetAgentRunId: string;
  /** autobyteus-492: the paired peer node the target runs on, by this node's name for it; absent for this node. */
  node?: string;
  content: string;
  messageType?: string | null;
  referenceFiles?: string[] | null;
  /** How the sender named the receiver, when by address (the result's "Delivered message to …"). */
  shownAs?: string;
};

type ActiveRunLookup = Pick<AgentRunManager, "getActiveRun">;

const normalizeRequired = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const normalizeMessageType = (value: string | null | undefined): string => {
  const normalized = value?.trim();
  return normalized ? normalized : "agent_message";
};

const normalizeReferenceFiles = (referenceFiles: string[] | null | undefined): string[] =>
  Array.isArray(referenceFiles) ? [...referenceFiles] : [];

const notRunning = (targetAgentRunId: string): AgentOperationResult =>
  ({ accepted: false, code: "TARGET_AGENT_RUN_NOT_ACTIVE", message: targetAgentNotRunningText(targetAgentRunId) });

/**
 * `send_message_to(target_agent_run_id)`: the order of target resolution for a run-ID message (autobyteus-492: the run ID
 * is the address, CM-13). Without `node`: the sender's own root; another run of this node (`CrossRunMessageDelivery`:
 * Task-related, or any running agent); a team run's ID (refused with its coordinator's); a live run without a
 * collaboration root (a direct post); else "not running". Before any path, `PeerRunNodes` checks the target's node
 * (autobyteus-587 RF-14: a run on another node is always named with `node`; the wrong one, or a node no longer paired,
 * is refused). With `node` the router owns one order (SR-010 R1), so nothing changes before every file is on that node:
 * the peer → the node rule → `OutgoingFiles.send` (every local check, then the whole upload) → the Task admission
 * (`admitPeerRun`, autobyteus-591 DN-9: the assigner's message continues a closed run; others are refused) → the
 * sender's root sends it with the files' descriptors → after a reopen, a refusal says the Task is open again.
 */
export class GlobalAgentRunMessageRouter {
  constructor(private readonly deps: {
    agentRunManager?: ActiveRunLookup;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
    /** Messages between two runs of this node (DS-2, DS-003) and the closed-Task admission of a peer run; the composition root's. */
    crossRun: Pick<CrossRunMessageDelivery, "route" | "admitPeerRun">;
    /** autobyteus-587 RF-14: the node a target is on, checked before any path (its one owner). */
    nodes: Pick<PeerRunNodes, "check">;
    /** autobyteus-587: a message's reference files, uploaded to the peer before anything else changes (SR-010 R1). */
    outgoing: Pick<OutgoingFiles, "send">;
    /** A team run's coordinator when the team does not run (R-12, SR-071): the tree, its one owner. */
    coordinators: Pick<DelegationIndex, "teamCoordinatorOf">;
    /** This node's channel to its peers (`null` where it has none): `findPeer` for `node` (DS-004). */
    channel(): RemoteRunChannel | null;
  }) {}

  async deliver(input: GlobalAgentRunMessageDeliveryInput): Promise<AgentOperationResult> {
    const targetAgentRunId = normalizeRequired(input.targetAgentRunId, "targetAgentRunId");
    const content = normalizeRequired(input.content, "content");
    const messageType = normalizeMessageType(input.messageType);
    const referenceFiles = normalizeReferenceFiles(input.referenceFiles);
    // With `node`: the peer first (the same refusals as `delegate_task` with `node`).
    let peer: PeerNodeRef | null = null;
    if (input.node !== undefined) {
      const found = await this.peerOf(input, input.node);
      if ("accepted" in found) return found;
      peer = found;
    }
    // autobyteus-587 RF-14: the target's node, read only, before any path. Without `node` a run known on a peer stops here,
    // so the paths below never reach one (nor need 591's admission).
    const wrongNode = await this.deps.nodes.check({ sender: input.sender.memberExecutionContext?.identity ?? null, targetAgentRunId, node: peer });
    if (wrongNode) return wrongNode;
    if (peer) return this.deliverToPeer(input, peer, targetAgentRunId, content, messageType, referenceFiles);

    // A sender inside a collaboration root reaches every AgentRun of that root
    // through the root boundary, which restores a shut-down delegated child first.
    // Targets outside the sender's root use the live-only path below.
    const senderRoot = input.sender.memberExecutionContext
      ? this.activeRootDirectory.resolve(input.sender.memberExecutionContext.identity.root)
      : null;
    if (senderRoot?.ownsAgentRun(targetAgentRunId)) {
      const result = await senderRoot.deliverExactAgentMessage({
        sender: Object.freeze({
          kind: "agent",
          identity: input.sender.memberExecutionContext!.identity,
          displayName: input.sender.senderName,
        }),
        targetAgentRunId,
        content,
        messageType,
        referenceFiles,
      });
      return result.accepted ? { ...result, agentRunId: targetAgentRunId } : result;
    }

    // DS-2, DS-003: an agent of another run of this node: Task-related (CrossRunMessageDelivery: the tree's rule, the
    // receiver restored when stopped), or any other agent while it runs (never woken); both runs' logs.
    const crossRun = input.sender.memberExecutionContext ? this.deps.crossRun : null;
    if (crossRun) {
      const routed = await crossRun.route({ sender: input.sender.memberExecutionContext!.identity, senderDisplayName: input.sender.senderName,
        targetAgentRunId, content, messageType, referenceFiles, ...(input.shownAs ? { shownAs: input.shownAs } : {}) });
      if (routed) return routed;
    }

    // send_message_to talks with agents only: a task agent team's ID is refused with its coordinator's ID, whether the
    // team runs or not (R-12, SR-071).
    const coordinator = this.activeRootDirectory.findTeamCoordinator(targetAgentRunId) ?? await this.deps.coordinators.teamCoordinatorOf(targetAgentRunId);
    if (coordinator) {
      return { accepted: false, code: "TARGET_IS_TEAM_RUN", message: targetIsTeamRunText(targetAgentRunId, coordinator) };
    }

    const targetRun = this.agentRunManager.getActiveRun(targetAgentRunId);
    if (!targetRun) return notRunning(targetAgentRunId);

    const senderTeam = input.sender.memberExecutionContext;
    const targetTeam = targetRun.config.memberExecutionContext;
    if (
      senderTeam &&
      targetTeam &&
      sameRootExecutionIdentity(senderTeam.identity.root, targetTeam.identity.root)
    ) {
      // The sender's root is not active, so same-root delivery is unavailable.
      return { accepted: false, code: "COLLABORATION_ROOT_NOT_ACTIVE", message: ROOT_NOT_ACTIVE_MESSAGE };
    }
    // An agent of a collaboration root that no live root runs (CrossRunMessageDelivery found none): not running for a
    // collaboration sender. A direct post stays only between runs without a collaboration root on one side.
    if (senderTeam && targetTeam) return notRunning(targetAgentRunId);

    const messageId = buildDirectAgentRunMessageId();
    const createdAt = new Date().toISOString();
    const runtimeInput = {
      sender: input.sender,
      targetAgentRunId,
      content,
      messageType,
      referenceFiles,
      createdAt,
      messageId,
    };
    const postResult = await targetRun.postUserMessage(
      buildDirectAgentRunInputMessage(runtimeInput),
    );
    let publicationError: unknown = null;
    if (postResult.accepted) {
      try {
        await targetRun.publishEvent(buildDirectAgentRunInterAgentEvent(runtimeInput));
      } catch (error) {
        publicationError = error;
      }
    }

    if (!postResult.accepted) {
      return {
        ...postResult,
        code: postResult.code ?? "TARGET_AGENT_RUN_REJECTED_INPUT",
        message: postResult.message
          ? `The agent '${targetAgentRunId}' did not accept the message: ${postResult.message}`
          : `The agent '${targetAgentRunId}' did not accept the message.`,
      };
    }

    return {
      ...postResult,
      accepted: true,
      agentRunId: targetAgentRunId,
      code: publicationError
        ? "DELIVERED_EVENT_PUBLICATION_FAILED"
        : postResult.code ?? "DELIVERED",
      message: publicationError
        ? `Message was accepted by ${targetAgentRunId}, but outward event publication failed: ${String(publicationError)}`
        : postResult.message ?? `Delivered message to ${targetAgentRunId}.`,
    };
  }

  /** DS-004: the peer `node` names, by this node's name for it (the same refusals as `delegate_task` with `node`). */
  private async peerOf(input: GlobalAgentRunMessageDeliveryInput, node: string): Promise<PeerNodeRef | AgentOperationResult> {
    if (!input.sender.memberExecutionContext) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: SEND_MESSAGE_TO_NODE_NEEDS_COLLABORATION_RUN };
    const channel = this.deps.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    return channel.findPeer(node.trim());
  }

  /**
   * DS-004: `send_message_to(node, run ID)`, after the node rule (SR-010 R1): the files go first (a refused file or a failed
   * upload changes nothing), then the Task admission of a peer run (DN-9: it may reopen it and tell its node), then the
   * sender's root sends the message with the files' descriptors. After a reopen, a refusal says the Task is open again.
   */
  private async deliverToPeer(input: GlobalAgentRunMessageDeliveryInput, peer: PeerNodeRef, targetAgentRunId: string, content: string,
    messageType: string, referenceFiles: string[]): Promise<AgentOperationResult> {
    const sender = input.sender.memberExecutionContext!.identity;
    const sent = await this.deps.outgoing.send({ senderAgentRunId: sender.agentRunId, nodeId: peer.nodeId, peerName: peer.name, referenceFiles });
    if (!sent.ok) return sent.refusal;
    const admission = await this.deps.crossRun.admitPeerRun({ agentRunId: targetAgentRunId, senderAgentRunId: sender.agentRunId });
    if (typeof admission !== "string") return admission;
    const result = await deliverMessageToPeerRun({ activeRoots: this.activeRootDirectory }, {
      sender, senderDisplayName: input.sender.senderName, nodeId: peer.nodeId, targetAgentRunId, content, messageType, referenceFiles, files: sent.files,
    });
    return admission === "reopened" && !result.accepted ? notDeliveredAfterReopen(result, targetAgentRunId) : result;
  }

  private get agentRunManager(): ActiveRunLookup {
    return this.deps.agentRunManager ?? AgentRunManager.getInstance();
  }

  private get activeRootDirectory(): ActiveCollaborationRootDirectory {
    return this.deps.activeRootDirectory ?? getActiveCollaborationRootDirectory();
  }

}
