import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { createErrorMessage } from "./models.js";
import {
  parseCommandExecutionAddress,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-execution-address-command-parser.js";

export type TeamToolApprovalConnection = { send: (data: string) => void } | null;

export const handleTeamToolApprovalCommand = async (input: {
  teamRunId: string; payload: Record<string, unknown>; approved: boolean;
  activeRun: TeamRun | null; connection: TeamToolApprovalConnection;
}): Promise<void> => {
  const invocationId = typeof input.payload.invocation_id === "string" ? input.payload.invocation_id.trim() : "";
  if (!invocationId || !input.activeRun) return;
  const address = parseCommandExecutionAddress(input.payload, input.teamRunId);
  if (!address) {
    input.connection?.send(createErrorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, TEAM_COMMAND_INVALID_TARGET_MESSAGE).toJson());
    return;
  }
  const reason = typeof input.payload.reason === "string" ? input.payload.reason : null;
  const result = await input.activeRun.approveToolInvocation(
    address.memberAddress,
    invocationId,
    input.approved,
    reason,
    address.taskAgentRunId,
    address.taskTeamRunIds.at(-1) ?? null,
  );
  if (!result.accepted) console.warn(`TOOL_APPROVAL rejected: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`);
};
