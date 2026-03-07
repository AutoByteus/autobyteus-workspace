import type {
  RuntimeInterAgentRelayRequest,
  RuntimeInterAgentRelayResult,
} from "../../runtime-execution/runtime-adapter-port.js";
import type { TeamRuntimeInterAgentMessageRelay } from "../../runtime-execution/team-runtime-inter-agent-message-relay.js";
import type { TeamRuntimeBindingRegistry } from "./team-runtime-binding-registry.js";
import type { RelayInterAgentMessageInput } from "./team-member-runtime-orchestrator.types.js";
import {
  normalizeOptionalString,
  normalizeRequiredString,
} from "./team-member-runtime-errors.js";

export class TeamMemberRuntimeRelayService {
  constructor(
    private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry,
    private readonly teamRuntimeInterAgentMessageRelay: TeamRuntimeInterAgentMessageRelay,
  ) {}

  async relayInterAgentMessage(
    input: RelayInterAgentMessageInput,
  ): Promise<{ accepted: boolean; code?: string; message?: string }> {
    const sender = this.teamRuntimeBindingRegistry.resolveByMemberRunId(input.senderMemberRunId);
    if (!sender || sender.teamRunId !== input.teamRunId) {
      return {
        accepted: false,
        code: "SENDER_MEMBER_NOT_FOUND",
        message: `Sender member run '${input.senderMemberRunId}' is not bound to team '${input.teamRunId}'.`,
      };
    }

    const resolveResult = this.teamRuntimeBindingRegistry.resolveMemberBinding(
      input.teamRunId,
      input.recipientName,
    );
    if (!resolveResult.binding) {
      return {
        accepted: false,
        code: resolveResult.code,
        message: resolveResult.message,
      };
    }

    const relayResult = await this.teamRuntimeInterAgentMessageRelay.deliverInterAgentMessage({
      teamRunId: input.teamRunId,
      recipientMemberRunId: resolveResult.binding.memberRunId,
      senderAgentRunId: sender.binding.memberRunId,
      senderAgentName: normalizeOptionalString(input.senderAgentName) ?? sender.binding.memberName,
      recipientName: resolveResult.binding.memberName,
      messageType: normalizeOptionalString(input.messageType) ?? "agent_message",
      content: normalizeRequiredString(input.content, "content"),
      metadata: {
        senderMemberRouteKey: sender.binding.memberRouteKey,
        recipientMemberRouteKey: resolveResult.binding.memberRouteKey,
      },
    });

    if (!relayResult.accepted) {
      return {
        accepted: false,
        code: relayResult.code ?? "RECIPIENT_UNAVAILABLE",
        message:
          relayResult.message ??
          `Recipient '${resolveResult.binding.memberName}' is unavailable for inter-agent delivery.`,
      };
    }

    return { accepted: true };
  }

  async handleRuntimeInterAgentRelayRequest(
    request: RuntimeInterAgentRelayRequest,
  ): Promise<RuntimeInterAgentRelayResult> {
    const recipientNameRaw =
      request.toolArguments.recipient_name ??
      request.toolArguments.recipientName ??
      request.toolArguments.recipient;
    const contentRaw = request.toolArguments.content;
    const messageTypeRaw =
      request.toolArguments.message_type ?? request.toolArguments.messageType ?? "agent_message";

    if (typeof recipientNameRaw !== "string" || recipientNameRaw.trim().length === 0) {
      return {
        accepted: false,
        code: "RECIPIENT_NOT_FOUND_OR_AMBIGUOUS",
        message: "send_message_to requires a non-empty recipient_name.",
      };
    }
    if (typeof contentRaw !== "string" || contentRaw.trim().length === 0) {
      return {
        accepted: false,
        code: "INVALID_MESSAGE_CONTENT",
        message: "send_message_to requires a non-empty content field.",
      };
    }

    const resolvedTeamRunId =
      normalizeOptionalString(request.senderTeamRunId) ??
      this.teamRuntimeBindingRegistry.resolveByMemberRunId(request.senderRunId)?.teamRunId ??
      null;
    if (!resolvedTeamRunId) {
      return {
        accepted: false,
        code: "SENDER_MEMBER_NOT_FOUND",
        message: `Sender member run '${request.senderRunId}' is not mapped to an active team runtime binding.`,
      };
    }

    return this.relayInterAgentMessage({
      teamRunId: resolvedTeamRunId,
      senderMemberRunId: request.senderRunId,
      recipientName: recipientNameRaw,
      content: contentRaw,
      messageType: typeof messageTypeRaw === "string" ? messageTypeRaw : "agent_message",
      senderAgentName: request.senderMemberName,
    });
  }
}
