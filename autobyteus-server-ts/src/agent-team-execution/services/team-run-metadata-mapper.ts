import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { TeamRunMetadata, TeamRunMemberMetadata } from "../../run-history/store/team-run-metadata-types.js";
import { buildTeamMemberRunId, normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { TeamMemberMemoryLayout } from "../../agent-memory/store/team-member-memory-layout.js";
import { TeamRunConfig, type TeamMemberRunConfig } from "../domain/team-run-config.js";
import { TeamRunContext } from "../domain/team-run-context.js";
import { TeamRun } from "../domain/team-run.js";
import {
  buildRestoreTeamRunRuntimeContext,
  getRuntimeMemberContexts,
} from "./team-run-runtime-context-support.js";

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
    const runtimeKind = metadata.memberMetadata[0]?.runtimeKind ?? RuntimeKind.AUTOBYTEUS;
    const memberConfigs = await Promise.all(
      metadata.memberMetadata.map(async (member) => {
        let workspaceId: string | null = null;
        if (member.workspaceRootPath) {
          const workspace = await this.dependencies.workspaceManager.ensureWorkspaceByRootPath(
            member.workspaceRootPath,
          );
          workspaceId = workspace.workspaceId;
        }

        return {
          memberName: member.memberName,
          agentDefinitionId: member.agentDefinitionId,
          llmModelIdentifier: member.llmModelIdentifier,
          autoExecuteTools: member.autoExecuteTools,
          runtimeKind: member.runtimeKind,
          workspaceId,
          skillAccessMode: member.skillAccessMode,
          memoryDir: this.dependencies.memberLayout.getMemberDirPath(
            metadata.teamRunId,
            member.memberRunId,
          ),
          llmConfig: member.llmConfig ?? null,
          memberRouteKey: member.memberRouteKey,
          memberRunId: member.memberRunId,
          workspaceRootPath: member.workspaceRootPath,
          applicationExecutionContext: member.applicationExecutionContext ?? null,
        };
      }),
    );
    const coordinatorMemberName = this.resolveCoordinatorMemberNameFromMetadata(metadata);

    return new TeamRunContext({
      runId: metadata.teamRunId,
      runtimeKind,
      coordinatorMemberName,
      config: new TeamRunConfig({
        teamDefinitionId: metadata.teamDefinitionId,
        runtimeKind,
        coordinatorMemberName,
        memberConfigs,
      }),
      runtimeContext: buildRestoreTeamRunRuntimeContext(metadata, runtimeKind),
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
    const runtimeMemberContextByRunId = new Map<string, { platformAgentRunId: string | null }>();
    for (const memberContext of getRuntimeMemberContexts(run.getRuntimeContext())) {
      runtimeMemberContextByRunId.set(memberContext.memberRunId, {
        platformAgentRunId: memberContext.getPlatformAgentRunId(),
      });
    }

    const memberMetadata: TeamRunMemberMetadata[] = await Promise.all(
      config.memberConfigs.map(async (memberConfig) => {
        const memberRouteKey = normalizeMemberRouteKey(
          memberConfig.memberRouteKey ?? memberConfig.memberName,
        );
        const memberRunId =
          memberConfig.memberRunId?.trim() || buildTeamMemberRunId(run.runId, memberRouteKey);
        const runtimeMemberContext = runtimeMemberContextByRunId.get(memberRunId) ?? null;

        return {
          memberRouteKey,
          memberName: memberConfig.memberName,
          memberRunId,
          runtimeKind: memberConfig.runtimeKind,
          platformAgentRunId: runtimeMemberContext?.platformAgentRunId ?? null,
          agentDefinitionId: memberConfig.agentDefinitionId,
          llmModelIdentifier: memberConfig.llmModelIdentifier,
          autoExecuteTools: memberConfig.autoExecuteTools,
          skillAccessMode: memberConfig.skillAccessMode,
          llmConfig: memberConfig.llmConfig ?? null,
          workspaceRootPath: await this.resolveMemberWorkspaceRootPath(memberConfig),
          applicationExecutionContext: memberConfig.applicationExecutionContext ?? null,
        };
      }),
    );

    const coordinatorMemberRouteKey = normalizeMemberRouteKey(
      config.coordinatorMemberName?.trim() ||
        definition?.coordinatorMemberName?.trim() ||
        memberMetadata[0]?.memberRouteKey ||
        memberMetadata[0]?.memberName ||
        "coordinator",
    );

    return {
      teamRunId: run.runId,
      teamDefinitionId: config.teamDefinitionId,
      teamDefinitionName: definition?.name?.trim() || config.teamDefinitionId,
      coordinatorMemberRouteKey,
      runVersion: 1,
      createdAt: timestamp,
      updatedAt: timestamp,
      memberMetadata,
    };
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
    return (
      metadata.memberMetadata.find(
        (member) => member.memberRouteKey === metadata.coordinatorMemberRouteKey,
      )?.memberName ?? metadata.memberMetadata[0]?.memberName ?? null
    );
  }
}
