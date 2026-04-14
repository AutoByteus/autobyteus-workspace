import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { ApplicationBundle } from "../../application-bundles/domain/models.js";
import type { TeamMemberRunConfig } from "../../agent-team-execution/domain/team-run-config.js";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import type {
  ApplicationMemberProjection,
  ApplicationProducerRuntimeKind,
  ApplicationSessionLaunchContext,
  ApplicationSessionSnapshot,
  ApplicationSessionView,
} from "../domain/models.js";

export type CreateApplicationSessionMemberConfigInput = {
  memberName: string;
  memberRouteKey?: string | null;
  agentDefinitionId: string;
  llmModelIdentifier: string;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceId?: string | null;
  workspaceRootPath?: string | null;
  llmConfig?: Record<string, unknown> | null;
  runtimeKind?: string | null;
};

export type ApplicationSessionMemberDescriptor = {
  memberName: string;
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  agentDefinitionId: string;
  runtimeKind: ApplicationProducerRuntimeKind;
};

const requireNonEmptyString = (value: string | null | undefined, fieldName: string): string => {
  const normalized = value?.trim() ?? "";
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

const sortMembers = (members: ApplicationMemberProjection[]): ApplicationMemberProjection[] =>
  [...members].sort(
    (left, right) =>
      left.teamPath.join("/").localeCompare(right.teamPath.join("/")) ||
      left.displayName.localeCompare(right.displayName) ||
      left.memberRouteKey.localeCompare(right.memberRouteKey),
  );

export class ApplicationSessionLaunchBuilder {
  constructor(
    private readonly dependencies: {
      agentDefinitionService: AgentDefinitionService;
      agentTeamDefinitionService: AgentTeamDefinitionService;
    },
  ) {}

  async buildSingleAgentDescriptor(
    application: ApplicationBundle,
  ): Promise<ApplicationSessionMemberDescriptor> {
    const agentDefinition = await this.dependencies.agentDefinitionService.getAgentDefinitionById(
      application.runtimeTarget.definitionId,
    );
    const memberRouteKey = normalizeMemberRouteKey(application.runtimeTarget.localId);
    return {
      memberName: application.runtimeTarget.localId,
      memberRouteKey,
      displayName: agentDefinition?.name?.trim() || application.name,
      teamPath: [],
      agentDefinitionId: application.runtimeTarget.definitionId,
      runtimeKind: "AGENT",
    };
  }

  async buildTeamMemberDescriptors(
    teamDefinitionId: string,
  ): Promise<ApplicationSessionMemberDescriptor[]> {
    const descriptors = await this.collectTeamMembers(teamDefinitionId, []);
    const seen = new Set<string>();
    for (const descriptor of descriptors) {
      if (seen.has(descriptor.memberRouteKey)) {
        throw new Error(`Duplicate application member route key '${descriptor.memberRouteKey}'.`);
      }
      seen.add(descriptor.memberRouteKey);
    }
    return descriptors;
  }

  normalizeTeamMemberConfigs(
    inputMemberConfigs: CreateApplicationSessionMemberConfigInput[] | null | undefined,
    memberDescriptors: ApplicationSessionMemberDescriptor[],
  ): TeamMemberRunConfig[] {
    if (!Array.isArray(inputMemberConfigs) || inputMemberConfigs.length === 0) {
      throw new Error("memberConfigs are required for application team launch.");
    }

    const descriptorByRouteKey = new Map(
      memberDescriptors.map((descriptor) => [descriptor.memberRouteKey, descriptor]),
    );

    return inputMemberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const descriptor = descriptorByRouteKey.get(memberRouteKey);
      if (!descriptor) {
        throw new Error(
          `Application member '${memberConfig.memberName}' is not part of the bound team.`,
        );
      }

      return {
        memberName: memberConfig.memberName,
        memberRouteKey,
        agentDefinitionId: memberConfig.agentDefinitionId,
        llmModelIdentifier: requireNonEmptyString(
          memberConfig.llmModelIdentifier,
          `memberConfigs['${memberConfig.memberName}'].llmModelIdentifier`,
        ),
        autoExecuteTools: Boolean(memberConfig.autoExecuteTools),
        skillAccessMode: memberConfig.skillAccessMode,
        workspaceId: memberConfig.workspaceId ?? null,
        workspaceRootPath: memberConfig.workspaceRootPath?.trim() || null,
        llmConfig: memberConfig.llmConfig ?? null,
        runtimeKind: memberConfig.runtimeKind?.trim() as TeamMemberRunConfig["runtimeKind"],
      };
    });
  }

  buildLaunchContext(
    applicationSessionId: string,
    applicationId: string,
    member: ApplicationSessionMemberDescriptor,
  ): ApplicationSessionLaunchContext {
    return {
      applicationSessionId,
      applicationId,
      member: {
        memberRouteKey: member.memberRouteKey,
        displayName: member.displayName,
        teamPath: [...member.teamPath],
        runtimeKind: member.runtimeKind,
      },
    };
  }

  createSnapshot(input: {
    application: ApplicationBundle;
    applicationSessionId: string;
    createdAt: string;
    runtime: ApplicationSessionSnapshot["runtime"];
    members: Array<ApplicationSessionMemberDescriptor & { runId: string }>;
  }): ApplicationSessionSnapshot {
    const view: ApplicationSessionView = {
      delivery: { current: null },
      members: sortMembers(
        input.members.map((member) => ({
          memberRouteKey: member.memberRouteKey,
          displayName: member.displayName,
          teamPath: [...member.teamPath],
          runtimeTarget: {
            runId: member.runId,
            runtimeKind: member.runtimeKind,
          },
          artifactsByKey: {},
          primaryArtifactKey: null,
          progressByKey: {},
          primaryProgressKey: null,
        })),
      ),
    };

    return {
      applicationSessionId: input.applicationSessionId,
      application: {
        applicationId: input.application.id,
        localApplicationId: input.application.localApplicationId,
        packageId: input.application.packageId,
        name: input.application.name,
        description: input.application.description ?? null,
        iconAssetPath: input.application.iconAssetPath ?? null,
        entryHtmlAssetPath: input.application.entryHtmlAssetPath,
        writable: input.application.writable,
      },
      runtime: input.runtime,
      view,
      createdAt: input.createdAt,
      terminatedAt: null,
    };
  }

  private async collectTeamMembers(
    teamDefinitionId: string,
    teamPath: string[],
  ): Promise<ApplicationSessionMemberDescriptor[]> {
    const definition = await this.dependencies.agentTeamDefinitionService.getDefinitionById(
      teamDefinitionId,
    );
    if (!definition) {
      throw new Error(`Agent team definition '${teamDefinitionId}' was not found.`);
    }

    const descriptors: ApplicationSessionMemberDescriptor[] = [];
    for (const node of definition.nodes) {
      if (node.refType === "agent") {
        descriptors.push({
          memberName: node.memberName,
          memberRouteKey: normalizeMemberRouteKey(node.memberName),
          displayName: node.memberName,
          teamPath: [...teamPath],
          agentDefinitionId: node.ref,
          runtimeKind: "AGENT_TEAM_MEMBER",
        });
        continue;
      }

      descriptors.push(
        ...(await this.collectTeamMembers(node.ref, [...teamPath, node.memberName.trim()])),
      );
    }

    return descriptors;
  }
}
