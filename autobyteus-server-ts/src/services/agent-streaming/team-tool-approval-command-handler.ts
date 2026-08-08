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
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export type TeamToolApprovalSink = AgentStreamServerMessageSink | null;

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

const sendInvalidTarget = (
  sink: TeamToolApprovalSink,
  message: string,
): void => {
  sink?.send(createErrorMessage(TEAM_COMMAND_INVALID_TARGET_CODE, message));
};

export const handleTeamToolApprovalCommand = async (input: {
  teamRunId: string;
  payload: Record<string, unknown>;
  approved: boolean;
  activeRun: TeamRun | null;
  sink: TeamToolApprovalSink;
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
    sendInvalidTarget(input.sink, TOOL_APPROVAL_INVALID_TARGET_MESSAGE);
    return;
  }

  const taskTeamRunId = resolveToolApprovalTaskTeamRunId(input.payload);
  const approvalTarget = taskTeamRunId
    ? resolveTaskTeamScopedToolApprovalTargetSelector(input.payload)
    : resolveToolApprovalTargetSelector(input.payload);

  if (!approvalTarget) {
    logger.warn(`TOOL_APPROVAL rejected for team run ${input.teamRunId}: ${TOOL_APPROVAL_MISSING_TARGET_MESSAGE}`);
    sendInvalidTarget(input.sink, TOOL_APPROVAL_MISSING_TARGET_MESSAGE);
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
