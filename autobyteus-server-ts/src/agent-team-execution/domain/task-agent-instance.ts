import type { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";

export type LogicalTaskAgentMemberIdentity = {
  memberName: string;
  memberPath: string[];
  memberRouteKey: string;
  templateMemberRunId: string;
  runtimeKind?: RuntimeKind | null;
};

export type TaskAgentInstanceIdentity = {
  taskAgentInstanceId: string;
  taskAgentRunId: string;
  teamRunId: string;
  taskId: string;
  logicalMember: LogicalTaskAgentMemberIdentity;
  createdAt: string;
};

export type StartTaskAgentInstanceRequest = {
  identity: TaskAgentInstanceIdentity;
  message: AgentInputUserMessage;
};

export const cloneTaskAgentInstanceIdentity = (
  identity: TaskAgentInstanceIdentity,
): TaskAgentInstanceIdentity => ({
  ...identity,
  logicalMember: {
    ...identity.logicalMember,
    memberPath: [...identity.logicalMember.memberPath],
  },
});
