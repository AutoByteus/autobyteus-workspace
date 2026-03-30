import type { AgentRunEvent } from "../../agent-execution/domain/agent-run-event.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export enum TeamRunEventSourceType {
  AGENT = "AGENT",
  TEAM = "TEAM",
  TASK_PLAN = "TASK_PLAN",
}

export type TeamRunStatusUpdateData = {
  new_status: string;
  old_status?: string | null;
  error_message?: string | null;
};

export type TeamRunAgentEventPayload = {
  runtimeKind: RuntimeKind;
  memberName: string;
  memberRunId: string;
  agentEvent: AgentRunEvent;
};

export type TeamRunTaskPlanEventPayload = Record<string, unknown>;

export type TeamRunEventData =
  | TeamRunStatusUpdateData
  | TeamRunAgentEventPayload
  | TeamRunTaskPlanEventPayload;

export type TeamRunEvent = {
  eventSourceType: TeamRunEventSourceType;
  teamRunId: string;
  data: TeamRunEventData;
  subTeamNodeName?: string | null;
};

export type TeamRunEventListener = (event: TeamRunEvent) => void;

export type TeamRunEventUnsubscribe = () => void;
