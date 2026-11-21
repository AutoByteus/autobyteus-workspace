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
import type { CrossRunMessageDelivery } from "../../agent-collaboration/communication/cross-run-message-delivery.js";
import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import type { RemoteRunChannel } from "../../agent-collaboration/execution/remote/remote-run-channel.js";
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
 * collaboration root (a direct post); else "not running". With `node`: the peer, the closed-Task admission of this node
 * (`closedPeerRunRefusal`), then the sender's root, which sends it to that node.
 */
export class GlobalAgentRunMessageRouter {
  constructor(private readonly deps: {
    agentRunManager?: ActiveRunLookup;
    activeRootDirectory?: ActiveCollaborationRootDirectory;
    /** Messages between two runs of this node (DS-2, DS-003) and the closed-Task admission of a peer run; the composition root's. */
    crossRun: Pick<CrossRunMessageDelivery, "route" | "closedPeerRunRefusal">;
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
    if (input.node !== undefined) return this.deliverToPeer(input, input.node, targetAgentRunId, content, messageType, referenceFiles);

    // A sender inside a collaboration root reaches every AgentRun of that root
    // through the root boundary, which restores a shut-down delegated child first.
    // Targets outside the sender's root use the live-only path below.
    const senderRoot = input.sender.memberExecutionContext
      ? this.activeRootDirectory.resolve(input.sender.memberExecutionContext.identity.root)
      : null;
    if (senderRoot?.hasAgentExecution(targetAgentRunId)) {
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

  /**
   * DS-004: `send_message_to(node, run ID)`. The peer by this node's name for it (the same refusals as `delegate_task`
   * with `node`), this node's closed-Task admission of that run (AR-001), then the sender's root sends it to that node.
   */
  private async deliverToPeer(input: GlobalAgentRunMessageDeliveryInput, node: string, targetAgentRunId: string, content: string,
    messageType: string, referenceFiles: string[]): Promise<AgentOperationResult> {
    const context = input.sender.memberExecutionContext;
    if (!context) return { accepted: false, code: "COLLABORATION_CONTEXT_REQUIRED", message: SEND_MESSAGE_TO_NODE_NEEDS_COLLABORATION_RUN };
    const channel = this.deps.channel();
    if (!channel) return { accepted: false, code: REMOTE_REFUSAL.OFF, message: REMOTE_ROOT_REFUSAL_TEXT.off };
    const peer = await channel.findPeer(node.trim());
    if ("accepted" in peer) return peer;
    return deliverMessageToPeerRun({ crossRun: this.deps.crossRun, activeRoots: this.activeRootDirectory }, {
      sender: context.identity, senderDisplayName: input.sender.senderName, nodeId: peer.nodeId, targetAgentRunId, content, messageType, referenceFiles,
    });
  }

  private get agentRunManager(): ActiveRunLookup {
    return this.deps.agentRunManager ?? AgentRunManager.getInstance();
  }

  private get activeRootDirectory(): ActiveCollaborationRootDirectory {
    return this.deps.activeRootDirectory ?? getActiveCollaborationRootDirectory();
  }

}
