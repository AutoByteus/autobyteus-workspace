import type { AgentOrgMemberModelConfigIdentity, UpdateAgentOrgMemberModelConfig } from "../domain/agent-org-member-model-config.js";
import type { RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import { projectAgentOrgExecutionSnapshot } from "../../services/agent-streaming/agent-org-execution-view-projector.js";
import type { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentDefinitionService } from "../../agent-definition/services/agent-definition-service.js";
import type { AgentTeamDefinitionService } from "../../agent-team-definition/services/agent-team-definition-service.js";
import type { PlacementLaunchOverride } from "../../agent-collaboration/services/collaboration-launch-configuration-resolver.js";
import type { AgentRunIdentityAllocator } from "../../agent-execution/services/agent-run-identity-allocator.js";
import type { AgentLaunchConfiguration } from "../../agent-team-execution/domain/team-run-config.js";
import type { TeamRunIdentityAllocator } from "../../agent-team-execution/services/team-run-identity-allocator.js";
import { runtimeKindFromString, type RuntimeKind } from "../../runtime-management/runtime-kind-enum.js";
import { canonicalizeWorkspaceRootPath } from "../../workspaces/workspace-path-utils.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import type { DefinitionAdmissionService } from "../../collaboration-definition-admission/services/definition-admission-service.js";
import type { AgentOrgRun } from "../domain/agent-org-run.js";
import { AgentOrgRunManager } from "./agent-org-run-manager.js";
import { AgentOrgRunPlanner } from "./agent-org-run-planner.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentOrgRunHistoryCatalogService } from "../../run-history/services/agent-org-run-history-catalog-service.js";

export type AgentOrgLaunchConfigurationInput = Readonly<{
  runtimeKind: RuntimeKind | string;
  llmModelIdentifier: string;
  llmConfig?: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
  skillAccessMode: SkillAccessMode;
  workspaceRootPath?: string | null;
}>;

export type AgentOrgPlacementOverrideInput = Readonly<{
  address: string;
  configuration: Partial<AgentOrgLaunchConfigurationInput>;
}>;

export type CreateAgentOrgRunCommand = Readonly<{
  agentOrgDefinitionId: string;
  rootConfiguration: AgentOrgLaunchConfigurationInput;
  teamOverrides?: readonly AgentOrgPlacementOverrideInput[] | null;
  agentOverrides?: readonly AgentOrgPlacementOverrideInput[] | null;
  applicationBinding?: Readonly<{ applicationId: string; bindingId: string }> | null;
}>;

/** Public config-first AgentOrg lifecycle boundary. It never selects focus. */
export class AgentOrgRunService {
  constructor(private readonly dependencies: Readonly<{
    manager: AgentOrgRunManager;
    teamDefinitions: Pick<AgentTeamDefinitionService, "getFreshDefinitionById">;
    agentDefinitions: Pick<AgentDefinitionService, "getFreshAgentDefinitionById">;
    agentIdentities: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
    teamIdentities: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
    workspaces: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    admission: Pick<DefinitionAdmissionService, "requireAvailable">;
    modelSelectionValidator: Pick<RunModelSelectionValidator, "validate">;
    modelSelectionOptions: Pick<RunModelSelectionService, "listOptions">;
    history: Pick<AgentOrgRunHistoryCatalogService, "initialize" | "recordCreated" | "recordRestored" | "recordTerminated" | "recordRunSummary">;
  }>) {}

  async getMemberModelConfig(identity: AgentOrgMemberModelConfigIdentity) {
    const canonical = await this.dependencies.manager.getMemberModelConfig(identity);
    const current = canonical.launchConfiguration;
    const modelOptions = await this.dependencies.modelSelectionOptions.listOptions({
      runtimeKind: current.runtimeKind, currentModelIdentifier: current.llmModelIdentifier,
      workspaceRootPath: current.workspaceRootPath ?? "",
    });
    return { ...canonical, modelOptions };
  }
  updateStoppedMemberModelConfig(input: UpdateAgentOrgMemberModelConfig) {
    return this.dependencies.manager.updateStoppedMemberModelConfig(input);
  }

  async create(command: CreateAgentOrgRunCommand): Promise<AgentOrgRun> {
    const definitionId = required(command.agentOrgDefinitionId, "agentOrgDefinitionId");
    const admission = await this.dependencies.admission.requireAvailable("agent_org", definitionId);
    const definition = admission.definition;
    if (!("members" in definition)) throw new Error(`Admission returned the wrong definition subject for AgentOrg '${definitionId}'.`);
    const rootConfiguration = await this.activateWorkspace(normalizeConfiguration(command.rootConfiguration, "rootConfiguration"));
    const teamOverrides = await this.normalizeOverrides(command.teamOverrides ?? [], "teamOverrides");
    const agentOverrides = await this.normalizeOverrides(command.agentOverrides ?? [], "agentOverrides");
    const planner = new AgentOrgRunPlanner({
      getAgentById: (id) => this.dependencies.agentDefinitions.getFreshAgentDefinitionById(id),
      getTeamById: (id) => this.dependencies.teamDefinitions.getFreshDefinitionById(id),
    }, {
      allocateAgent: (id) => this.dependencies.agentIdentities.allocateForAgentDefinition(id),
      allocateTeam: (name) => this.dependencies.teamIdentities.allocateForTeamDefinitionName(name),
      allocateOrg: AgentOrgRunPlanner.defaultOrgIdentity,
    });
    const resolved = await planner.resolveConfiguration({
      definition,
      rootConfiguration,
      teamOverrides,
      agentOverrides,
    });
    await this.validateCompleteConfiguration(resolved.launch);
    const tree = await planner.build({
      definition,
      rootConfiguration,
      teamOverrides,
      agentOverrides,
      applicationBinding: command.applicationBinding ?? null,
    });
    // Establish the derived history baseline before the new current package is
    // published, otherwise a first-ever history read would discover that same
    // package and misclassify recordCreated as a duplicate.
    await this.dependencies.history.initialize();
    const run = await this.dependencies.manager.create(tree);
    try {
      await this.dependencies.history.recordCreated(run.getExecutionTreeSnapshot());
      return run;
    } catch (error) {
      await this.dependencies.manager.terminate(run.orgRunId).catch(() => false);
      throw error;
    }
  }

  private async validateCompleteConfiguration(
    launch: Awaited<ReturnType<AgentOrgRunPlanner["resolveConfiguration"]>>["launch"],
  ): Promise<void> {
    const entries = [
      ["/", launch.root] as const,
      ...[...launch.teams.entries()],
      ...[...launch.agents.entries()],
    ];
    for (const [address, configuration] of entries) {
      if (!configuration.workspaceRootPath?.trim()) {
        throw coded("AGENT_ORG_WORKSPACE_REQUIRED", `Workspace is required for AgentOrg placement '${address}'.`);
      }
      const result = await this.dependencies.modelSelectionValidator.validate({
        context: {
          runtimeKind: configuration.runtimeKind,
          currentModelIdentifier: configuration.llmModelIdentifier,
          workspaceRootPath: configuration.workspaceRootPath,
        },
        selection: {
          llmModelIdentifier: configuration.llmModelIdentifier,
          llmConfig: configuration.llmConfig,
        },
      });
      if (result.kind !== "valid") {
        const detail = result.kind === "invalid"
          ? result.errors.map((error) => `${error.path}: ${error.message}`).join("; ")
          : result.kind === "model_unavailable"
            ? "The selected model is unavailable."
            : "The selected model configuration schema is unavailable.";
        throw coded("AGENT_ORG_CONFIGURATION_INVALID", `Invalid configuration for '${address}': ${detail}`);
      }
    }
  }

  async restore(agentOrgRunId: string): Promise<AgentOrgRun> {
    const run = await this.dependencies.manager.restore(required(agentOrgRunId, "agentOrgRunId"));
    try {
      await this.dependencies.history.recordRestored(run.getExecutionTreeSnapshot());
      return run;
    } catch (error) {
      await this.dependencies.manager.terminate(run.orgRunId).catch(() => false);
      throw error;
    }
  }

  async terminate(agentOrgRunId: string): Promise<boolean> {
    const normalized = required(agentOrgRunId, "agentOrgRunId");
    const terminated = await this.dependencies.manager.terminate(normalized);
    if (terminated) await this.dependencies.history.recordTerminated(normalized);
    return terminated;
  }

  getActive(agentOrgRunId: string): AgentOrgRun | null {
    return this.dependencies.manager.getActive(required(agentOrgRunId, "agentOrgRunId"));
  }

  async getInspection(orgRunId: string) {
    return projectAgentOrgExecutionSnapshot(await this.dependencies.manager.getInspection(orgRunId));
  }

  recordRunActivity(run: AgentOrgRun, input: { summary?: string | null } = {}): Promise<void> {
    return this.dependencies.history.recordRunSummary({ orgRunId: run.orgRunId, summary: input.summary });
  }

  private async normalizeOverrides(
    values: readonly AgentOrgPlacementOverrideInput[],
    label: string,
  ): Promise<readonly PlacementLaunchOverride[]> {
    return Promise.all(values.map(async (value, index) => {
      const configuration = normalizePatch(value.configuration, `${label}[${index}].configuration`);
      const workspaceRootPath = Object.hasOwn(configuration, "workspaceRootPath")
        ? await this.activateWorkspacePath(configuration.workspaceRootPath)
        : undefined;
      return Object.freeze({
        address: required(value.address, `${label}[${index}].address`),
        configuration: Object.freeze({ ...configuration, ...(workspaceRootPath === undefined ? {} : { workspaceRootPath }) }),
      });
    }));
  }

  private async activateWorkspace(configuration: AgentLaunchConfiguration): Promise<AgentLaunchConfiguration> {
    return Object.freeze({ ...configuration, workspaceRootPath: await this.activateWorkspacePath(configuration.workspaceRootPath) ?? null });
  }

  private async activateWorkspacePath(value: string | null | undefined): Promise<string | null | undefined> {
    if (value === undefined) return undefined;
    const normalized = value?.trim() || null;
    if (!normalized) return null;
    const canonical = canonicalizeWorkspaceRootPath(normalized);
    const workspace = await this.dependencies.workspaces.ensureWorkspaceByRootPath(canonical);
    return workspace.getBasePath?.() ?? canonical;
  }
}

const normalizeConfiguration = (value: AgentOrgLaunchConfigurationInput, label: string): AgentLaunchConfiguration => ({
  runtimeKind: runtime(value.runtimeKind, `${label}.runtimeKind`),
  llmModelIdentifier: required(value.llmModelIdentifier, `${label}.llmModelIdentifier`),
  llmConfig: value.llmConfig ? Object.freeze(structuredClone(value.llmConfig)) : null,
  autoExecuteTools: Boolean(value.autoExecuteTools),
  skillAccessMode: value.skillAccessMode,
  workspaceRootPath: value.workspaceRootPath?.trim() || null,
});

const normalizePatch = (value: Partial<AgentOrgLaunchConfigurationInput>, label: string): Partial<AgentLaunchConfiguration> => {
  const patch: {
    runtimeKind?: RuntimeKind;
    llmModelIdentifier?: string;
    llmConfig?: Readonly<Record<string, unknown>> | null;
    autoExecuteTools?: boolean;
    skillAccessMode?: SkillAccessMode;
    workspaceRootPath?: string | null;
  } = {};
  if (value.runtimeKind !== undefined) patch.runtimeKind = runtime(value.runtimeKind, `${label}.runtimeKind`);
  if (value.llmModelIdentifier !== undefined) patch.llmModelIdentifier = required(value.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (Object.hasOwn(value, "llmConfig")) patch.llmConfig = value.llmConfig ? Object.freeze(structuredClone(value.llmConfig)) : null;
  if (value.autoExecuteTools !== undefined) patch.autoExecuteTools = Boolean(value.autoExecuteTools);
  if (value.skillAccessMode !== undefined) patch.skillAccessMode = value.skillAccessMode;
  if (Object.hasOwn(value, "workspaceRootPath")) patch.workspaceRootPath = value.workspaceRootPath?.trim() || null;
  return patch;
};

const runtime = (value: RuntimeKind | string, label: string): RuntimeKind => {
  const resolved = typeof value === "string" ? runtimeKindFromString(value, null) : value;
  if (!resolved) throw new Error(`${label} is invalid.`);
  return resolved;
};
const required = (value: string, label: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
const coded = (code: string, message: string): Error => Object.assign(new Error(message), { code });
