import type { TeamRoutingDispatchResult, TeamRoutingPort } from "autobyteus-ts";
import type {
  InterAgentMessageRequestEvent,
  ProcessUserMessageEvent,
  ToolApprovalTeamEvent,
} from "autobyteus-ts/agent-team/events/agent-team-events.js";
import { EnvelopeBuilder, type RunVersion, type TeamEnvelope } from "../envelope/envelope-builder.js";

type ForwardToHost = (envelope: TeamEnvelope) => Promise<void>;

export type WorkerUplinkRoutingAdapterOptions = {
  teamRunId: string;
  runVersion: RunVersion;
  forwardToHost: ForwardToHost;
  envelopeBuilder?: EnvelopeBuilder;
};

export class WorkerUplinkRoutingAdapter implements TeamRoutingPort {
  private readonly teamRunId: string;
  private readonly runVersion: RunVersion;
  private readonly forwardToHost: ForwardToHost;
  private readonly envelopeBuilder: EnvelopeBuilder;

  constructor(options: WorkerUplinkRoutingAdapterOptions) {
    this.teamRunId = options.teamRunId;
    this.runVersion = options.runVersion;
    this.forwardToHost = options.forwardToHost;
    this.envelopeBuilder = options.envelopeBuilder ?? new EnvelopeBuilder();
  }

  async dispatchUserMessage(event: ProcessUserMessageEvent): Promise<TeamRoutingDispatchResult> {
    return this.forward("USER_MESSAGE", {
      targetAgentName: event.targetAgentName,
      userMessage: event.userMessage,
    });
  }

  async dispatchInterAgentMessageRequest(
    event: InterAgentMessageRequestEvent
  ): Promise<TeamRoutingDispatchResult> {
    return this.forward("INTER_AGENT_MESSAGE_REQUEST", {
      senderAgentId: event.senderAgentId,
      recipientName: event.recipientName,
      content: event.content,
      messageType: event.messageType,
    });
  }

  async dispatchToolApproval(event: ToolApprovalTeamEvent): Promise<TeamRoutingDispatchResult> {
    return this.forward("TOOL_APPROVAL", {
      agentName: event.agentName,
      toolInvocationId: event.toolInvocationId,
      isApproved: event.isApproved,
      reason: event.reason ?? null,
    });
  }

  async dispatchControlStop(): Promise<TeamRoutingDispatchResult> {
    return this.forward("CONTROL_STOP", {});
  }

  private async forward(kind: string, payload: unknown): Promise<TeamRoutingDispatchResult> {
    try {
      const envelope = this.envelopeBuilder.buildEnvelope({
        teamRunId: this.teamRunId,
        runVersion: this.runVersion,
        kind,
        payload: {
          ...(typeof payload === "object" && payload !== null
            ? (payload as Record<string, unknown>)
            : { payload }),
        },
      });
      await this.forwardToHost(envelope);
      return { accepted: true };
    } catch (error) {
      return {
        accepted: false,
        errorCode: "FORWARD_FAILED",
        errorMessage: String(error),
      };
    }
  }
}
