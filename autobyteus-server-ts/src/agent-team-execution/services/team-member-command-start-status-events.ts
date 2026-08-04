import { AgentRunEventType, type AgentRunStatusHint } from "../../agent-execution/domain/agent-run-event.js";
import { buildAgentStatusPayload, type AgentApiStatus, type AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamExecutionAddress } from "../domain/team-execution-address.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../domain/team-run-event.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export type TeamMemberCommandStatusInput = {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  executionAddress: TeamExecutionAddress;
  displayName: string;
  agentRunId: string;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
  status: AgentApiStatus;
  errorMessage?: string | null;
};

const statusHintFor = (status: AgentApiStatus): AgentRunStatusHint =>
  status === "running" ? "ACTIVE" : status === "idle" || status === "offline"
    ? "IDLE" : status === "error" ? "ERROR" : null;

export const buildAgentMemberCommandStatusPayload = (
  input: TeamMemberCommandStatusInput,
): AgentStatusPayload => buildAgentStatusPayload({
  status: input.status,
  agentId: input.agentRunId,
  agentName: input.displayName,
  executionAddress: input.executionAddress,
  taskAgentInstanceId: input.taskAgentInstance?.taskAgentInstanceId ?? null,
  taskAgentRunId: input.taskAgentInstance?.taskAgentRunId ?? null,
  taskId: input.taskAgentInstance?.taskId ?? null,
});

export const buildAgentMemberCommandStartStatusEvent = (
  input: TeamMemberCommandStatusInput,
): TeamRunEvent => {
  const payload = buildAgentMemberCommandStatusPayload(input);
  return {
    eventSourceType: TeamRunEventSourceType.AGENT,
    teamRunId: input.teamRunId,
    executionAddress: input.executionAddress,
    data: {
      runtimeKind: input.runtimeKind,
      executionAddress: input.executionAddress,
      displayName: input.displayName,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: input.agentRunId,
        payload: { ...payload, ...(input.errorMessage ? { error_message: input.errorMessage } : {}) },
        statusHint: statusHintFor(input.status),
      },
      taskAgentInstance: input.taskAgentInstance ?? null,
    },
  };
};
