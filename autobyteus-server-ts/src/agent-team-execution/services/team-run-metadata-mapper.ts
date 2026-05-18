import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type {
  TeamRunMetadata,
  TeamRunMemberMetadata,
  TeamRunAgentMemberMetadata,
} from "../../run-history/store/team-run-metadata-types.js";
import { buildTeamMemberRunId } from "../../run-history/utils/team-member-run-id.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import {
  TeamRunConfig,
  type TeamMemberRunConfig,
  type TeamRunMemberConfig,
} from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { TeamRun } from "../domain/team-run.js";
import {
  buildRestoreTeamRunRuntimeContext,
  getRuntimeMemberContexts,
  resolveTeamBackendKindFromMetadata,
} from "./team-run-runtime-context-support.js";
import { buildMemberRouteKeyFromPath } from "../domain/team-run-member-identity.js";
import type {
  RuntimeTeamRunContext,
  TeamMemberRuntimeContext,
  TeamSubTeamMemberRuntimeContext,
} from "../domain/team-run-context.js";

const normalizeOptionalString = (value: string | null | undefined): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

type TeamDefinitionLookup = Pick<AgentTeamDefinitionService, "getDefinitionById">;
type TeamRunMetadataWorkspaceManager = Pick<
  WorkspaceManager,
  "ensureWorkspaceByRootPath" | "getWorkspaceById"
>;

export class TeamRunMetadataMapper {
  constructor(private readonly dependencies: {
    teamDefinitionService: TeamDefinitionLookup;
    workspaceManager: TeamRunMetadataWorkspaceManager;
    memberLayout: TeamMemberMemoryLayout;
  }) {}

  async buildRestoreContext(metadata: TeamRunMetadata): Promise<TeamRunContext> {
    const teamBackendKind = resolveTeamBackendKindFromMetadata(metadata);
    const memberTree = await Promise.all(
      metadata.memberTree.map((member) => this.memberMetadataToRunConfig(metadata.teamRunId, member)),
    );
    const coordinatorMemberName = this.resolveCoordinatorMemberNameFromMetadata(metadata);

    return new TeamRunContext({
      runId: metadata.teamRunId,
      teamBackendKind,
      coordinatorMemberName,
      coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
      config: new TeamRunConfig({
        teamDefinitionId: metadata.teamDefinitionId,
        teamBackendKind,
        coordinatorMemberName,
        coordinatorMemberRouteKey: metadata.coordinatorMemberRouteKey,
        memberTree,
      }),
      runtimeContext: buildRestoreTeamRunRuntimeContext(metadata, teamBackendKind),
    });
  }

  async buildMetadata(run: TeamRun): Promise<TeamRunMetadata> {
    const config = run.config;
    if (!config) {
      throw new Error(`Team run '${run.runId}' is missing config.`);
    }

    const definition = await this.dependencies.teamDefinitionService.getDefinitionById(
      config.teamDefinitionId,
    );
    const timestamp = new Date().toISOString();
    const runtimeMemberContextByRunId = new Map<string, RuntimeMemberMetadataSnapshot>();
    this.collectRuntimeMemberSnapshots(
      run.getRuntimeContext() as RuntimeTeamRunContext,
      runtimeMemberContextByRunId,
    );

    const memberTree = await Promise.all(
      config.memberTree.map((memberConfig) =>
        this.buildMemberMetadata(run.runId, memberConfig, runtimeMemberContextByRunId),
      ),
    );

    const coordinatorMemberRouteKey =
      config.coordinatorMemberRouteKey ??
      (config.coordinatorMemberName ? buildMemberRouteKeyFromPath([config.coordinatorMemberName]) : null) ??
      memberTree[0]?.memberRouteKey ??
      "coordinator";

    return {
      teamRunId: run.runId,
      teamDefinitionId: config.teamDefinitionId,
      teamDefinitionName: definition?.name?.trim() || config.teamDefinitionId,
      coordinatorMemberRouteKey,
      createdAt: timestamp,
      updatedAt: timestamp,
      memberTree,
    };
  }

  private async memberMetadataToRunConfig(
    teamRunId: string,
    member: TeamRunMemberMetadata,
  ): Promise<TeamRunMemberConfig> {
    if (member.memberKind === "agent_team") {
      return {
        memberKind: "agent_team",
        memberName: member.memberName,
        memberPath: member.memberPath,
        memberRouteKey: member.memberRouteKey,
        memberRunId: member.memberRunId,
        teamDefinitionId: member.teamDefinitionId,
        childTeamRunId: member.teamRunId,
        coordinatorMemberRouteKey: member.coordinatorMemberRouteKey,
        role: member.role ?? null,
        description: member.description ?? null,
        memberConfigs: await Promise.all(
          member.memberTree.map((child) => this.memberMetadataToRunConfig(teamRunId, child)),
        ),
      };
    }

    let workspaceId: string | null = null;
    if (member.workspaceRootPath) {
      const workspace = await this.dependencies.workspaceManager.ensureWorkspaceByRootPath(
        member.workspaceRootPath,
      );
      workspaceId = workspace.workspaceId;
    }

    return {
      memberKind: "agent",
      memberName: member.memberName,
      memberPath: member.memberPath,
      memberRouteKey: member.memberRouteKey,
      memberRunId: member.memberRunId,
      role: member.role ?? null,
      description: member.description ?? null,
      agentDefinitionId: member.agentDefinitionId,
      llmModelIdentifier: member.llmModelIdentifier,
      autoExecuteTools: member.autoExecuteTools,
      runtimeKind: member.runtimeKind,
      workspaceId,
      skillAccessMode: member.skillAccessMode,
      memoryDir: this.dependencies.memberLayout.getMemberDirPath(
        teamRunId,
        member.memberRunId,
      ),
      llmConfig: member.llmConfig ?? null,
      workspaceRootPath: member.workspaceRootPath,
      applicationExecutionContext: member.applicationExecutionContext ?? null,
    } satisfies TeamMemberRunConfig;
  }

  private async buildMemberMetadata(
    teamRunId: string,
    memberConfig: TeamRunMemberConfig,
    runtimeMemberContextByRunId: Map<string, RuntimeMemberMetadataSnapshot>,
  ): Promise<TeamRunMemberMetadata> {
    const memberRunId =
      normalizeOptionalString(memberConfig.memberRunId) ?? buildTeamMemberRunId(teamRunId, memberConfig.memberRouteKey);
    const runtimeMemberContext = runtimeMemberContextByRunId.get(memberRunId) ?? null;

    if (memberConfig.memberKind === "agent_team") {
      return {
        memberKind: "agent_team",
        memberRouteKey: memberConfig.memberRouteKey,
        memberPath: [...memberConfig.memberPath],
        memberName: memberConfig.memberName,
        memberRunId,
        role: memberConfig.role ?? null,
        description: memberConfig.description ?? null,
        teamDefinitionId: memberConfig.teamDefinitionId,
        teamRunId: runtimeMemberContext?.childTeamRunId ?? memberConfig.childTeamRunId ?? null,
        coordinatorMemberRouteKey: memberConfig.coordinatorMemberRouteKey ?? null,
        memberTree: await Promise.all(
          memberConfig.memberConfigs.map((child) =>
            this.buildMemberMetadata(teamRunId, child, runtimeMemberContextByRunId),
          ),
        ),
      };
    }

    return {
      memberKind: "agent",
      memberRouteKey: memberConfig.memberRouteKey,
      memberPath: [...memberConfig.memberPath],
      memberName: memberConfig.memberName,
      memberRunId,
      role: memberConfig.role ?? null,
      description: memberConfig.description ?? null,
      runtimeKind: memberConfig.runtimeKind,
      platformAgentRunId: runtimeMemberContext?.platformAgentRunId ?? null,
      agentDefinitionId: memberConfig.agentDefinitionId,
      llmModelIdentifier: memberConfig.llmModelIdentifier,
      autoExecuteTools: memberConfig.autoExecuteTools,
      skillAccessMode: memberConfig.skillAccessMode,
      llmConfig: memberConfig.llmConfig ?? null,
      workspaceRootPath: await this.resolveMemberWorkspaceRootPath(memberConfig),
      applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
    } satisfies TeamRunAgentMemberMetadata;
  }

  private async resolveMemberWorkspaceRootPath(
    memberConfig: TeamMemberRunConfig,
  ): Promise<string | null> {
    if (memberConfig.workspaceRootPath?.trim()) {
      return memberConfig.workspaceRootPath.trim();
    }
    if (memberConfig.workspaceId?.trim()) {
      const workspace = this.dependencies.workspaceManager.getWorkspaceById(
        memberConfig.workspaceId.trim(),
      );
      const basePath = workspace?.getBasePath();
      return typeof basePath === "string" && basePath.trim().length > 0 ? basePath.trim() : null;
    }
    return null;
  }

  private resolveCoordinatorMemberNameFromMetadata(metadata: TeamRunMetadata): string | null {
    const stack = [...metadata.memberTree];
    while (stack.length > 0) {
      const member = stack.shift()!;
      if (member.memberRouteKey === metadata.coordinatorMemberRouteKey) {
        return member.memberName;
      }
      if (member.memberKind === "agent_team") {
        stack.push(...member.memberTree);
      }
    }
    return metadata.memberTree[0]?.memberName ?? null;
  }

  private collectRuntimeMemberSnapshots(
    runtimeContext: RuntimeTeamRunContext,
    snapshotsByRunId: Map<string, RuntimeMemberMetadataSnapshot>,
  ): void {
    for (const memberContext of getRuntimeMemberContexts(runtimeContext)) {
      snapshotsByRunId.set(memberContext.memberRunId, {
        platformAgentRunId: memberContext.getPlatformAgentRunId(),
        childTeamRunId: this.resolveChildTeamRunId(memberContext),
      });
      if (memberContext.memberKind === "agent_team") {
        const subTeamContext = memberContext as TeamSubTeamMemberRuntimeContext;
        this.collectRuntimeMemberSnapshots(
          subTeamContext.childRuntimeContext ?? null,
          snapshotsByRunId,
        );
      }
    }
  }

  private resolveChildTeamRunId(memberContext: TeamMemberRuntimeContext): string | null {
    if (memberContext.memberKind !== "agent_team") {
      return null;
    }
    const subTeamContext = memberContext as TeamSubTeamMemberRuntimeContext;
    return typeof subTeamContext.childTeamRunId === "string" &&
      subTeamContext.childTeamRunId.trim().length > 0
      ? subTeamContext.childTeamRunId.trim()
      : null;
  }
}

type RuntimeMemberMetadataSnapshot = {
  platformAgentRunId: string | null;
  childTeamRunId: string | null;
};
