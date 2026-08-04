import type { MemberLogicalAddressContext } from "../domain/member-logical-address-context.js";
import {
  getCollaborationAddressBasename,
  getParentCollaborationAddress,
} from "../../agent-collaboration/domain/collaboration-logical-address.js";
import type { TeamMemberRunConfig, TeamRunConfig, TeamSubTeamMemberRunConfig } from "../domain/team-run-config.js";
import type { ResolvedTeamLogicalPlacement } from "../services/resolved-team-logical-placement.js";
import { TaskDelegationError, type TaskDelegationCallerIdentity } from "./task-delegation-record.js";
import type { TaskDelegationTarget } from "./task-delegation-target.js";

export class TaskDelegationTargetMapper {
  fromPlacement(
    placement: ResolvedTeamLogicalPlacement,
    callerAddressing: MemberLogicalAddressContext,
    currentConfig: TeamRunConfig,
    caller: TaskDelegationCallerIdentity,
  ): TaskDelegationTarget {
    const callerTeamAddress = getParentCollaborationAddress(callerAddressing.memberAddress);
    const targetOwnerAddress = getParentCollaborationAddress(placement.address);
    if (!targetOwnerAddress || targetOwnerAddress !== callerTeamAddress) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_NOT_ELIGIBLE",
        "The resolved logical placement is not a direct child of the caller's immediate Team.",
      );
    }
    this.assertAuthorizedCaller(currentConfig, caller);
    if (placement.kind === "agent" && placement.address === callerAddressing.memberAddress) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_SELF_TARGET_NOT_ALLOWED",
        "The current logical Agent cannot delegate a task to itself.",
      );
    }
    const targetName = getCollaborationAddressBasename(placement.address);
    if (!targetName) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_NOT_ELIGIBLE",
        "The collaboration-root Team is not an eligible task target.",
      );
    }
    const targetKind = placement.kind === "agent" ? "agent" : "agent_team";
    const matches = currentConfig.memberTree.filter(
      (member) => member.memberName === targetName && member.memberKind === targetKind,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError(
        "TASK_DELEGATION_TARGET_CONFIG_INVALID",
        `Resolved target '${placement.address}' has no exact direct current-Team config.`,
      );
    }
    const target = matches[0]!;
    if (placement.kind === "agent") {
      if (target.memberKind !== "agent") return this.kindMismatch(placement.address);
      return { kind: "member", member: this.toMember(target, placement.address) };
    }
    if (target.memberKind !== "agent_team") return this.kindMismatch(placement.address);
    return { kind: "team", team: this.toTeam(target, placement.address, placement.ingressAddress) };
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

  private toTeam(
    team: TeamSubTeamMemberRunConfig,
    logicalAddress: string,
    ingressAddress: string,
  ) {
    if (!team.memberRunId) {
      throw new TaskDelegationError("TASK_DELEGATION_TARGET_CONFIG_INVALID", `Team '${logicalAddress}' has no memberRunId.`);
    }
    if (getParentCollaborationAddress(ingressAddress) !== logicalAddress) {
      throw new TaskDelegationError(
        "TASK_TEAM_TARGET_INGRESS_NOT_FOUND",
        `Team '${logicalAddress}' ingress '${ingressAddress}' is not its direct Agent child.`,
      );
    }
    const ingressName = getCollaborationAddressBasename(ingressAddress);
    const coordinator = team.coordinatorMemberRouteKey?.trim() ?? "";
    const matches = team.memberConfigs.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" &&
        member.memberName === ingressName &&
        member.memberRouteKey === coordinator,
    );
    if (matches.length !== 1) {
      throw new TaskDelegationError("TASK_TEAM_TARGET_INGRESS_NOT_FOUND", `Team '${logicalAddress}' has no exact localized ingress Agent.`);
    }
    const ingress = this.toTeamIngress(matches[0]!);
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

  private toTeamIngress(member: TeamMemberRunConfig) {
    if (!member.memberRunId) {
      throw new TaskDelegationError(
        "TASK_TEAM_TARGET_INGRESS_NOT_FOUND",
        `Team ingress Agent '${member.memberName}' has no memberRunId.`,
      );
    }
    return {
      memberName: member.memberName,
      memberPath: [...member.memberPath],
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId,
      runtimeKind: member.runtimeKind,
      role: member.role ?? null,
      description: member.description ?? null,
    };
  }

  private kindMismatch(address: string): never {
    throw new TaskDelegationError(
      "TASK_DELEGATION_TARGET_CONFIG_INVALID",
      `Resolved target '${address}' does not match its current-Team config kind.`,
    );
  }
}
