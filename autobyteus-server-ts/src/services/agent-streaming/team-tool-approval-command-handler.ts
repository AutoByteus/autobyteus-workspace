import type { TeamRun } from "../../agent-team-execution/domain/team-run.js";
import { createErrorMessage } from "./models.js";
import {
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TOOL_APPROVAL_INVALID_TARGET_MESSAGE,
  TOOL_APPROVAL_MISSING_TARGET_MESSAGE,
  hasInvalidCommandSelectorFields,
  resolveTaskTeamScopedToolApprovalTargetSelector,
  resolveToolApprovalTargetRunId,
  resolveToolApprovalTaskTeamRunId,
  resolveToolApprovalTargetSelector,
} from "./team-command-selector-parser.js";

export type TeamToolApprovalConnection = {
  send: (data: string) => void;
} | null;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const sendInvalidTarget = (
  connection: TeamToolApprovalConnection,
  message: string,
): void => {
  connection?.send(
    createErrorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message).toJson(),
  );
};

export const handleTeamToolApprovalCommand = async (input: {
  teamRunId: string;
  payload: Record<string, unknown>;
  approved: boolean;
  activeRun: TeamRun | null;
  connection: TeamToolApprovalConnection;
}): Promise<void> => {
  const invocationId = input.payload.invocation_id;
  if (typeof invocationId !== "string" || invocationId.length === 0) {
    logger.warn("Team tool approval missing invocation_id");
    return;
  }

  if (!input.activeRun) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: active run not found.`);
    return;
  }

  const reason = typeof input.payload.reason === "string" ? input.payload.reason : null;
  if (hasInvalidCommandSelectorFields(input.payload)) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: ${TOOL_APPROVAL_INVALID_TARGET_MESSAGE}`);
    sendInvalidTarget(input.connection, TOOL_APPROVAL_INVALID_TARGET_MESSAGE);
    return;
  }

  const taskTeamRunId = resolveToolApprovalTaskTeamRunId(input.payload);
  const approvalTarget = taskTeamRunId
    ? resolveTaskTeamScopedToolApprovalTargetSelector(input.payload)
    : resolveToolApprovalTargetSelector(input.payload);

  if (!approvalTarget) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: ${TOOL_APPROVAL_MISSING_TARGET_MESSAGE}`);
    sendInvalidTarget(input.connection, TOOL_APPROVAL_MISSING_TARGET_MESSAGE);
    return;
  }

  const result = await input.activeRun.approveToolInvocation(
    approvalTarget,
    invocationId,
    input.approved,
    reason,
    resolveToolApprovalTargetRunId(input.payload),
    taskTeamRunId,
  );
  if (!result.accepted) {
    logger.warn(
      `TOOL_APPROVAL rejected for team run ${input.teamRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
    );
  }
};
