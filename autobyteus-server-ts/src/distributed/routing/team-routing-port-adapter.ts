import type {
  TeamRoutingDispatchResult,
  TeamRoutingPort,
} from "autobyteus-ts";
import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { EnvelopeBuilder, type RunVersion, type TeamEnvelope } from "../envelope/envelope-builder.js";
import type { PlacementByMember } from "../member-placement/member-placement-resolver.js";

type DispatchRemoteEnvelope = (targetNodeId: string, envelope: TeamEnvelope) => Promise<void>;
type EnsureRemoteNodeReady = (targetNodeId: string) => Promise<void>;

type TeamRoutingPortAdapterOptions = {
  teamRunId: string;
  runVersion: RunVersion;
  localNodeId: string;
  placementByMember: PlacementByMember;
  dispatchRemoteEnvelope: DispatchRemoteEnvelope;
  dispatchLocalUserMessage: (event: ProcessUserMessageEvent) => Promise<void>;
  dispatchLocalInterAgentMessage: (event: InterAgentMessageRequestEvent) => Promise<void>;
  dispatchLocalToolApproval: (event: ToolApprovalTeamEvent) => Promise<void>;
  dispatchLocalControlStop?: () => Promise<void>;
  ensureRemoteNodeReady?: EnsureRemoteNodeReady;
  envelopeBuilder?: EnvelopeBuilder;
};

const rejected = (
  errorCode: string,
  errorMessage: string
): TeamRoutingDispatchResult => ({
  accepted: false,
  errorCode,
  errorMessage,
});

export class TeamRoutingPortAdapter implements TeamRoutingPort {
  private readonly teamRunId: string;
  private readonly runVersion: RunVersion;
  private readonly localNodeId: string;
  private readonly placementByMember: PlacementByMember;
  private readonly dispatchRemoteEnvelope: DispatchRemoteEnvelope;
  private readonly dispatchLocalUserMessage: (event: ProcessUserMessageEvent) => Promise<void>;
  private readonly dispatchLocalInterAgentMessage: (
    event: InterAgentMessageRequestEvent
  ) => Promise<void>;
  private readonly dispatchLocalToolApproval: (event: ToolApprovalTeamEvent) => Promise<void>;
  private readonly dispatchLocalControlStop?: () => Promise<void>;
  private readonly ensureRemoteNodeReady?: EnsureRemoteNodeReady;
  private readonly envelopeBuilder: EnvelopeBuilder;
  private readonly readyRemoteNodeIds = new Set<string>();
  private readonly readyRemoteNodeInFlight = new Map<string, Promise<void>>();

  constructor(options: TeamRoutingPortAdapterOptions) {
    this.teamRunId = options.teamRunId;
    this.runVersion = options.runVersion;
    this.localNodeId = options.localNodeId;
    this.placementByMember = options.placementByMember;
    this.dispatchRemoteEnvelope = options.dispatchRemoteEnvelope;
    this.dispatchLocalUserMessage = options.dispatchLocalUserMessage;
    this.dispatchLocalInterAgentMessage = options.dispatchLocalInterAgentMessage;
    this.dispatchLocalToolApproval = options.dispatchLocalToolApproval;
    this.dispatchLocalControlStop = options.dispatchLocalControlStop;
    this.ensureRemoteNodeReady = options.ensureRemoteNodeReady;
    this.envelopeBuilder = options.envelopeBuilder ?? new EnvelopeBuilder();
  }

  async dispatchUserMessage(event: ProcessUserMessageEvent): Promise<TeamRoutingDispatchResult> {
    const target = this.placementByMember[event.targetAgentName];
    if (!target) {
      return rejected(
        "TARGET_MEMBER_NOT_PLACED",
        `Target member '${event.targetAgentName}' does not exist in placement map.`
      );
    }

    try {
      if (target.nodeId === this.localNodeId) {
        await this.dispatchLocalUserMessage(event);
        return { accepted: true };
      }
      await this.ensureRemoteNodeReadyForRun(target.nodeId);

      await this.dispatchRemoteEnvelope(
        target.nodeId,
        this.envelopeBuilder.buildEnvelope({
          teamRunId: this.teamRunId,
          runVersion: this.runVersion,
          kind: "USER_MESSAGE",
          payload: {
            targetAgentName: event.targetAgentName,
            userMessage: event.userMessage,
          },
        })
      );
      return { accepted: true };
    } catch (error) {
      return rejected("DISPATCH_FAILED", String(error));
    }
  }

  async dispatchInterAgentMessageRequest(
    event: InterAgentMessageRequestEvent
  ): Promise<TeamRoutingDispatchResult> {
    const target = this.placementByMember[event.recipientName];
    if (!target) {
      return rejected(
        "TARGET_MEMBER_NOT_PLACED",
        `Recipient '${event.recipientName}' does not exist in placement map.`
      );
    }

    try {
      if (target.nodeId === this.localNodeId) {
        await this.dispatchLocalInterAgentMessage(event);
        return { accepted: true };
      }
      await this.ensureRemoteNodeReadyForRun(target.nodeId);

      await this.dispatchRemoteEnvelope(
        target.nodeId,
        this.envelopeBuilder.buildEnvelope({
          teamRunId: this.teamRunId,
          runVersion: this.runVersion,
          kind: "INTER_AGENT_MESSAGE_REQUEST",
          payload: {
            senderAgentId: event.senderAgentId,
            recipientName: event.recipientName,
            content: event.content,
            messageType: event.messageType,
          },
        })
      );
      return { accepted: true };
    } catch (error) {
      return rejected("DISPATCH_FAILED", String(error));
    }
  }

  async dispatchToolApproval(event: ToolApprovalTeamEvent): Promise<TeamRoutingDispatchResult> {
    const target = this.placementByMember[event.agentName];
    if (!target) {
      return rejected(
        "TARGET_MEMBER_NOT_PLACED",
        `Tool-approval target '${event.agentName}' does not exist in placement map.`
      );
    }

    try {
      if (target.nodeId === this.localNodeId) {
        await this.dispatchLocalToolApproval(event);
        return { accepted: true };
      }
      await this.ensureRemoteNodeReadyForRun(target.nodeId);

      await this.dispatchRemoteEnvelope(
        target.nodeId,
        this.envelopeBuilder.buildEnvelope({
          teamRunId: this.teamRunId,
          runVersion: this.runVersion,
          kind: "TOOL_APPROVAL",
          payload: {
            agentName: event.agentName,
            toolInvocationId: event.toolInvocationId,
            isApproved: event.isApproved,
            reason: event.reason ?? null,
          },
        })
      );
      return { accepted: true };
    } catch (error) {
      return rejected("DISPATCH_FAILED", String(error));
    }
  }

  async dispatchControlStop(): Promise<TeamRoutingDispatchResult> {
    const uniqueNodeIds = new Set(Object.values(this.placementByMember).map((item) => item.nodeId));
    try {
      for (const nodeId of uniqueNodeIds) {
        if (nodeId === this.localNodeId) {
          await this.dispatchLocalControlStop?.();
          continue;
        }
        await this.dispatchRemoteEnvelope(
          nodeId,
          this.envelopeBuilder.buildEnvelope({
            teamRunId: this.teamRunId,
            runVersion: this.runVersion,
            kind: "CONTROL_STOP",
            payload: {},
          }),
        );
      }
      return { accepted: true };
    } catch (error) {
      return rejected("DISPATCH_FAILED", String(error));
    }
  }

  private async ensureRemoteNodeReadyForRun(nodeId: string): Promise<void> {
    if (nodeId === this.localNodeId) {
      return;
    }
    if (this.readyRemoteNodeIds.has(nodeId)) {
      return;
    }
    const existingInFlight = this.readyRemoteNodeInFlight.get(nodeId);
    if (existingInFlight) {
      await existingInFlight;
      return;
    }
    const operation = (async () => {
      await this.ensureRemoteNodeReady?.(nodeId);
      this.readyRemoteNodeIds.add(nodeId);
    })();
    this.readyRemoteNodeInFlight.set(nodeId, operation);
    try {
      await operation;
    } finally {
      this.readyRemoteNodeInFlight.delete(nodeId);
    }
  }
}
