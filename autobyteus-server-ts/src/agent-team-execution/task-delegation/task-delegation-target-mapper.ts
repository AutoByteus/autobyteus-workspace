import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import type {
  TeamMemberRunConfig,
  TeamRunConfig,
  TeamRunMemberConfig,
  TeamSubTeamMemberRunConfig,
} from "../domain/team-run-config.js";
import type { ResolvedTeamLogicalPlacement } from "../services/resolved-team-logical-placement.js";
import { TaskDelegationError, type TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

const pathsEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

export class TaskDelegationTargetMapper {
  fromPlacement(
    placement: ResolvedTeamLogicalPlacement,
    callerAddressing: MemberLogicalAddressContext,
    currentConfig: TeamRunConfig,
    caller: TaskDelegationCallerIdentity,
  ): TaskDelegationTarget {
    const owner = placement.owner;
    if (!owner || !pathsEqual(owner.teamPath, callerAddressing.immediateTeamPath)) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_NOT_ELIGIBLE",
        "The resolved logical placement is not a direct child of the caller's immediate Team.",
      );
    }
    this.assertAuthorizedCaller(currentConfig, caller);
    const matches = currentConfig.memberTree.filter(
      (member) =>
        pathsEqual(member.memberPath, owner.localMemberPath) &&
        member.memberRouteKey === owner.localMemberRouteKey,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_CONFIG_INVALID",
        `Resolved target '${placement.subject.absoluteAddress}' has no exact direct current-Team config.`,
      );
    }
    const target = matches[0]!;
    if (placement.kind === "agent") {
      if (placement.subject.absoluteAddress === callerAddressing.memberAddress) {
        throw new TaskDelegationError(
          "TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED",
          "The current logical Agent cannot delegate a task to itself.",
        );
      }
      if (target.memberKind !== "agent") return this.kindMismatch(placement.subject.absoluteAddress);
      return { kind: "member", member: this.toMember(target, placement.subject.absoluteAddress) };
    }
    if (target.memberKind !== "agent_team") return this.kindMismatch(placement.subject.absoluteAddress);
    return { kind: "team", team: this.toTeam(target, placement.subject.absoluteAddress) };
  }

  private assertAuthorizedCaller(
    config: TeamRunConfig,
    caller: TaskDelegationCallerIdentity,
  ): void {
    const logicalRouteKey = caller.logicalMemberRouteKey?.trim() || caller.memberRouteKey.trim();
    const matches = config.memberTree.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" && member.memberRouteKey === logicalRouteKey,
    );
    const member = matches.length === 1 ? matches[0]! : null;
    if (!member || member.memberName !== caller.memberName) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", "Caller is not a direct Agent of the current TeamRun.");
    }
    if (!caller.taskAgentRunId?.trim() && member.memberRunId !== caller.memberRunId) {
      throw new TaskDelegationError("DELEGATOR_NOT_AUTHORIZED", "Caller runtime identity does not match the current TeamRun config.");
    }
  }

  private toMember(member: TeamMemberRunConfig, logicalAddress: string) {
    if (!member.memberRunId) {
      throw new TaskDelegationError("TASK_DELEGATION_TARGET_CONFIG_INVALID", `Agent '${logicalAddress}' has no memberRunId.`);
    }
    return {
      memberKind: "agent" as const,
      memberName: member.memberName,
      memberPath: [...member.memberPath],
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId,
      runtimeKind: member.runtimeKind,
      role: member.role ?? null,
      description: member.description ?? null,
      logicalAddress,
    };
  }

  private toTeam(team: TeamSubTeamMemberRunConfig, logicalAddress: string) {
    if (!team.memberRunId) {
      throw new TaskDelegationError("TASK_DELEGATION_TARGET_CONFIG_INVALID", `Team '${logicalAddress}' has no memberRunId.`);
    }
    const coordinator = team.coordinatorMemberRouteKey?.trim() ?? "";
    const matches = team.memberConfigs.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" && member.memberRouteKey === coordinator,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError("TASK_TEAM_TARGET_INGRESS_NOT_FOUND", `Team '${logicalAddress}' has no exact localized ingress Agent.`);
    }
    const ingress = this.toMember(matches[0]!, `${logicalAddress}/${matches[0]!.memberName}`);
    return {
      memberKind: "agent_team" as const,
      memberName: team.memberName,
      memberPath: [...team.memberPath],
      memberRouteKey: team.memberRouteKey,
      memberRunId: team.memberRunId,
      teamDefinitionId: team.teamDefinitionId,
      childTeamRunId: team.childTeamRunId ?? null,
      coordinatorMemberRouteKey: team.coordinatorMemberRouteKey,
      ingress,
      role: team.role ?? null,
      description: team.description ?? null,
      logicalAddress,
    };
  }

  private kindMismatch(address: string): never {
    throw new TaskDelegationError(
      "TASK_DELEGATION_TARGET_CONFIG_INVALID",
      `Resolved target '${address}' does not match its current-Team config kind.`,
    );
  }
}
