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
} from "@autobyteus/application-sdk-contracts";
import { getAgentTeamAddressBasename } from "../../agent-collaboration/domain/agent-team-address.js";
import type { ConfiguredAgentExecutionNode, ConfiguredExecutionNode } from "../../agent-team-execution/domain/team-run-execution-tree.js";
import { TeamRunService, getTeamRunService, type TeamRunMemberConfigInput } from "../../agent-team-execution/services/team-run-service.js";
import { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import { AgentRunService, getAgentRunService } from "../../agent-execution/services/agent-run-service.js";
import { RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import type { ApplicationAgentBindingRecord } from "../domain/models.js";
import { ApplicationRunBindingStore } from "../stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../stores/application-run-lookup-store.js";
import { ApplicationExecutionResourceResolver, type ResolvedApplicationExecutionResource } from "./application-execution-resource-resolver.js";
import { normalizeEffectiveRuntimeKind } from "./application-execution-resource-configuration-launch-profile.js";

const required = (value: string, field: string): string => { const result = value.trim(); if (!result) throw new Error(`${field} is required.`); return result; };
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

export class ApplicationRunBindingLaunchService {
  constructor(private readonly dependencies: {
    executionResourceResolver?: ApplicationExecutionResourceResolver;
    bindingStore?: ApplicationRunBindingStore;
    lookupStore?: ApplicationRunLookupStore;
    agentRunService?: AgentRunService;
    teamRunService?: TeamRunService;
    agentDefinitionService?: AgentDefinitionService;
  } = {}) {}
  private get resolver() { return this.dependencies.executionResourceResolver ?? new ApplicationExecutionResourceResolver(); }
  private get bindings() { return this.dependencies.bindingStore ?? new ApplicationRunBindingStore(); }
  private get lookups() { return this.dependencies.lookupStore ?? new ApplicationRunLookupStore(); }
  private get agents() { return this.dependencies.agentRunService ?? getAgentRunService(); }
  private get teams() { return this.dependencies.teamRunService ?? getTeamRunService(); }
  private get definitions() { return this.dependencies.agentDefinitionService ?? AgentDefinitionService.getInstance(); }

  async startAgentRunBinding(applicationId: string, input: ApplicationStartAgentInput): Promise<ApplicationAgentBindingRecord> {
    if (input.launch.kind !== "AGENT") throw new Error("startAgent requires launch.kind 'AGENT'.");
    const resource = await this.resolver.resolveExecutionResource(applicationId, input.executionResourceRef);
    if (resource.kind !== "AGENT") throw new Error("startAgent requires an 'AGENT' execution resource.");
    const seed = { applicationId, bindingId: randomUUID(), launchRequestId: required(input.launchRequestId, "launchRequestId") };
    return this.startAgent(seed, input.executionResourceRef, resource, input.launch);
  }

  async startAgentTeamRunBinding(applicationId: string, input: ApplicationStartAgentTeamInput): Promise<ApplicationAgentBindingRecord> {
    if (input.launch.kind !== "AGENT_TEAM") throw new Error("startAgentTeam requires launch.kind 'AGENT_TEAM'.");
    const resource = await this.resolver.resolveExecutionResource(applicationId, input.executionResourceRef);
    if (resource.kind !== "AGENT_TEAM") throw new Error("startAgentTeam requires an 'AGENT_TEAM' execution resource.");
    const seed = { applicationId, bindingId: randomUUID(), launchRequestId: required(input.launchRequestId, "launchRequestId") };
    return this.startTeam(seed, input.executionResourceRef, resource, input.launch);
  }

  private async startAgent(seed: { applicationId: string; bindingId: string; launchRequestId: string }, ref: ApplicationExecutionResourceRef, resource: ResolvedApplicationExecutionResource, launch: ApplicationAgentRunLaunch): Promise<ApplicationAgentBindingRecord> {
    const runtimeKind = normalizeEffectiveRuntimeKind(launch.runtimeKind);
    await this.validateCurrentModelSelection(runtimeKind, launch.llmModelIdentifier);
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
    const binding: ApplicationAgentBindingRecord = {
      ...seed, status: "ATTACHED", executionResourceRef: structuredClone(ref),
      runtime: { subject: "AGENT_RUN", agentRunId: run.runId, definitionId: resource.definitionId, members: [] },
      createdAt: now, updatedAt: now, terminatedAt: null, lastErrorMessage: null,
    };
    return this.persist(binding);
  }

  private async startTeam(seed: { applicationId: string; bindingId: string; launchRequestId: string }, ref: ApplicationExecutionResourceRef, resource: ResolvedApplicationExecutionResource, launch: ApplicationTeamRunLaunch): Promise<ApplicationAgentBindingRecord> {
    const rootConfig = this.explicitRootConfig(
      launch.mode === "preset" ? launch.launchPreset : launch.teamDefaultConfig,
    );
    const normalizedConfigs = launch.mode === "memberConfigs"
      ? launch.memberConfigs.map((config) => this.explicitConfig(config))
      : null;
    await this.validateCurrentModelSelection(rootConfig.runtimeKind, rootConfig.llmModelIdentifier);
    for (const config of normalizedConfigs ?? []) {
      const runtimeKind = normalizeEffectiveRuntimeKind(config.runtimeKind);
      await this.validateCurrentModelSelection(runtimeKind, config.llmModelIdentifier);
    }
    const teamRunId = await this.teams.allocateTeamRunId(resource.definitionId);
    const teamRun = await this.teams.createTeamRunFromRootConfig({
      teamDefinitionId: resource.definitionId,
      teamRunId,
      rootConfig,
      memberConfigs: normalizedConfigs,
      applicationBinding: { applicationId: seed.applicationId, bindingId: seed.bindingId },
    });
    const members: ApplicationAgentTeamBindingMember[] = configuredAgents(teamRun.getExecutionTreeSnapshot().rootTeam.members).map((node) => ({
      memberAddress: node.address,
      displayName: getAgentTeamAddressBasename(node.address) ?? node.address,
      agentRunId: node.agentRunId,
      runtimeKind: "AGENT_TEAM_MEMBER",
    }));
    const now = new Date().toISOString();
    const binding: ApplicationAgentBindingRecord = {
      ...seed, status: "ATTACHED", executionResourceRef: structuredClone(ref),
      runtime: { subject: "TEAM_RUN", teamRunId: teamRun.teamRunId, definitionId: resource.definitionId, members },
      createdAt: now, updatedAt: now, terminatedAt: null, lastErrorMessage: null,
    };
    return this.persist(binding);
  }

  private explicitRootConfig(input: ApplicationTeamRunPreset) {
    return {
      workspaceRootPath: required(input.workspaceRootPath, "teamDefaultConfig.workspaceRootPath"),
      llmModelIdentifier: required(input.llmModelIdentifier, "teamDefaultConfig.llmModelIdentifier"),
      autoExecuteTools: Boolean(input.autoExecuteTools),
      skillAccessMode: skillMode(input.skillAccessMode),
      runtimeKind: normalizeEffectiveRuntimeKind(input.runtimeKind),
      llmConfig: input.llmConfig ?? null,
    };
  }

  private explicitConfig(input: ApplicationTeamMemberLaunchConfig): TeamRunMemberConfigInput {
    return {
      memberAddress: input.memberAddress,
      agentDefinitionId: input.agentDefinitionId,
      llmModelIdentifier: input.llmModelIdentifier,
      autoExecuteTools: Boolean(input.autoExecuteTools),
      skillAccessMode: skillMode(input.skillAccessMode),
      workspaceRootPath: input.workspaceRootPath?.trim() || null,
      llmConfig: input.llmConfig ?? null,
      runtimeKind: normalizeEffectiveRuntimeKind(input.runtimeKind),
    };
  }

  private async validateCurrentModelSelection(runtimeKind: RuntimeKind, modelIdentifier: string): Promise<void> {
    if (runtimeKind !== RuntimeKind.AUTOBYTEUS) return;
    await LLMFactory.requireCurrentModelIdentifier(modelIdentifier);
  }

  private async persist(binding: ApplicationAgentBindingRecord): Promise<ApplicationAgentBindingRecord> {
    await this.bindings.persistBinding(binding);
    this.lookups.replaceBindingLookups(binding.applicationId, binding.bindingId, collectRunIds(binding));
    return binding;
  }
}
