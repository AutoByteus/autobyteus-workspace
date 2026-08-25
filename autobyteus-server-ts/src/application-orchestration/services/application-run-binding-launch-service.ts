import { randomUUID } from "node:crypto";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type {
  ApplicationAgentRunLaunch,
  ApplicationAgentTeamBindingMember,
  ApplicationExecutionResourceRef,
  ApplicationStartAgentInput,
  ApplicationStartAgentTeamInput,
  ApplicationTeamMemberLaunchConfig,
  ApplicationTeamRunLaunch,
  ApplicationTeamRunPreset,
  ApplicationTeamScopeLaunchConfig,
} from "@autobyteus/application-sdk-contracts";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type {
  ConfiguredAgentExecutionNode,
  ConfiguredExecutionNode,
} from "../../agent-team-execution/domain/team-run-execution-tree.js";
import type {
  TeamRunMemberConfigInput,
  TeamRunService,
  TeamRunTeamConfigInput,
} from "../../agent-team-execution/services/team-run-service.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentRunService } from "../../agent-execution/services/agent-run-service.js";
import type { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import type {
  ApplicationCurrentModelSelectionPolicy,
} from "../../application-platform/launch-configuration/application-current-model-selection-policy.js";
import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import {
  ApplicationExecutionResourceResolver,
  type ResolvedApplicationExecutionResource,
} from "./application-execution-resource-resolver.js";

const required = (value: string, field: string): string => {
  const result = value.trim();
  if (!result) throw new Error(`${field} is required.`);
  return result;
};
const skillMode = (value: SkillAccessMode | string | null | undefined): SkillAccessMode => {
  if (value == null || value === SkillAccessMode.PRELOADED_ONLY) return SkillAccessMode.PRELOADED_ONLY;
  if (value === SkillAccessMode.NONE) return SkillAccessMode.NONE;
  throw new Error(`Unsupported skillAccessMode '${value}'.`);
};
const collectRunIds = (binding: ApplicationAgentBindingRecord): string[] => binding.runtime.subject === "AGENT_RUN"
  ? [binding.runtime.agentRunId]
  : [binding.runtime.teamRunId, ...binding.runtime.members.map((member) => member.agentRunId)];
const configuredAgents = (members: readonly ConfiguredExecutionNode[]): ConfiguredAgentExecutionNode[] => {
  const result: ConfiguredAgentExecutionNode[] = [];
  for (const member of members) {
    if ("agentRunId" in member) result.push(member);
    else result.push(...configuredAgents(member.members));
  }
  return result;
};

type BindingSeed = {
  applicationId: string;
  bindingId: string;
  launchRequestId: string;
};

export class ApplicationRunBindingLaunchService {
  constructor(private readonly dependencies: {
    executionResourceResolver: ApplicationExecutionResourceResolver;
    bindingStore: ApplicationRunBindingStore;
    lookupStore: ApplicationRunLookupStore;
    agentRunService: AgentRunService;
    teamRunService: TeamRunService;
    agentDefinitionService: AgentDefinitionService;
    currentModelSelectionPolicy: ApplicationCurrentModelSelectionPolicy;
  }) {}
  private get resolver() { return this.dependencies.executionResourceResolver; }
  private get bindings() { return this.dependencies.bindingStore; }
  private get lookups() { return this.dependencies.lookupStore; }
  private get agents() { return this.dependencies.agentRunService; }
  private get teams() { return this.dependencies.teamRunService; }
  private get definitions() { return this.dependencies.agentDefinitionService; }
  private get currentModels() { return this.dependencies.currentModelSelectionPolicy; }

  async startAgentRunBinding(
    applicationId: string,
    input: ApplicationStartAgentInput,
  ): Promise<ApplicationAgentBindingRecord> {
    if (input.launch.kind !== "AGENT") throw new Error("startAgent requires launch.kind 'AGENT'.");
    const resource = await this.resolver.resolveExecutionResource(applicationId, input.executionResourceRef);
    if (resource.kind !== "AGENT") throw new Error("startAgent requires an 'AGENT' execution resource.");
    const seed = {
      applicationId,
      bindingId: randomUUID(),
      launchRequestId: required(input.launchRequestId, "launchRequestId"),
    };
    return this.startAgent(seed, input.executionResourceRef, resource, input.launch);
  }

  async startAgentTeamRunBinding(
    applicationId: string,
    input: ApplicationStartAgentTeamInput,
  ): Promise<ApplicationAgentBindingRecord> {
    if (input.launch.kind !== "AGENT_TEAM") throw new Error("startAgentTeam requires launch.kind 'AGENT_TEAM'.");
    const resource = await this.resolver.resolveExecutionResource(applicationId, input.executionResourceRef);
    if (resource.kind !== "AGENT_TEAM") throw new Error("startAgentTeam requires an 'AGENT_TEAM' execution resource.");
    const seed = {
      applicationId,
      bindingId: randomUUID(),
      launchRequestId: required(input.launchRequestId, "launchRequestId"),
    };
    return this.startTeam(seed, input.executionResourceRef, resource, input.launch);
  }

  private async startAgent(
    seed: BindingSeed,
    ref: ApplicationExecutionResourceRef,
    resource: ResolvedApplicationExecutionResource,
    launch: ApplicationAgentRunLaunch,
  ): Promise<ApplicationAgentBindingRecord> {
    const runtimeKind = await this.currentModels.requireCurrentSelection({
      runtimeKind: launch.runtimeKind,
      llmModelIdentifier: launch.llmModelIdentifier,
    });
    const definition = await this.definitions.getAgentDefinitionById(resource.definitionId);
    const displayName = definition?.name?.trim() || resource.name;
    const run = await this.agents.createAgentRun({
      agentDefinitionId: resource.definitionId,
      workspaceRootPath: launch.workspaceRootPath,
      workspaceId: launch.workspaceId ?? null,
      llmModelIdentifier: launch.llmModelIdentifier,
      autoExecuteTools: Boolean(launch.autoExecuteTools),
      llmConfig: launch.llmConfig ?? null,
      skillAccessMode: skillMode(launch.skillAccessMode),
      runtimeKind,
      applicationBinding: {
        applicationId: seed.applicationId,
        bindingId: seed.bindingId,
        displayName,
        runtimeKind: "AGENT",
      },
    });
    const now = new Date().toISOString();
    return this.persist({
      ...seed,
      status: "ATTACHED",
      executionResourceRef: structuredClone(ref),
      runtime: {
        subject: "AGENT_RUN",
        agentRunId: run.runId,
        definitionId: resource.definitionId,
        members: [],
      },
      createdAt: now,
      updatedAt: now,
      terminatedAt: null,
      lastErrorMessage: null,
    });
  }

  private async startTeam(
    seed: BindingSeed,
    ref: ApplicationExecutionResourceRef,
    resource: ResolvedApplicationExecutionResource,
    launch: ApplicationTeamRunLaunch,
  ): Promise<ApplicationAgentBindingRecord> {
    const applicationBinding = {
      applicationId: seed.applicationId,
      bindingId: seed.bindingId,
    };
    const teamRun = launch.mode === "preset"
      ? await this.startPresetTeam(resource.definitionId, launch.launchPreset, applicationBinding)
      : await this.startConfiguredTeam(
          resource.definitionId,
          launch.teamConfigs,
          launch.memberConfigs,
          applicationBinding,
        );
    const members: ApplicationAgentTeamBindingMember[] = configuredAgents(
      teamRun.getExecutionTreeSnapshot().rootTeam.members,
    ).map((node) => ({
      memberAddress: node.address,
      displayName: getAgentTeamAddressBasename(node.address) ?? node.address,
      agentRunId: node.agentRunId,
      runtimeKind: "AGENT_TEAM_MEMBER",
    }));
    const now = new Date().toISOString();
    return this.persist({
      ...seed,
      status: "ATTACHED",
      executionResourceRef: structuredClone(ref),
      runtime: {
        subject: "TEAM_RUN",
        teamRunId: teamRun.teamRunId,
        definitionId: resource.definitionId,
        members,
      },
      createdAt: now,
      updatedAt: now,
      terminatedAt: null,
      lastErrorMessage: null,
    });
  }

  private async startPresetTeam(
    teamDefinitionId: string,
    preset: ApplicationTeamRunPreset,
    applicationBinding: { applicationId: string; bindingId: string },
  ) {
    const rootConfig = this.explicitRootConfig(preset);
    await this.requireCurrentSelection(rootConfig);
    return this.teams.createTeamRunFromRootConfig({
      teamDefinitionId,
      rootConfig,
      applicationBinding,
    });
  }

  private async startConfiguredTeam(
    teamDefinitionId: string,
    teamConfigsInput: readonly ApplicationTeamScopeLaunchConfig[],
    memberConfigsInput: readonly ApplicationTeamMemberLaunchConfig[],
    applicationBinding: { applicationId: string; bindingId: string },
  ) {
    const teamConfigs = teamConfigsInput.map((config) => this.explicitTeamConfig(config));
    const memberConfigs = memberConfigsInput.map((config) => this.explicitMemberConfig(config));
    for (const config of [...teamConfigs, ...memberConfigs]) {
      await this.requireCurrentSelection(config);
    }
    return this.teams.createTeamRun({
      teamDefinitionId,
      teamConfigs,
      memberConfigs,
      applicationBinding,
    });
  }

  private explicitRootConfig(input: ApplicationTeamRunPreset) {
    return {
      workspaceRootPath: required(input.workspaceRootPath, "launchPreset.workspaceRootPath"),
      llmModelIdentifier: required(input.llmModelIdentifier, "launchPreset.llmModelIdentifier"),
      autoExecuteTools: Boolean(input.autoExecuteTools),
      skillAccessMode: skillMode(input.skillAccessMode),
      runtimeKind: this.requireNormalizedRuntimeKind(input.runtimeKind),
      llmConfig: input.llmConfig ?? null,
    };
  }

  private explicitTeamConfig(input: ApplicationTeamScopeLaunchConfig): TeamRunTeamConfigInput {
    return {
      teamAddress: required(input.teamAddress, "teamConfig.teamAddress"),
      llmModelIdentifier: required(input.llmModelIdentifier, "teamConfig.llmModelIdentifier"),
      autoExecuteTools: Boolean(input.autoExecuteTools),
      skillAccessMode: skillMode(input.skillAccessMode),
      workspaceRootPath: required(input.workspaceRootPath, "teamConfig.workspaceRootPath"),
      llmConfig: input.llmConfig ?? null,
      runtimeKind: this.requireNormalizedRuntimeKind(input.runtimeKind),
    };
  }

  private explicitMemberConfig(input: ApplicationTeamMemberLaunchConfig): TeamRunMemberConfigInput {
    return {
      memberAddress: required(input.memberAddress, "memberConfig.memberAddress"),
      agentDefinitionId: required(input.agentDefinitionId, "memberConfig.agentDefinitionId"),
      llmModelIdentifier: required(input.llmModelIdentifier, "memberConfig.llmModelIdentifier"),
      autoExecuteTools: Boolean(input.autoExecuteTools),
      skillAccessMode: skillMode(input.skillAccessMode),
      workspaceRootPath: required(input.workspaceRootPath, "memberConfig.workspaceRootPath"),
      llmConfig: input.llmConfig ?? null,
      runtimeKind: this.requireNormalizedRuntimeKind(input.runtimeKind),
    };
  }

  private requireNormalizedRuntimeKind(value: unknown): RuntimeKind {
    const runtimeKind = this.currentModels.normalizeRuntimeKind(value);
    if (!runtimeKind) {
      throw new Error(`Unsupported application runtimeKind '${String(value)}'.`);
    }
    return runtimeKind;
  }

  private async requireCurrentSelection(input: {
    runtimeKind: unknown;
    llmModelIdentifier: string;
  }): Promise<void> {
    await this.currentModels.requireCurrentSelection({
      runtimeKind: input.runtimeKind,
      llmModelIdentifier: input.llmModelIdentifier,
    });
  }

  private async persist(
    binding: ApplicationAgentBindingRecord,
  ): Promise<ApplicationAgentBindingRecord> {
    await this.bindings.persistBinding(binding);
    this.lookups.replaceBindingLookups(
      binding.applicationId,
      binding.bindingId,
      collectRunIds(binding),
    );
    return binding;
  }
}
