import {
  buildConversationAddressFromSegments,
  normalizeConversationTargetAddress,
  type ConversationTargetAddress,
  type ConversationTargetSegment,
} from "../domain/conversation-target-address.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TaskExecutionInstance } from "./task-execution-instance.js";
import type { TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type {
  TaskDelegationMemberIdentity,
  TaskDelegationTarget,
  TaskDelegationTeamIdentity,
} from "./task-delegation-target.js";

const normalizeString = (value: string | null | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const memberSegment = (routeKey: string | null | undefined, memberPath?: readonly string[] | null): ConversationTargetSegment => {
  const memberRouteKey = normalizeString(routeKey);
  if (memberRouteKey) return { kind: "member", memberRouteKey };
  const normalizedPath = (memberPath ?? []).map((part) => part.trim()).filter(Boolean);
  if (normalizedPath.length > 0) return { kind: "member", memberPath: normalizedPath };
  throw new Error("Task delegation address requires a member route key or path.");
};

const rootTaskTeamPrefix = (
  taskTeamInstance: TaskTeamInstanceIdentity | null,
): ConversationTargetSegment[] => taskTeamInstance
  ? [
      memberSegment(
        taskTeamInstance.logicalTeam.memberRouteKey,
        taskTeamInstance.logicalTeam.memberPath,
      ),
      { kind: "task_team", taskTeamRunId: taskTeamInstance.taskTeamRunId },
    ]
  : [];

export class TaskDelegationAddressBuilder {
  constructor(private readonly taskTeamInstance: TaskTeamInstanceIdentity | null = null) {}

  buildCallerAddress(caller: TaskDelegationCallerIdentity): ConversationTargetAddress {
    const segments: ConversationTargetSegment[] = [
      ...rootTaskTeamPrefix(this.taskTeamInstance),
      memberSegment(
        caller.logicalMemberRouteKey ?? caller.memberRouteKey,
        caller.memberPath,
      ),
    ];
    const taskAgentRunId = normalizeString(caller.taskAgentRunId);
    if (taskAgentRunId) segments.push({ kind: "task_agent", taskAgentRunId });
    return this.address(segments);
  }

  buildTargetAddress(target: TaskDelegationTarget): ConversationTargetAddress {
    return target.kind === "member"
      ? this.buildMemberTargetAddress(target.member)
      : this.buildTeamTargetAddress(target.team);
  }

  buildTaskRunAddress(execution: TaskExecutionInstance): ConversationTargetAddress {
    if (execution.kind === "task_agent") {
      return this.address([
        ...rootTaskTeamPrefix(this.taskTeamInstance),
        memberSegment(
          execution.taskAgentInstance.logicalMember.memberRouteKey,
          execution.taskAgentInstance.logicalMember.memberPath,
        ),
        { kind: "task_agent", taskAgentRunId: execution.taskAgentInstance.taskAgentRunId },
      ]);
    }
    return this.address([
      ...rootTaskTeamPrefix(this.taskTeamInstance),
      memberSegment(
        execution.taskTeamInstance.logicalTeam.memberRouteKey,
        execution.taskTeamInstance.logicalTeam.memberPath,
      ),
      { kind: "task_team", taskTeamRunId: execution.taskTeamInstance.taskTeamRunId },
    ]);
  }

  buildTaskTeamIngressAddress(
    taskTeamInstance: TaskTeamInstanceIdentity,
  ): ConversationTargetAddress {
    return this.address([
      ...rootTaskTeamPrefix(this.taskTeamInstance),
      memberSegment(
        taskTeamInstance.logicalTeam.memberRouteKey,
        taskTeamInstance.logicalTeam.memberPath,
      ),
      { kind: "task_team", taskTeamRunId: taskTeamInstance.taskTeamRunId },
      memberSegment(
        taskTeamInstance.ingress.memberRouteKey,
        taskTeamInstance.ingress.memberPath,
      ),
    ]);
  }

  buildSubmissionSenderAddress(taskRunAddress: ConversationTargetAddress): ConversationTargetAddress {
    return normalizeConversationTargetAddress(taskRunAddress);
  }

  buildSubmissionReceiverAddress(reviewOwnerAddress: ConversationTargetAddress): ConversationTargetAddress {
    return normalizeConversationTargetAddress(reviewOwnerAddress);
  }

  buildReviewSenderAddress(reviewOwnerAddress: ConversationTargetAddress): ConversationTargetAddress {
    return normalizeConversationTargetAddress(reviewOwnerAddress);
  }

  buildReviewReceiverAddress(taskRunAddress: ConversationTargetAddress): ConversationTargetAddress {
    return normalizeConversationTargetAddress(taskRunAddress);
  }

  private buildMemberTargetAddress(member: TaskDelegationMemberIdentity): ConversationTargetAddress {
    return this.address([
      ...rootTaskTeamPrefix(this.taskTeamInstance),
      memberSegment(member.memberRouteKey, member.memberPath),
    ]);
  }

  private buildTeamTargetAddress(team: TaskDelegationTeamIdentity): ConversationTargetAddress {
    return this.address([
      ...rootTaskTeamPrefix(this.taskTeamInstance),
      memberSegment(team.memberRouteKey, team.memberPath),
    ]);
  }

  private address(segments: ConversationTargetSegment[]): ConversationTargetAddress {
    return normalizeConversationTargetAddress(buildConversationAddressFromSegments(segments));
  }
}
