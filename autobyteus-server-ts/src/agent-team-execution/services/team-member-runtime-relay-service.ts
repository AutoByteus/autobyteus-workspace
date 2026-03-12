import type { RuntimeKind } from "../../runtime-management/runtime-kind.js";
import type {
  RuntimeInterAgentRelayRequest,
  RuntimeInterAgentRelayResult,
} from "../../runtime-execution/runtime-adapter-port.js";
import type { TeamRuntimeInterAgentMessageRelay } from "./team-runtime-inter-agent-message-relay.js";
import type { TeamRuntimeBindingRegistry } from "./team-runtime-binding-registry.js";
import type { RelayInterAgentMessageInput } from "./team-member-runtime-orchestrator.types.js";
import type { ChannelSourceContext } from "../../external-channel/domain/models.js";
import {
  normalizeOptionalString,
  normalizeRequiredString,
} from "./team-member-runtime-errors.js";

type ExternalCallbackPropagationPort = {
  getLatestSourceByDispatchTarget: (target: {
    agentRunId: string | null;
    teamRunId: string | null;
  }) => Promise<ChannelSourceContext | null>;
  getSourceByAgentRunTurn: (
    agentRunId: string,
    turnId: string,
  ) => Promise<ChannelSourceContext | null>;
  bindAcceptedTurnToSource: (input: {
    runId: string;
    runtimeKind: RuntimeKind;
    turnId: string | null;
    teamRunId?: string | null;
    source: ChannelSourceContext;
  }) => Promise<void>;
};

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export class TeamMemberRuntimeRelayService {
  constructor(
    private readonly teamRuntimeBindingRegistry: TeamRuntimeBindingRegistry,
    private readonly teamRuntimeInterAgentMessageRelay: TeamRuntimeInterAgentMessageRelay,
    private readonly externalCallbackPropagation?: ExternalCallbackPropagationPort,
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

    await this.propagateExternalSourceIfPresent({
      teamRunId: input.teamRunId,
      senderMemberRunId: sender.binding.memberRunId,
      senderTurnId: input.senderTurnId ?? null,
      recipientMemberRunId: resolveResult.binding.memberRunId,
      recipientRuntimeKind: resolveResult.binding.runtimeKind,
      recipientTurnId: relayResult.turnId ?? null,
    });

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
      senderTurnId: request.senderTurnId ?? null,
      recipientName: recipientNameRaw,
      content: contentRaw,
      messageType: typeof messageTypeRaw === "string" ? messageTypeRaw : "agent_message",
      senderAgentName: request.senderMemberName,
    });
  }

  private async propagateExternalSourceIfPresent(input: {
    teamRunId: string;
    senderMemberRunId: string;
    senderTurnId: string | null;
    recipientMemberRunId: string;
    recipientRuntimeKind: RuntimeKind;
    recipientTurnId: string | null;
  }): Promise<void> {
    if (!this.externalCallbackPropagation) {
      return;
    }

    const senderTurnId = normalizeOptionalString(input.senderTurnId);
    const recipientTurnId = normalizeOptionalString(input.recipientTurnId);
    if (!senderTurnId || !recipientTurnId) {
      return;
    }

    try {
      const recipientIsCoordinator =
        this.teamRuntimeBindingRegistry.isCoordinatorMemberRunId(
          input.teamRunId,
          input.recipientMemberRunId,
        );
      if (!recipientIsCoordinator) {
        return;
      }

      const source =
        (await this.externalCallbackPropagation.getSourceByAgentRunTurn(
          input.senderMemberRunId,
          senderTurnId,
        )) ??
        (await this.externalCallbackPropagation.getLatestSourceByDispatchTarget({
          agentRunId: null,
          teamRunId: input.teamRunId,
        }));
      if (!source) {
        return;
      }

      await this.externalCallbackPropagation.bindAcceptedTurnToSource({
        runId: input.recipientMemberRunId,
        runtimeKind: input.recipientRuntimeKind,
        turnId: recipientTurnId,
        teamRunId: input.teamRunId,
        source,
      });
    } catch (error) {
      logger.warn(
        `Team '${input.teamRunId}': failed propagating external callback linkage across inter-agent relay from '${input.senderMemberRunId}' to '${input.recipientMemberRunId}'.`,
        error,
      );
    }
  }
}
