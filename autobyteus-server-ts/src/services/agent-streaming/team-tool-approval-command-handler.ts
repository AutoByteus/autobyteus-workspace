import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { createErrorMessage } from "./models.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export type TeamToolApprovalSink = AgentStreamServerMessageSink | null;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

export const handleTeamToolApprovalCommand = async (input: {
  teamRunId: string;
  payload: Record<string, unknown>;
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
    input.sink?.send(createErrorMessage(
      TEAM_COMMAND_INVALID_TARGET_CODE,
      TEAM_COMMAND_INVALID_TARGET_MESSAGE,
    ));
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
