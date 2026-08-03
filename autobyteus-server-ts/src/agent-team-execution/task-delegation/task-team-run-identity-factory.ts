import { randomUUID } from "node:crypto";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import { AgentRunIdentityAllocator as DefaultAgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { TaskTeamInstanceIdentity } from "../domain/task-team-instance.js";
import type { TeamRun } from "../domain/team-run.js";
import type {
  TeamMemberRunConfig,
  TeamRunMemberConfig,
  TeamSubTeamMemberRunConfig,
} from "../domain/team-run-config.js";
import { generateTeamRunIdForDefinitionName } from "../domain/team-run-id.js";
import type { TaskDelegationTeamIdentity } from "./task-delegation-target.js";

export type TaskTeamMaterialization = {
  identity: TaskTeamInstanceIdentity;
  teamConfig: TeamSubTeamMemberRunConfig;
};

type AllocatorLike = Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;

const normalizeRequired = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) throw new Error(`${fieldName} is required.`);
  return normalized;
};

const pathsEqual = (left: readonly string[], right: readonly string[]): boolean =>
  left.length === right.length && left.every((segment, index) => segment === right[index]);

export class TaskTeamRunIdentityFactory {
  constructor(
    private readonly agentRunIdentityAllocator: AllocatorLike = DefaultAgentRunIdentityAllocator.getInstance(),
    private readonly createToken: () => string = () => randomUUID().replace(/-/g, ""),
  ) {}

  async create(input: {
    teamRun: TeamRun;
    taskId: string;
    teamTarget: TaskDelegationTeamIdentity;
  }): Promise<TaskTeamMaterialization> {
    const logicalConfig = this.resolveLogicalTeamConfig(input.teamRun, input.teamTarget);
    const taskTeamRunId = generateTeamRunIdForDefinitionName(input.teamTarget.memberName, this.createToken());
    const teamConfig = await this.materializeTeamConfig(logicalConfig, taskTeamRunId);
    const ingress = this.resolveIngress(input.teamTarget, teamConfig);
    const taskId = normalizeRequired(input.taskId, "taskId");
    const identity: TaskTeamInstanceIdentity = {
      taskTeamInstanceId: `task_team_${taskId}`,
      taskTeamRunId,
      parentTeamRunId: normalizeRequired(input.teamRun.runId, "parentTeamRunId"),
      taskId,
      logicalTeam: {
        memberName: input.teamTarget.memberName,
        memberPath: [...input.teamTarget.memberPath],
        memberRouteKey: input.teamTarget.memberRouteKey,
        templateMemberRunId: input.teamTarget.memberRunId,
        teamDefinitionId: input.teamTarget.teamDefinitionId,
        coordinatorMemberRouteKey: input.teamTarget.coordinatorMemberRouteKey,
      },
      ingress,
      createdAt: new Date().toISOString(),
    };
    return { identity, teamConfig };
  }

  private resolveLogicalTeamConfig(
    teamRun: TeamRun,
    target: TaskDelegationTeamIdentity,
  ): TeamSubTeamMemberRunConfig {
    const matches = (teamRun.config?.memberTree ?? []).filter(
      (member): member is TeamSubTeamMemberRunConfig =>
        member.memberKind === "agent_team" &&
        member.memberRouteKey === target.memberRouteKey &&
        pathsEqual(member.memberPath, target.memberPath),
    );
    if (matches.length === 1) return matches[0]!;
    throw new Error(`Team target '${target.memberRouteKey}' was not found in team run config.`);
  }

  private async materializeTeamConfig(
    config: TeamSubTeamMemberRunConfig,
    taskTeamRunId: string,
  ): Promise<TeamSubTeamMemberRunConfig> {
    return {
      ...config,
      memberRunId: taskTeamRunId,
      childTeamRunId: taskTeamRunId,
      memberConfigs: await this.materializeMemberTree(config.memberConfigs),
    };
  }

  private async materializeMemberTree(
    members: readonly TeamRunMemberConfig[],
  ): Promise<TeamRunMemberConfig[]> {
    return Promise.all(members.map((member) => this.materializeMember(member)));
  }

  private async materializeMember(member: TeamRunMemberConfig): Promise<TeamRunMemberConfig> {
    if (member.memberKind === "agent") return this.materializeAgentMember(member);
    const childTeamRunId = generateTeamRunIdForDefinitionName(member.memberName, this.createToken());
    return {
      ...member,
      memberRunId: childTeamRunId,
      childTeamRunId,
      memberConfigs: await this.materializeMemberTree(member.memberConfigs),
    };
  }

  private async materializeAgentMember(member: TeamMemberRunConfig): Promise<TeamMemberRunConfig> {
    return {
      ...member,
      memberRunId: await this.agentRunIdentityAllocator.allocateForAgentDefinition(member.agentDefinitionId),
    };
  }

  private resolveIngress(
    target: TaskDelegationTeamIdentity,
    config: TeamSubTeamMemberRunConfig,
  ): TaskTeamInstanceIdentity["ingress"] {
    const ingress = target.ingress;
    if (!ingress) throw new Error(`Team target '${target.memberName}' has no ingress member.`);
    const matches = config.memberConfigs.filter(
      (member): member is TeamMemberRunConfig =>
        member.memberKind === "agent" &&
        member.memberRouteKey === ingress.memberRouteKey &&
        pathsEqual(member.memberPath, ingress.memberPath),
    );
    const match = matches.length === 1 ? matches[0]! : null;
    if (!match || match.memberKind !== "agent") {
      throw new Error(`Ingress member '${ingress.memberRouteKey}' was not found in materialized task team config.`);
    }
    return {
      memberName: ingress.memberName,
      memberPath: [...ingress.memberPath],
      memberRouteKey: ingress.memberRouteKey,
      memberRunId: normalizeRequired(match.memberRunId, "ingress.memberRunId"),
    };
  }

}
