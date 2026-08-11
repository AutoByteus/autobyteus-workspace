import {
  getParentAgentTeamAddress,
} from "../../agent-collaboration/domain/agent-team-address.js";
import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type { TeamRunContext } from "../domain/team-run-context.js";
import type { ResolvedTeamRecipient } from "../services/resolved-team-recipient.js";
import { TaskDelegationError, type TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export class TaskDelegationTargetMapper {
  fromRecipient(
    recipient: ResolvedTeamRecipient,
    callerAddressing: MemberLogicalAddressContext,
    currentTeam: TeamRunContext<unknown>,
    caller: TaskDelegationCallerIdentity,
    activeTaskAgentRunId: string | null = null,
  ): TaskDelegationTarget {
    const callerTeamAddress = getParentAgentTeamAddress(callerAddressing.memberAddress);
    const targetTeamAddress = getParentAgentTeamAddress(recipient.address);
    if (!callerTeamAddress || targetTeamAddress !== callerTeamAddress ||
        currentTeam.teamAddress !== callerTeamAddress) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_NOT_ELIGIBLE",
        "The resolved recipient is not a direct child of the caller's current AgentTeam.",
      );
    }
    const callerNode = currentTeam.index.getAgent(callerAddressing.memberAddress);
    const taskAgentRunId = caller.executionAddress.taskAgentRunId;
    const executionAddressMatches =
      callerAddressing.rootTeamRunId === currentTeam.config.rootTeam.teamRunId &&
      caller.executionAddress.rootTeamRunId === currentTeam.config.rootTeam.teamRunId &&
      caller.executionAddress.memberAddress === callerAddressing.memberAddress;
    const runtimeIdentityMatches = activeTaskAgentRunId
      ? taskAgentRunId === activeTaskAgentRunId &&
        caller.agentRunId === activeTaskAgentRunId &&
        caller.executionAddress.taskAgentRunId === taskAgentRunId
      : taskAgentRunId === null &&
        caller.executionAddress.taskAgentRunId === null &&
        callerNode?.agentRunId === caller.agentRunId;
    if (!callerNode || !executionAddressMatches || !runtimeIdentityMatches) {
      throw new TaskDelegationError(
        "DELEGATOR_NOT_AUTHORIZED",
        "Caller runtime identity does not match the current AgentTeam execution.",
      );
    }
    if (recipient.address === callerAddressing.memberAddress) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED",
        "The current Agent cannot delegate a task to itself.",
      );
    }
    const node = currentTeam.index.getNode(recipient.address);
    if (!node || node.kind !== recipient.kind) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_CONFIG_INVALID",
        `Resolved recipient '${recipient.address}' has no exact direct current-Team node.`,
      );
    }
    if (recipient.kind === "agent_team") {
      if (node.kind !== "agent_team" || node.coordinatorAddress !== recipient.coordinatorAddress ||
          getParentAgentTeamAddress(recipient.coordinatorAddress) !== recipient.address ||
          !currentTeam.index.getAgent(recipient.coordinatorAddress)) {
        throw new TaskDelegationError(
          "TASK_TEAM_TARGET_INGRESS_NOT_FOUND",
          `AgentTeam '${recipient.address}' has no exact configured direct coordinator.`,
        );
      }
    }
    return recipient;
  }
}
