import type {
  TokenUsageExecutionAddress,
  TokenUsageExecutionAddressSegment,
} from "../../token-usage/domain/execution-address.js";
import {
  appendTokenUsageExecutionAddressSegments,
  buildTokenUsageExecutionAddress,
} from "../../token-usage/domain/execution-address.js";
import type { TaskAgentInstanceIdentity } from "../domain/task-agent-instance.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type {
  TokenUsageExecutionScope,
  TokenUsageTeamExecutionScope,
} from "../domain/token-usage-execution-scope.js";
import { cloneTokenUsageTeamExecutionScope } from "../domain/token-usage-execution-scope.js";

const normalizeRequired = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${fieldName} is required for token usage execution address.`);
  return normalized;
};

const memberSegment = (
  memberRouteKey: string | null | undefined,
  fieldName: string,
): TokenUsageExecutionAddressSegment => ({
  kind: "member",
  memberRouteKey: normalizeRequired(memberRouteKey, fieldName),
});

const emptyAddress = (): TokenUsageExecutionAddress => buildTokenUsageExecutionAddress([]);

export class TokenUsageExecutionAddressBuilder {
  buildRootTeamScope(teamRunId: string): TokenUsageTeamExecutionScope {
    return {
      rootTeamRunId: normalizeRequired(teamRunId, "teamRunId"),
      teamScopeAddress: emptyAddress(),
    };
  }

  buildSubTeamScope(input: {
    parentScope: TokenUsageTeamExecutionScope;
    representedMemberRouteKey: string;
  }): TokenUsageTeamExecutionScope {
    return {
      rootTeamRunId: input.parentScope.rootTeamRunId,
      teamScopeAddress: appendTokenUsageExecutionAddressSegments(
        input.parentScope.teamScopeAddress,
        [memberSegment(input.representedMemberRouteKey, "representedMemberRouteKey")],
      ),
    };
  }

  buildTaskTeamScope(input: {
    parentScope: TokenUsageTeamExecutionScope;
    taskTeamInstance: TaskTeamInstanceIdentity;
  }): TokenUsageTeamExecutionScope {
    return {
      rootTeamRunId: input.parentScope.rootTeamRunId,
      teamScopeAddress: appendTokenUsageExecutionAddressSegments(
        input.parentScope.teamScopeAddress,
        [
          memberSegment(input.taskTeamInstance.logicalTeam.memberRouteKey, "taskTeamInstance.logicalTeam.memberRouteKey"),
          {
            kind: "task_team",
            taskTeamRunId: normalizeRequired(input.taskTeamInstance.taskTeamRunId, "taskTeamInstance.taskTeamRunId"),
          },
        ],
      ),
    };
  }

  buildMemberRunScope(input: {
    teamScope: TokenUsageTeamExecutionScope;
    memberRouteKey: string;
    taskAgentInstance?: TaskAgentInstanceIdentity | null;
  }): TokenUsageExecutionScope {
    const teamScope = cloneTokenUsageTeamExecutionScope(input.teamScope);
    const currentRunAddress = input.taskAgentInstance
      ? this.buildTaskAgentAddress(teamScope.teamScopeAddress, input.taskAgentInstance)
      : appendTokenUsageExecutionAddressSegments(
        teamScope.teamScopeAddress,
        [memberSegment(input.memberRouteKey, "memberRouteKey")],
      );
    return {
      ...teamScope,
      currentRunAddress,
    };
  }

  private buildTaskAgentAddress(
    teamScopeAddress: TokenUsageExecutionAddress,
    taskAgentInstance: TaskAgentInstanceIdentity,
  ): TokenUsageExecutionAddress {
    return appendTokenUsageExecutionAddressSegments(
      teamScopeAddress,
      [
        memberSegment(taskAgentInstance.logicalMember.memberRouteKey, "taskAgentInstance.logicalMember.memberRouteKey"),
        {
          kind: "task_agent",
          taskAgentRunId: normalizeRequired(taskAgentInstance.taskAgentRunId, "taskAgentInstance.taskAgentRunId"),
        },
      ],
    );
  }
}

let cachedTokenUsageExecutionAddressBuilder: TokenUsageExecutionAddressBuilder | null = null;

export const getTokenUsageExecutionAddressBuilder = (): TokenUsageExecutionAddressBuilder => {
  if (!cachedTokenUsageExecutionAddressBuilder) {
    cachedTokenUsageExecutionAddressBuilder = new TokenUsageExecutionAddressBuilder();
  }
  return cachedTokenUsageExecutionAddressBuilder;
};
