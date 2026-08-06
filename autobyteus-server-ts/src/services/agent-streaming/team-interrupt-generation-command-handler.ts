import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { selectorToRouteKey } from "../../agent-team-execution/domain/team-run-member-identity.js";
import {
  INTERRUPT_GENERATION_INVALID_TARGET_MESSAGE,
  INTERRUPT_GENERATION_MISSING_TARGET_MESSAGE,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  hasInvalidCommandSelectorFields,
  resolveInterruptGenerationTargetRunId,
  resolveInterruptGenerationTargetSelector,
} from "./team-command-selector-parser.js";
import { createErrorMessage, ServerMessage, ServerMessageType } from "./models.js";
import {
  buildInterruptGenerationCommandAck,
  normalizeInterruptCommandId,
} from "./interrupt-generation-command-ack.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export const handleTeamInterruptGenerationCommand = async (input: {
  teamRunId: string;
  payload: Record<string, unknown>;
  sink: AgentStreamServerMessageSink | null;
  activeRun: TeamRun | null;
}): Promise<void> => {
  const selector = resolveInterruptGenerationTargetSelector(input.payload);
  const memberRouteKey = selector ? selectorToRouteKey(selector) : "";
  const memberRunId = resolveInterruptGenerationTargetRunId(input.payload);
  const target = {
    target_kind: "team_member" as const,
    team_run_id: input.teamRunId,
    member_route_key: memberRouteKey,
    member_run_id: memberRunId,
  };
  const commandId = normalizeInterruptCommandId(input.payload.command_id);
  const sendAck = (ack: ReturnType<typeof buildInterruptGenerationCommandAck>) => {
    input.sink?.send(new ServerMessage(ServerMessageType.AGENT_COMMAND_ACK, ack));
  };
  if (!commandId) {
    sendAck(buildInterruptGenerationCommandAck({ commandId, target }));
    return;
  }

  const invalidTargetMessage = hasInvalidCommandSelectorFields(input.payload)
    ? INTERRUPT_GENERATION_INVALID_TARGET_MESSAGE
    : !selector
      ? INTERRUPT_GENERATION_MISSING_TARGET_MESSAGE
      : null;
  if (invalidTargetMessage) {
    input.sink?.send(createErrorMessage(
      TEAM_COMMAND_INVALID_TARGET_CODE,
      invalidTargetMessage,
    ));
    sendAck(buildInterruptGenerationCommandAck({
      commandId,
      target,
      validationFailure: { code: TEAM_COMMAND_INVALID_TARGET_CODE, message: invalidTargetMessage },
    }));
    return;
  }
  if (!input.activeRun) {
    sendAck(buildInterruptGenerationCommandAck({
      commandId,
      target,
      validationFailure: {
        code: "RUN_NOT_FOUND",
        message: `Team run '${input.teamRunId}' is not active.`,
      },
    }));
    return;
  }

  try {
    const result = await input.activeRun.interruptMember(memberRouteKey, memberRunId);
    sendAck(buildInterruptGenerationCommandAck({ commandId, target, result }));
    if (!result.accepted && typeof result.code === "string" && result.code.startsWith("TARGET_MEMBER_")) {
      input.sink?.send(createErrorMessage(
        TEAM_COMMAND_INVALID_TARGET_CODE,
        result.message ?? INTERRUPT_GENERATION_INVALID_TARGET_MESSAGE,
      ));
    }
  } catch (executionError) {
    sendAck(buildInterruptGenerationCommandAck({ commandId, target, executionError }));
  }
};
