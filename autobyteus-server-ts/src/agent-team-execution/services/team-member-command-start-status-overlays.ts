import { normalizeAgentApiStatus, type AgentStatusPayload } from "../../agent-execution/domain/agent-status-payload.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { TeamRunEvent } from "../domain/team-run-event.js";
import {
  buildAgentMemberCommandStartStatusEvent,
  buildAgentMemberCommandStatusPayload,
} from "./team-member-command-start-status-events.js";

export type TeamCommandStatusMemberContext = {
  memberName: string;
  memberRunId: string;
  memberPath: string[];
  memberRouteKey: string;
};

export const getCommandStatusSnapshot = (input: {
  commandStatuses: ReadonlyMap<string, AgentStatusPayload>;
  memberRouteKey: string;
  fallback: () => AgentStatusPayload;
}): AgentStatusPayload => input.commandStatuses.get(input.memberRouteKey) ?? input.fallback();

export const publishTeamMemberCommandStatus = (input: {
  teamRunId: string | null;
  runtimeKind: RuntimeKind;
  memberContext: TeamCommandStatusMemberContext;
  commandStatuses: Map<string, AgentStatusPayload>;
  currentStatus: () => unknown;
  status: "initializing" | "error";
  errorMessage?: string | null;
  publishEvent: (event: TeamRunEvent) => void;
  publishTeamStatusIfChanged: () => void;
}): boolean => {
  const currentStatus = normalizeAgentApiStatus(input.currentStatus());
  if (input.status === "initializing" && currentStatus !== "offline" && currentStatus !== "idle") {
    return false;
  }
  if (!input.teamRunId) {
    return false;
  }

  const eventInput = {
    teamRunId: input.teamRunId,
    runtimeKind: input.runtimeKind,
    memberName: input.memberContext.memberName,
    memberRunId: input.memberContext.memberRunId,
    memberPath: input.memberContext.memberPath,
    memberRouteKey: input.memberContext.memberRouteKey,
    status: input.status,
    errorMessage: input.errorMessage ?? null,
  };
  input.commandStatuses.set(
    input.memberContext.memberRouteKey,
    buildAgentMemberCommandStatusPayload(eventInput),
  );
  input.publishEvent(buildAgentMemberCommandStartStatusEvent(eventInput));
  input.publishTeamStatusIfChanged();
  return true;
};
