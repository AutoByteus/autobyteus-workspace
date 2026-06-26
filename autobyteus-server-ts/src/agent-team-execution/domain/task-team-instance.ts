import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { TeamSubTeamMemberRunConfig } from "./team-run-config.js";

export type LogicalTaskTeamMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  templateMemberRunId: string;
  teamDefinitionId: string;
  coordinatorMemberRouteKey: string | null;
};

export type TaskTeamIngressIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  memberRunId: string;
};

export type TaskTeamInstanceIdentity = {
  taskTeamInstanceId: string;
  taskTeamRunId: string;
  parentTeamRunId: string;
  taskId: string;
  logicalTeam: LogicalTaskTeamMemberIdentity;
  ingress: TaskTeamIngressIdentity;
  createdAt: string;
};

export type StartTaskTeamInstanceRequest = {
  identity: TaskTeamInstanceIdentity;
  teamConfig: TeamSubTeamMemberRunConfig;
  message: AgentInputUserMessage;
};

export const cloneTaskTeamInstanceIdentity = (
  identity: TaskTeamInstanceIdentity,
): TaskTeamInstanceIdentity => ({
  taskTeamInstanceId: identity.taskTeamInstanceId,
  taskTeamRunId: identity.taskTeamRunId,
  parentTeamRunId: identity.parentTeamRunId,
  taskId: identity.taskId,
  logicalTeam: {
    memberName: identity.logicalTeam.memberName,
    memberPath: [...identity.logicalTeam.memberPath],
    memberRouteKey: identity.logicalTeam.memberRouteKey,
    templateMemberRunId: identity.logicalTeam.templateMemberRunId,
    teamDefinitionId: identity.logicalTeam.teamDefinitionId,
    coordinatorMemberRouteKey: identity.logicalTeam.coordinatorMemberRouteKey ?? null,
  },
  ingress: {
    memberName: identity.ingress.memberName,
    memberPath: [...identity.ingress.memberPath],
    memberRouteKey: identity.ingress.memberRouteKey,
    memberRunId: identity.ingress.memberRunId,
  },
  createdAt: identity.createdAt,
});
