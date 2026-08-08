import {
  AgentRunEventType,
  type AgentRunStatusHint,
} from "../../agent-execution/domain/agent-run-event.js";
import {
  buildAgentStatusPayload,
  type AgentApiStatus,
  type AgentStatusPayload,
} from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../domain/team-run-event.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";

export type TeamMemberCommandStatusInput = {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  memberPath: string[];
  memberRouteKey: string;
  taskAgentInstance?: TaskAgentInstanceIdentity | null;
  status: AgentApiStatus;
  errorMessage?: string | null;
};

const statusHintFor = (status: AgentApiStatus): AgentRunStatusHint => {
  if (status === "running") {
    return "ACTIVE";
  }
  if (status === "idle" || status === "offline") {
    return "IDLE";
  }
  if (status === "error") {
    return "ERROR";
  }
  return null;
};

export const buildAgentMemberCommandStatusPayload = (
  input: TeamMemberCommandStatusInput,
): AgentStatusPayload =>
  buildAgentStatusPayload({
    status: input.status,
    agentId: input.memberRunId,
    agentName: input.memberName,
    memberRouteKey: input.memberRouteKey,
    memberPath: input.memberPath,
    sourceRouteKey: input.memberRouteKey,
    sourcePath: input.memberPath,
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
    sourcePath: [...input.memberPath],
    data: {
      runtimeKind: input.runtimeKind,
      memberName: input.memberName,
      memberRunId: input.memberRunId,
      memberPath: [...input.memberPath],
      memberRouteKey: input.memberRouteKey,
      agentEvent: {
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: input.memberRunId,
        payload: {
          ...payload,
          ...(input.errorMessage ? { error_message: input.errorMessage } : {}),
        },
        statusHint: statusHintFor(input.status),
      },
      taskAgentInstance: input.taskAgentInstance ?? null,
    },
  };
};
