import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { createErrorMessage, ServerMessage, ServerMessageType } from "./models.js";
import {
  buildInterruptGenerationCommandAck,
  normalizeInterruptCommandId,
} from "./interrupt-generation-command-ack.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export const handleTeamInterruptGenerationCommand = async (input: {
  teamRunId: string;
  payload: Record<string, unknown>;
  sink: AgentStreamServerMessageSink | null;
  activeRun: TeamRun | null;
}): Promise<void> => {
  const commandId = normalizeInterruptCommandId(input.payload.command_id);
  const address = parseCommandExecutionAddress(input.payload, input.teamRunId);
  const target = {
    target_kind: "team_member" as const,
    team_run_id: input.teamRunId,
    execution_address: address,
  };
  const sendAck = (ack: ReturnType<typeof buildInterruptGenerationCommandAck>) => {
    input.sink?.send(new ServerMessage(ServerMessageType.AGENT_COMMAND_ACK, ack));
  };
  if (!commandId) {
    sendAck(buildInterruptGenerationCommandAck({ commandId, target }));
    return;
  }
  if (!address) {
    input.sink?.send(createErrorMessage(
      TEAM_COMMAND_INVALID_TARGET_CODE,
      TEAM_COMMAND_INVALID_TARGET_MESSAGE,
    ));
    sendAck(buildInterruptGenerationCommandAck({
      commandId,
      target,
      validationFailure: {
        code: TEAM_COMMAND_INVALID_TARGET_CODE,
        message: TEAM_COMMAND_INVALID_TARGET_MESSAGE,
      },
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
    const result = await input.activeRun.interruptMember(
      address.memberAddress,
      address.taskAgentRunId,
    );
    sendAck(buildInterruptGenerationCommandAck({ commandId, target, result }));
  } catch (executionError) {
    sendAck(buildInterruptGenerationCommandAck({ commandId, target, executionError }));
  }
};
