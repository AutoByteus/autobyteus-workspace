import {
  parseTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

type Payload = Extract<
  TeamStreamClientMessage,
  { type: "INTERRUPT_GENERATION" }
>["payload"];

export const handleTeamInterruptGenerationCommand = async (input: {
  teamRunId: string;
  payload: Payload;
  sink: AgentStreamServerMessageSink<TeamStreamServerMessage> | null;
  activeRun: TeamRun | null;
}): Promise<void> => {
  const address = parseCommandExecutionAddress(input.payload, input.teamRunId);
  const reject = (code: string, message: string, state: "rejected" | "failed" = "rejected") =>
    input.sink?.send(parseTeamStreamServerMessage({
      type: "AGENT_COMMAND_ACK",
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: input.payload.command_id,
        state,
        code,
        message,
        execution_address: input.payload.execution_address,
      },
    }));
  if (!address) {
    reject(TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
    return;
  }
  if (!input.activeRun) {
    reject("RUN_NOT_FOUND", `Team run '${input.teamRunId}' is not active.`);
    return;
  }
  try {
    const result = await input.activeRun.executeMemberCommand(address, { kind: "interrupt" });
    if (!result.accepted) {
      reject(
        result.code?.trim() || "RUNTIME_REJECTED",
        result.message?.trim() || "The runtime did not accept the interrupt request.",
        "failed",
      );
      return;
    }
    input.sink?.send(parseTeamStreamServerMessage({
      type: "AGENT_COMMAND_ACK",
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: input.payload.command_id,
        state: "accepted",
        execution_address: input.payload.execution_address,
      },
    }));
  } catch (error) {
    reject(
      "INTERRUPT_EXECUTION_FAILED",
      error instanceof Error ? error.message : String(error),
      "failed",
    );
  }
};
