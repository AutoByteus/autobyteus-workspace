import { randomUUID } from "node:crypto";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { buildTeamLocalAgentDefinitionId } from "autobyteus-ts/agent-team/utils/team-local-agent-definition-id.js";
import type {
  ApplicationAgentRunLaunch,
  ApplicationRunBindingMemberSummary,
  ApplicationRunBindingSummary,
  ApplicationRuntimeResourceRef,
  ApplicationStartRunInput,
  ApplicationTeamMemberLaunchConfig,
  ApplicationTeamRunLaunch,
} from "@autobyteus/application-sdk-contracts";
import { normalizeMemberRouteKey } from "../../run-history/utils/team-member-run-id.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentRunService, getAgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import { TeamRunService, getTeamRunService } from "../../agent-team-execution/services/team-run-service.js";
import type { TeamMemberRunConfig } from "../../agent-team-execution/domain/team-run-config.js";
import type { ApplicationExecutionContext } from "../domain/models.js";
import {
  ApplicationRuntimeResourceResolver,
  type ResolvedApplicationRuntimeResource,
} from "./application-runtime-resource-resolver.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";

type TeamMemberDescriptor = {
  memberName: string;
  memberRouteKey: string;
  displayName: string;
  teamPath: string[];
  agentDefinitionId: string;
};

const collectBindingRunIds = (binding: ApplicationRunBindingSummary): string[] =>
  Array.from(
    new Set([
      binding.runtime.runId,
      ...binding.runtime.members.map((member) => member.runId),
    ]),
  );

const toSkillAccessMode = (
  value: SkillAccessMode | string | null | undefined,
): SkillAccessMode => {
  if (value === SkillAccessMode.GLOBAL_DISCOVERY || value === SkillAccessMode.NONE) {
    return value;
  }
  return SkillAccessMode.PRELOADED_ONLY;
};

const requireLaunchKind = (
  resource: ResolvedApplicationRuntimeResource,
  launch: ApplicationStartRunInput["launch"],
): void => {
  if (resource.kind !== launch.kind) {
    throw new Error(
      `Runtime launch kind '${launch.kind}' does not match runtime resource kind '${resource.kind}'.`,
    );
  }
};

const requireNonEmptyString = (value: string, fieldName: string): string => {
  const normalized = value.trim();
  if (!normalized) {
    throw new Error(`${fieldName} is required.`);
  }
  return normalized;
};

export class ApplicationRunBindingLaunchService {
  constructor(
    private readonly dependencies: {
      resourceResolver?: ApplicationRuntimeResourceResolver;
      bindingStore?: ApplicationRunBindingStore;
      lookupStore?: ApplicationRunLookupStore;
      agentRunService?: AgentRunService;
      teamRunService?: TeamRunService;
      agentDefinitionService?: AgentDefinitionService;
      agentTeamDefinitionService?: AgentTeamDefinitionService;
    } = {},
  ) {}

  private get resourceResolver(): ApplicationRuntimeResourceResolver {
    return this.dependencies.resourceResolver ?? new ApplicationRuntimeResourceResolver();
  }

  private get bindingStore(): ApplicationRunBindingStore {
    return this.dependencies.bindingStore ?? new ApplicationRunBindingStore();
  }

  private get lookupStore(): ApplicationRunLookupStore {
    return this.dependencies.lookupStore ?? new ApplicationRunLookupStore();
  }

  private get agentRunService(): AgentRunService {
    return this.dependencies.agentRunService ?? getAgentRunService();
  }

  private get teamRunService(): TeamRunService {
    return this.dependencies.teamRunService ?? getTeamRunService();
  }

  private get agentDefinitionService(): AgentDefinitionService {
    return this.dependencies.agentDefinitionService ?? AgentDefinitionService.getInstance();
  }

  private get agentTeamDefinitionService(): AgentTeamDefinitionService {
    return this.dependencies.agentTeamDefinitionService ?? AgentTeamDefinitionService.getInstance();
  }

  async startRunBinding(
    applicationId: string,
    input: ApplicationStartRunInput,
  ): Promise<ApplicationRunBindingSummary> {
    const resource = await this.resourceResolver.resolveResource(applicationId, input.resourceRef);
    requireLaunchKind(resource, input.launch);

    const bindingSeed = {
      applicationId,
      bindingId: randomUUID(),
      bindingIntentId: requireNonEmptyString(input.bindingIntentId, "bindingIntentId"),
    };

    if (input.launch.kind === "AGENT") {
      return this.startAgentBinding(bindingSeed, input.resourceRef, resource, input.launch);
    }

    return this.startTeamBinding(bindingSeed, input.resourceRef, resource, input.launch);
  }

  private async startAgentBinding(
    bindingSeed: { applicationId: string; bindingId: string; bindingIntentId: string },
    resourceRef: ApplicationRuntimeResourceRef,
    resource: ResolvedApplicationRuntimeResource,
    launch: ApplicationAgentRunLaunch,
  ): Promise<ApplicationRunBindingSummary> {
    const memberSummary = await this.buildSingleAgentMemberSummary(resource);
    const applicationExecutionContext = this.buildExecutionContext(bindingSeed, memberSummary);
    const agentRun = await this.agentRunService.createAgentRun({
      agentDefinitionId: resource.definitionId,
      workspaceRootPath: launch.workspaceRootPath,
      workspaceId: launch.workspaceId ?? null,
      llmModelIdentifier: launch.llmModelIdentifier,
      autoExecuteTools: Boolean(launch.autoExecuteTools),
      llmConfig: launch.llmConfig ?? null,
      skillAccessMode: toSkillAccessMode(launch.skillAccessMode),
      runtimeKind: launch.runtimeKind ?? RuntimeKind.AUTOBYTEUS,
      applicationExecutionContext,
    });
    applicationExecutionContext.producer.runId = agentRun.runId;

    const now = new Date().toISOString();
    const binding: ApplicationRunBindingSummary = {
      bindingId: bindingSeed.bindingId,
      applicationId: bindingSeed.applicationId,
      bindingIntentId: bindingSeed.bindingIntentId,
      status: "ATTACHED",
      resourceRef: structuredClone(resourceRef),
      runtime: {
        subject: "AGENT_RUN",
        runId: agentRun.runId,
        definitionId: resource.definitionId,
        members: [{ ...memberSummary, runId: agentRun.runId }],
      },
      createdAt: now,
      updatedAt: now,
      terminatedAt: null,
      lastErrorMessage: null,
    };
    await this.bindingStore.persistBinding(binding);
    this.lookupStore.replaceBindingLookups(bindingSeed.applicationId, binding.bindingId, collectBindingRunIds(binding));
    return binding;
  }

  private async startTeamBinding(
    bindingSeed: { applicationId: string; bindingId: string; bindingIntentId: string },
    resourceRef: ApplicationRuntimeResourceRef,
    resource: ResolvedApplicationRuntimeResource,
    launch: ApplicationTeamRunLaunch,
  ): Promise<ApplicationRunBindingSummary> {
    const memberDescriptors = await this.collectTeamMemberDescriptors(resource.definitionId);
    const memberConfigs = launch.mode === "preset"
      ? await this.teamRunService.buildMemberConfigsFromLaunchPreset({
          teamDefinitionId: resource.definitionId,
          launchPreset: {
            workspaceRootPath: launch.launchPreset.workspaceRootPath,
            llmModelIdentifier: launch.launchPreset.llmModelIdentifier,
            autoExecuteTools: Boolean(launch.launchPreset.autoExecuteTools),
            skillAccessMode: toSkillAccessMode(launch.launchPreset.skillAccessMode),
            runtimeKind: (launch.launchPreset.runtimeKind ?? RuntimeKind.AUTOBYTEUS) as RuntimeKind,
            llmConfig: launch.launchPreset.llmConfig ?? null,
          },
        })
      : this.buildExplicitMemberConfigs(resource.definitionId, memberDescriptors, launch.memberConfigs);

    const memberConfigByRouteKey = new Map<string, TeamMemberRunConfig>();
    const applicationExecutionContextByRouteKey = new Map<string, ApplicationExecutionContext>();
    for (const memberConfig of memberConfigs) {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const descriptor = memberDescriptors.find((entry) => entry.memberRouteKey === memberRouteKey);
      if (!descriptor) {
        throw new Error(`Team launch member '${memberConfig.memberName}' is not part of the bound team.`);
      }
      const applicationExecutionContext = this.buildExecutionContext(
        bindingSeed,
        this.buildTeamMemberSummary(descriptor, ""),
      );
      applicationExecutionContextByRouteKey.set(memberRouteKey, applicationExecutionContext);
      memberConfigByRouteKey.set(memberRouteKey, {
        ...memberConfig,
        memberRouteKey,
        agentDefinitionId: descriptor.agentDefinitionId,
        applicationExecutionContext,
      });
    }

    const teamRun = await this.teamRunService.createTeamRun({
      teamDefinitionId: resource.definitionId,
      memberConfigs: memberDescriptors.map((descriptor) => {
        const memberConfig = memberConfigByRouteKey.get(descriptor.memberRouteKey);
        if (!memberConfig) {
          throw new Error(`Team launch member '${descriptor.memberName}' is missing launch configuration.`);
        }
        return memberConfig;
      }),
    });

    const runtimeMemberConfigs = teamRun.config?.memberConfigs ?? [];
    const runtimeMembers = memberDescriptors.map((descriptor) => {
      const memberConfig = runtimeMemberConfigs.find(
        (entry) => normalizeMemberRouteKey(entry.memberRouteKey ?? entry.memberName) === descriptor.memberRouteKey,
      );
      const memberRunId = memberConfig?.memberRunId?.trim() || teamRun.runId;
      const applicationExecutionContext = applicationExecutionContextByRouteKey.get(descriptor.memberRouteKey);
      if (applicationExecutionContext) {
        applicationExecutionContext.producer.runId = memberRunId;
      }
      return this.buildTeamMemberSummary(
        descriptor,
        memberRunId,
      );
    });

    const now = new Date().toISOString();
    const binding: ApplicationRunBindingSummary = {
      bindingId: bindingSeed.bindingId,
      applicationId: bindingSeed.applicationId,
      bindingIntentId: bindingSeed.bindingIntentId,
      status: "ATTACHED",
      resourceRef: structuredClone(resourceRef),
      runtime: {
        subject: "TEAM_RUN",
        runId: teamRun.runId,
        definitionId: resource.definitionId,
        members: runtimeMembers,
      },
      createdAt: now,
      updatedAt: now,
      terminatedAt: null,
      lastErrorMessage: null,
    };
    await this.bindingStore.persistBinding(binding);
    this.lookupStore.replaceBindingLookups(bindingSeed.applicationId, binding.bindingId, collectBindingRunIds(binding));
    return binding;
  }

  private async buildSingleAgentMemberSummary(
    resource: ResolvedApplicationRuntimeResource,
  ): Promise<ApplicationRunBindingMemberSummary> {
    const definition = await this.agentDefinitionService.getAgentDefinitionById(resource.definitionId);
    const memberName = resource.localId ?? (definition?.name?.trim() || resource.definitionId);
    return {
      memberName,
      memberRouteKey: normalizeMemberRouteKey(memberName),
      displayName: definition?.name?.trim() || resource.name,
      teamPath: [],
      runId: "",
      runtimeKind: "AGENT",
    };
  }

  private buildTeamMemberSummary(
    descriptor: TeamMemberDescriptor,
    runId: string,
  ): ApplicationRunBindingMemberSummary {
    return {
      memberName: descriptor.memberName,
      memberRouteKey: descriptor.memberRouteKey,
      displayName: descriptor.displayName,
      teamPath: [...descriptor.teamPath],
      runId,
      runtimeKind: "AGENT_TEAM_MEMBER",
    };
  }

  private buildExecutionContext(
    bindingSeed: { applicationId: string; bindingId: string; bindingIntentId: string },
    member: ApplicationRunBindingMemberSummary,
  ): ApplicationExecutionContext {
    return {
      applicationId: bindingSeed.applicationId,
      bindingId: bindingSeed.bindingId,
      producer: {
        runId: member.runId,
        memberRouteKey: member.memberRouteKey,
        memberName: member.memberName,
        displayName: member.displayName,
        teamPath: [...member.teamPath],
        runtimeKind: member.runtimeKind,
      },
    };
  }

  private buildExplicitMemberConfigs(
    teamDefinitionId: string,
    memberDescriptors: TeamMemberDescriptor[],
    memberConfigs: ApplicationTeamMemberLaunchConfig[],
  ): TeamMemberRunConfig[] {
    const descriptorByRouteKey = new Map(
      memberDescriptors.map((descriptor) => [descriptor.memberRouteKey, descriptor]),
    );
    return memberConfigs.map((memberConfig) => {
      const memberRouteKey = normalizeMemberRouteKey(
        memberConfig.memberRouteKey ?? memberConfig.memberName,
      );
      const descriptor = descriptorByRouteKey.get(memberRouteKey);
      if (!descriptor) {
        throw new Error(`Team launch member '${memberConfig.memberName}' is not part of team '${teamDefinitionId}'.`);
      }
      if (
        memberConfig.agentDefinitionId?.trim()
        && memberConfig.agentDefinitionId.trim() !== descriptor.agentDefinitionId
      ) {
        throw new Error(
          `Team launch member '${memberConfig.memberName}' cannot override agentDefinitionId '${memberConfig.agentDefinitionId}'.`,
        );
      }
      return {
        memberName: descriptor.memberName,
        memberRouteKey: descriptor.memberRouteKey,
        agentDefinitionId: descriptor.agentDefinitionId,
        llmModelIdentifier: memberConfig.llmModelIdentifier,
        autoExecuteTools: Boolean(memberConfig.autoExecuteTools),
        skillAccessMode: toSkillAccessMode(memberConfig.skillAccessMode),
        workspaceId: memberConfig.workspaceId ?? null,
        workspaceRootPath: memberConfig.workspaceRootPath?.trim() || null,
        llmConfig: memberConfig.llmConfig ?? null,
        runtimeKind: (memberConfig.runtimeKind ?? RuntimeKind.AUTOBYTEUS) as RuntimeKind,
      } satisfies TeamMemberRunConfig;
    });
  }

  private async collectTeamMemberDescriptors(
    teamDefinitionId: string,
    teamPath: string[] = [],
  ): Promise<TeamMemberDescriptor[]> {
    const definition = await this.agentTeamDefinitionService.getDefinitionById(teamDefinitionId);
    if (!definition) {
      throw new Error(`Agent team definition '${teamDefinitionId}' was not found.`);
    }

    const descriptors: TeamMemberDescriptor[] = [];
    for (const node of definition.nodes) {
      if (node.refType === "agent") {
        descriptors.push({
          memberName: node.memberName,
          memberRouteKey: normalizeMemberRouteKey(node.memberName),
          displayName: node.memberName,
          teamPath: [...teamPath],
          agentDefinitionId: node.refScope === "team_local"
            ? buildTeamLocalAgentDefinitionId(teamDefinitionId, node.ref)
            : node.ref,
        });
        continue;
      }
      descriptors.push(
        ...(await this.collectTeamMemberDescriptors(node.ref, [...teamPath, node.memberName.trim()])),
      );
    }
    return descriptors;
  }
}
