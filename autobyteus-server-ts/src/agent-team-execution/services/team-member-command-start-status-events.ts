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
  type TeamRunStatusUpdateData,
} from "../domain/team-run-event.js";

export type TeamMemberCommandStatusInput = {
  teamRunId: string;
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  memberPath: string[];
  memberRouteKey: string;
  status: AgentApiStatus;
  errorMessage?: string | null;
};

export type TeamCommandStatusInput = {
  teamRunId: string;
  sourcePath: string[];
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
    canInterrupt: false,
    agentId: input.memberRunId,
    agentName: input.memberName,
    memberRouteKey: input.memberRouteKey,
    memberPath: input.memberPath,
    sourceRouteKey: input.memberRouteKey,
    sourcePath: input.memberPath,
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
    },
  };
};

export const buildTeamCommandStartStatusEvent = (
  input: TeamCommandStatusInput,
): TeamRunEvent => ({
  eventSourceType: TeamRunEventSourceType.TEAM,
  teamRunId: input.teamRunId,
  sourcePath: [...input.sourcePath],
  data: {
    status: input.status,
    ...(input.errorMessage ? { error_message: input.errorMessage } : {}),
  } satisfies TeamRunStatusUpdateData,
});
