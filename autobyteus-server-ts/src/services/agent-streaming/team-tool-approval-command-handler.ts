import type { RootTeamRun } from "../../agent-team-execution/domain/root-team-run.js";
import {
  parseTeamStreamServerMessage,
  type TeamStreamClientMessage,
  type TeamStreamServerMessage,
} from "@autobyteus/team-stream-contracts";
import {
  parseCommandAgentRunId,
  TEAM_COMMAND_INVALID_TARGET_CODE,
  TEAM_COMMAND_INVALID_TARGET_MESSAGE,
} from "./team-agent-run-command-parser.js";
import type { AgentStreamServerMessageSink } from "./websocket-egress/agent-stream-websocket-egress.js";

export type TeamToolApprovalSink = AgentStreamServerMessageSink<TeamStreamServerMessage> | null;
type TeamToolApprovalPayload = Extract<
  TeamStreamClientMessage,
  { type: "APPROVE_TOOL" | "DENY_TOOL" }
>["payload"];

const logger = {
  warn: (...args: unknown[]) => console.warn(...args),
};

/** A tool decision for one of the team's agents, through its routed commands (the stream's session always has them). */
export const handleTeamToolApprovalCommand = async (input: {
  payload: TeamToolApprovalPayload;
  approved: boolean;
  activeRun: Pick<RootTeamRun, "executeAgentCommand">;
  sink: TeamToolApprovalSink;
}): Promise<void> => {
  const invocationId = typeof input.payload.invocation_id === "string"
    ? input.payload.invocation_id.trim()
    : "";
  if (!invocationId) {
    logger.warn("Team tool approval missing invocation_id");
    return;
  }
  const agentRunId = parseCommandAgentRunId(input.payload);
  if (!agentRunId) {
    logger.warn(`TOOL_APPROVAL rejected for invocation ${invocationId}: ${TEAM_COMMAND_INVALID_TARGET_MESSAGE}`);
    input.sink?.send(parseTeamStreamServerMessage({
      type: "ERROR",
      payload: {
        code: TEAM_COMMAND_INVALID_TARGET_CODE,
        message: TEAM_COMMAND_INVALID_TARGET_MESSAGE,
        change_sequence: null,
        agent_run_id: null,
        error_scope: null,
        error_effect: null,
        turn_id: null,
        occurred_at: new Date().toISOString(),
      },
    }));
    return;
  }
  const reason = typeof input.payload.reason === "string" ? input.payload.reason : null;
  const result = await input.activeRun.executeAgentCommand(agentRunId, {
    kind: "approve_tool",
    invocationId,
    approved: input.approved,
    reason,
  });
  if (!result.accepted) {
    logger.warn(
      `TOOL_APPROVAL rejected for agent run ${agentRunId}: [${result.code ?? "UNKNOWN"}] ${result.message ?? "no message"}`,
    );
  }
};
