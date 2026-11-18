import {
  parseTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import {
  parseCommandAgentRunId,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-agent-run-command-parser.js";
import { userInterruptOutcome } from "./user-interrupt-outcome.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

type Payload = Extract<
  TeamStreamClientMessage,
  { type: "INTERRUPT_GENERATION" }
>["payload"];

export const handleTeamInterruptGenerationCommand = async (input: {
  payload: Payload;
  sink: AgentStreamServerMessageSink<TeamStreamServerMessage> | null;
  activeRun: Pick<RootTeamRun, "executeAgentCommand">;
}): Promise<void> => {
  const agentRunId = parseCommandAgentRunId(input.payload);
  const reject = (code: string, message: string, state: "rejected" | "failed" = "rejected") =>
    input.sink?.send(parseTeamStreamServerMessage({
      type: "AGENT_COMMAND_ACK",
      payload: {
        command_type: "INTERRUPT_GENERATION",
        command_id: input.payload.command_id,
        state,
        code,
        message,
        agent_run_id: input.payload.agent_run_id,
      },
    }));
  if (!agentRunId) {
    reject(TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE);
    return;
  }
  try {
    const result = userInterruptOutcome(await input.activeRun.executeAgentCommand(agentRunId, { kind: "interrupt" }));
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
        agent_run_id: input.payload.agent_run_id,
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
