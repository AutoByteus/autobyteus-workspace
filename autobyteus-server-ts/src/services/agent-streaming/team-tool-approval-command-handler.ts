import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import {
  parseTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export type TeamToolApprovalSink = AgentStreamServerMessageSink<TeamStreamServerMessage> | null;
type TeamToolApprovalPayload = Extract<
  TeamStreamClientMessage,
  { type: "APPROVE_TOOL" | "DENY_TOOL" }
>["payload"];

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const handleTeamToolApprovalCommand = async (input: {
  teamRunId: string;
  payload: TeamToolApprovalPayload;
  approved: boolean;
  activeRun: TeamRun | null;
  sink: TeamToolApprovalSink;
}): Promise<void> => {
  const invocationId = typeof input.payload.invocation_id === "string"
    ? input.payload.invocation_id.trim()
    : "";
  if (!invocationId) {
    logger.warn("Team tool approval missing invocation_id");
    return;
  }
  if (!input.activeRun) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: active run not found.`);
    return;
  }
  const address = parseCommandExecutionAddress(input.payload, input.teamRunId);
  if (!address) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: ${TEAM_COMMAND_INVALID_TARGET_MESSAGE}`);
    input.sink?.send(parseTeamStreamServerMessage({
      type: "ERROR",
      payload: {
        code: TEAM_COMMAND_INVALID_TARGET_CODE,
        message: TEAM_COMMAND_INVALID_TARGET_MESSAGE,
        agent_execution: null,
      },
    }));
    return;
  }
  const reason = typeof input.payload.reason === "string" ? input.payload.reason : null;
  const result = await input.activeRun.executeMemberCommand(address, {
    kind: "approve_tool",
    invocationId,
    approved: input.approved,
    reason,
  });
  if (!result.accepted) {
    logger.warn(
      `TOOL_APPROVAL rejected for team run ${input.teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
    );
  }
};
