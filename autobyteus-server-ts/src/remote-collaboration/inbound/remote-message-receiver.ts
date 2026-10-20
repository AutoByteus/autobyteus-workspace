import type { AgentOperationResult } from "../../agent-execution/domain/agent-operation-result.js";
import type {
  RemoteInboundMessage,
  RemoteInboundWorkPacket,
} from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { TaskAgentCoordinatingRun } from "../../run-history/store/agent-run-metadata-types.js";
import type { PeerHandlerRefusal, RemoteMessageHandler } from "../channel/peer-gateway.js";
import type { PeerNode } from "../domain/peer-node.js";
import { REMOTE_REFUSAL } from "../domain/remote-refusals.js";
import type { DeliverRemoteMessageRequest } from "../domain/remote-requests.js";

/** A collaboration root that admits messages from its linked runs on peer nodes (all three root kinds). */
export type RemoteMessageRoot = Readonly<{ acceptRemoteMessage(input: RemoteInboundMessage): Promise<AgentOperationResult> }>;
/** A standalone root, which also admits the work packet of a peer's delegation to its host. */
export type RemoteStandaloneRoot = RemoteMessageRoot & Readonly<{ acceptRemoteWorkPacket(input: RemoteInboundWorkPacket): Promise<AgentOperationResult> }>;

/**
 * The roots of this node by run ID, through the root managers' public resolve / restore APIs (A-05). `null`
 * when there is no such root (deleted history, or a run that cannot be one).
 */
export type RemoteRootDirectory = Readonly<{
  standalone(hostRunId: string): Promise<RemoteStandaloneRoot | null>;
  team(teamRunId: string): Promise<RemoteMessageRoot | null>;
  org(orgRunId: string): Promise<RemoteMessageRoot | null>;
}>;

const notFound = (): PeerHandlerRefusal => Object.freeze({ accepted: false, code: REMOTE_REFUSAL.TARGET_NOT_FOUND, message: "That run does not exist on this node." });
const answerOf = (result: AgentOperationResult) => result.accepted
  ? Object.freeze({ accepted: true as const })
  : Object.freeze({ accepted: false as const, code: result.code ?? "REMOTE_MESSAGE_NOT_ACCEPTED", message: result.message ?? "The message was not accepted." });

/**
 * Resolves the root an inbound message is for and hands it over (DS-002, DS-003). A work packet or a message
 * without `coordinatingRun` is for a run this node runs for a peer: its own standalone root (restored if
 * needed). A message with `coordinatingRun` is for the run on this node that delegated: the coordinating root
 * it names, restored if it is not active (RSK-107). The root applies the link check.
 */
export class RemoteMessageReceiver implements RemoteMessageHandler {
  constructor(private readonly roots: RemoteRootDirectory) {}

  async accept(request: DeliverRemoteMessageRequest, from: PeerNode) {
    if (request.kind === "work_packet") {
      const root = await this.resolve(() => this.roots.standalone(request.target.agentRunId));
      if (!root) return notFound();
      return answerOf(await root.acceptRemoteWorkPacket({
        fromNodeId: from.nodeId, fromNodeName: from.name, senderAgentRunId: request.sender.agentRunId,
        targetAgentRunId: request.target.agentRunId, description: request.content,
      }));
    }
    const root = await this.resolve(() => request.coordinatingRun
      ? this.coordinatingRoot(request.coordinatingRun)
      : this.roots.standalone(request.target.agentRunId));
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

  private coordinatingRoot(run: TaskAgentCoordinatingRun): Promise<RemoteMessageRoot | null> {
    switch (run.kind) {
      case "agent": return this.roots.standalone(run.runId);
      case "agent_team": return this.roots.team(run.runId);
      case "agent_org": return this.roots.org(run.runId);
    }
  }

  /** A root that cannot be found or restored is `null` (the sender reads "not found"). */
  private async resolve<T>(find: () => Promise<T | null>): Promise<T | null> {
    try { return await find(); } catch { return null; }
  }
}
