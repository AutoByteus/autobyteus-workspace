import { TeamRun } from "../../domain/team-run.js";
import type { TaskTeamInstanceIdentity } from "../../domain/task-team-instance.js";
import type { TokenUsageTeamExecutionScope } from "../../domain/token-usage-execution-scope.js";
import {
  TeamRunConfig,
  localizeSubTeamRunTopology,
  type TeamSubTeamMemberRunConfig,
} from "../../domain/team-run-config.js";
import type { TeamRunContext } from "../../domain/team-run-context.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedTeamRunContext, type MixedParentBoundaryContext } from "./mixed-team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";

const normalizeRequiredRunId = (value: string | null | undefined, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export type MixedSubTeamRunFactoryOptions = {
  buildContext: (
    config: TeamRunConfig,
    teamRunId: string,
    restoreRuntimeContext?: MixedTeamRunContext | null,
    parentBoundary?: MixedParentBoundaryContext | null,
    taskTeamInstance?: TaskTeamInstanceIdentity | null,
    tokenUsageTeamScope?: TokenUsageTeamExecutionScope | null,
  ) => TeamRunContext<MixedTeamRunContext>;
  createTeamManager: (context: TeamRunContext<MixedTeamRunContext>) => TeamManager;
};

export class MixedSubTeamRunFactory {
  constructor(private readonly options: MixedSubTeamRunFactoryOptions) {}

  async createOrRestore(input: {
    parentTeamRunId: string;
    subTeamConfig: TeamSubTeamMemberRunConfig;
    childTeamRunId: string;
    restoreRuntimeContext?: MixedTeamRunContext | null;
    parentBoundary?: MixedParentBoundaryContext | null;
    taskTeamInstance?: TaskTeamInstanceIdentity | null;
    tokenUsageTeamScope?: TokenUsageTeamExecutionScope | null;
  }): Promise<TeamRun> {
    const childTeamRunId = normalizeRequiredRunId(input.childTeamRunId, "childTeamRunId");
    const localized = localizeSubTeamRunTopology(input.subTeamConfig);
    const config = new TeamRunConfig({
      teamDefinitionId: input.subTeamConfig.teamDefinitionId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: localized.coordinatorMemberRouteKey,
      memberTree: localized.memberTree.map((member) => ({
        ...member,
        memberRunId: normalizeRequiredRunId(
          member.memberRunId,
          `memberRunId for child member '${member.memberRouteKey}'`,
        ),
      })),
      effectiveHandoffs: input.parentBoundary?.effectiveHandoffs ?? [],
    });
    const taskTeamInstance = input.taskTeamInstance
      ? this.localizeTaskTeamIngress(input.taskTeamInstance, config)
      : null;
    const context = this.options.buildContext(
      config,
      childTeamRunId,
      input.restoreRuntimeContext ?? null,
      input.parentBoundary ?? null,
      taskTeamInstance,
      input.tokenUsageTeamScope ?? null,
    );
    const manager = this.options.createTeamManager(context);
    const backend = new MixedTeamRunBackend(context, manager);
    return new TeamRun({ context, backend });
  }

  private localizeTaskTeamIngress(
    identity: TaskTeamInstanceIdentity,
    config: TeamRunConfig,
  ): TaskTeamInstanceIdentity {
    const coordinatorRouteKey = config.coordinatorMemberRouteKey?.trim() ?? "";
    const ingress = config.memberTree.find(
      (member) => member.memberKind === "agent" && member.memberRouteKey === coordinatorRouteKey,
    );
    if (!ingress || ingress.memberKind !== "agent" || !ingress.memberRunId) {
      throw new Error(`Task TeamRun '${identity.taskTeamRunId}' has no exact localized ingress Agent.`);
    }
    return {
      ...identity,
      logicalTeam: { ...identity.logicalTeam, memberPath: [...identity.logicalTeam.memberPath] },
      ingress: {
        memberName: ingress.memberName,
        memberPath: [...ingress.memberPath],
        memberRouteKey: ingress.memberRouteKey,
        memberRunId: ingress.memberRunId,
      },
    };
  }
}
