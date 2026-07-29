import type { AgentMemoryScope } from "../../../agent-memory/domain/agent-memory-location.js";
import type { TaskTeamInstanceIdentity } from "../../domain/task-team-instance.js";
import type { TokenUsageTeamExecutionScope } from "../../domain/token-usage-execution-scope.js";
import {
  AgentMemoryLocationService,
  getAgentMemoryLocationService,
} from "../../../agent-memory/services/agent-memory-location-service.js";
import {
  TeamRunConfig,
  type TeamRunMemberConfig,
} from "../../domain/team-run-config.js";
import { TeamRunContext } from "../../domain/team-run-context.js";
import { TeamBackendKind } from "../../domain/team-backend-kind.js";
import type { TeamRunBackendFactory } from "../team-run-backend-factory.js";
import type { TeamManager } from "../team-manager.js";
import { MixedTeamManager } from "./mixed-team-manager.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedParentBoundaryContext,
  type MixedTeamMemberContext,
} from "./mixed-team-run-context.js";
import { MixedTeamRunBackend } from "./mixed-team-run-backend.js";
import { MixedSubTeamRunFactory } from "./mixed-sub-team-run-factory.js";
import {
  TokenUsageExecutionAddressBuilder,
} from "../../services/token-usage-execution-address-builder.js";
import {
  MemberTeamContextBuilder,
} from "../../services/member-team-context-builder.js";

const normalizeRequiredRunId = (value: string | null | undefined, fieldName: string): string => {
  const normalized = typeof value === "string" ? value.trim() : "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export type MixedTeamRunBackendFactoryOptions = {
  createTeamManager?: (context: TeamRunContext<MixedTeamRunContext>, subTeamRunFactory: MixedSubTeamRunFactory) => MixedTeamManager;
  memoryLocationService?: Pick<AgentMemoryLocationService, "getTeamAgentRunLocation">;
  memberTeamContextBuilder?: MemberTeamContextBuilder;
};

export class MixedTeamRunBackendFactory implements TeamRunBackendFactory {
  private readonly createTeamManager: (context: TeamRunContext<MixedTeamRunContext>, subTeamRunFactory: MixedSubTeamRunFactory) => MixedTeamManager;
  private readonly memoryLocationService: Pick<AgentMemoryLocationService, "getTeamAgentRunLocation">;
  private readonly subTeamRunFactory: MixedSubTeamRunFactory;
  private readonly tokenUsageAddressBuilder = new TokenUsageExecutionAddressBuilder();

  constructor(options: MixedTeamRunBackendFactoryOptions = {}) {
    const memberTeamContextBuilder =
      options.memberTeamContextBuilder ?? new MemberTeamContextBuilder();
    this.createTeamManager =
      options.createTeamManager ?? ((context, subTeamRunFactory) => new MixedTeamManager(context, {
        subTeamRunFactory,
        memberTeamContextBuilder,
      }));
    this.memoryLocationService = options.memoryLocationService ?? getAgentMemoryLocationService();
    this.subTeamRunFactory = new MixedSubTeamRunFactory({
      buildContext: (config, teamRunId, restoreRuntimeContext, parentBoundary, taskTeamInstance, tokenUsageTeamScope) =>
        this.buildTeamRunContext(config, teamRunId, restoreRuntimeContext, parentBoundary, taskTeamInstance, tokenUsageTeamScope),
      createTeamManager: (context) => this.createTeamManager(context, this.subTeamRunFactory),
    });
  }

  async createBackend(config: TeamRunConfig, teamRunId: string): Promise<MixedTeamRunBackend> {
    const context = this.buildTeamRunContext(config, normalizeRequiredRunId(teamRunId, "teamRunId"));
    const teamManager = this.createTeamManager(context, this.subTeamRunFactory);
    return this.createBackendFromContext(context, teamManager);
  }

  async restoreBackend(
    context: TeamRunContext<MixedTeamRunContext>,
  ): Promise<MixedTeamRunBackend> {
    const teamManager = this.createTeamManager(context, this.subTeamRunFactory);
    return this.createBackendFromContext(context, teamManager);
  }

  buildTeamRunContext(
    config: TeamRunConfig,
    teamRunId: string,
    restoreRuntimeContext: MixedTeamRunContext | null = null,
    parentBoundary: MixedParentBoundaryContext | null = null,
    taskTeamInstance: TaskTeamInstanceIdentity | null = null,
    tokenUsageTeamScope: TokenUsageTeamExecutionScope | null = null,
  ): TeamRunContext<MixedTeamRunContext> {
    const memoryScope = this.getContextMemoryScope(teamRunId, parentBoundary);
    const resolvedTokenUsageTeamScope = tokenUsageTeamScope ??
      restoreRuntimeContext?.tokenUsageTeamScope ??
      this.tokenUsageAddressBuilder.buildRootTeamScope(teamRunId);
    const memberTree = this.attachRuntimeIdentity(config.memberTree, memoryScope);
    const runtimeContext = new MixedTeamRunContext({
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      memberContexts: memberTree.map((memberConfig) =>
        this.buildRuntimeMemberContext(memberConfig, restoreRuntimeContext),
      ),
      parentBoundary,
      taskTeamInstance,
      tokenUsageTeamScope: resolvedTokenUsageTeamScope,
    });

    return new TeamRunContext({
      runId: teamRunId,
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberName: config.coordinatorMemberName,
      coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
      config: new TeamRunConfig({
        teamDefinitionId: config.teamDefinitionId,
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: config.coordinatorMemberName,
        coordinatorMemberRouteKey: config.coordinatorMemberRouteKey,
        memberTree,
        }),
      runtimeContext,
    });
  }

  private createBackendFromContext(
    context: TeamRunContext<MixedTeamRunContext>,
    teamManager: TeamManager,
  ): MixedTeamRunBackend {
    return new MixedTeamRunBackend(context, teamManager);
  }

  private attachRuntimeIdentity(
    memberTree: readonly TeamRunMemberConfig[],
    memoryScope: AgentMemoryScope,
  ): TeamRunMemberConfig[] {
    return memberTree.map((memberConfig) => {
      const memberRunId = normalizeRequiredRunId(
        memberConfig.memberRunId,
        `memberRunId for member '${memberConfig.memberRouteKey}'`,
      );
      if (memberConfig.memberKind === "agent_team") {
        const childTeamRunId = normalizeRequiredRunId(
          memberConfig.childTeamRunId,
          `childTeamRunId for member '${memberConfig.memberRouteKey}'`,
        );
        if (memberRunId !== childTeamRunId) {
          throw new Error(
            `agent_team wrapper memberRunId for '${memberConfig.memberRouteKey}' must equal childTeamRunId.`,
          );
        }
        return {
          ...memberConfig,
          memberRunId,
          childTeamRunId,
          memberConfigs: this.attachRuntimeIdentity(memberConfig.memberConfigs, {
            rootTeamRunId: memoryScope.rootTeamRunId,
            teamRunPath: [...memoryScope.teamRunPath, childTeamRunId],
          }),
        };
      }
      const memoryDir =
        typeof memberConfig.memoryDir === "string" && memberConfig.memoryDir.trim().length > 0
          ? memberConfig.memoryDir.trim()
          : this.memoryLocationService.getTeamAgentRunLocation({
              rootTeamRunId: memoryScope.rootTeamRunId,
              teamRunPath: memoryScope.teamRunPath,
              agentRunId: memberRunId,
            }).memoryDir;
      return {
        ...memberConfig,
        memberRunId,
        memoryDir,
      };
    });
  }

  private getContextMemoryScope(
    teamRunId: string,
    parentBoundary: MixedParentBoundaryContext | null,
  ): AgentMemoryScope {
    return parentBoundary?.memoryScope
      ? {
          rootTeamRunId: parentBoundary.memoryScope.rootTeamRunId,
          teamRunPath: [...parentBoundary.memoryScope.teamRunPath],
        }
      : { rootTeamRunId: teamRunId, teamRunPath: [] };
  }

  private buildRuntimeMemberContext(
    memberConfig: TeamRunMemberConfig,
    restoreRuntimeContext: MixedTeamRunContext | null,
  ): MixedTeamMemberContext {
    const restored = this.findRestoredMemberContext(memberConfig, restoreRuntimeContext);
    if (memberConfig.memberKind === "agent") {
      return new MixedAgentMemberContext({
        memberName: memberConfig.memberName,
        memberPath: memberConfig.memberPath,
        memberRouteKey: memberConfig.memberRouteKey,
        memberRunId: memberConfig.memberRunId!,
        runtimeKind: memberConfig.runtimeKind,
        platformAgentRunId: restored?.memberKind === "agent" ? restored.platformAgentRunId : null,
      });
    }
    return new MixedSubTeamMemberContext({
      memberName: memberConfig.memberName,
      memberPath: memberConfig.memberPath,
      memberRouteKey: memberConfig.memberRouteKey,
      memberRunId: memberConfig.memberRunId!,
      teamDefinitionId: memberConfig.teamDefinitionId,
      childTeamRunId:
        (restored?.memberKind === "agent_team" ? restored.childTeamRunId : null) ??
        memberConfig.childTeamRunId ??
        null,
      childRuntimeContext: restored?.memberKind === "agent_team" ? restored.childRuntimeContext : null,
    });
  }

  private findRestoredMemberContext(
    memberConfig: TeamRunMemberConfig,
    restoreRuntimeContext: MixedTeamRunContext | null,
  ): MixedTeamMemberContext | null {
    if (!restoreRuntimeContext) {
      return null;
    }
    return restoreRuntimeContext.memberContexts.find(
      (memberContext) =>
        memberContext.memberRunId === memberConfig.memberRunId ||
        memberContext.memberRouteKey === memberConfig.memberRouteKey,
    ) ?? null;
  }
}

let cachedMixedTeamRunBackendFactory: MixedTeamRunBackendFactory | null = null;

export const getMixedTeamRunBackendFactory = (): MixedTeamRunBackendFactory => {
  if (!cachedMixedTeamRunBackendFactory) {
    cachedMixedTeamRunBackendFactory = new MixedTeamRunBackendFactory();
  }
  return cachedMixedTeamRunBackendFactory;
};
