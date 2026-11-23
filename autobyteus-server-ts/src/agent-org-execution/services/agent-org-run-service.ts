import { TokenUsageCapability } from "../../token-usage/providers/token-usage-capability.js";
import { rootRestoreRefusal, unrestorableRoot, type RootRestoreRefusal } from "../../agent-collaboration/execution/services/root-restore-admission.js";
import type { DelegatedWorkGuard } from "../../run-history/services/delegated-work-guard.js";
import type { EpisodicCatalog } from "../../agent-episodic-catalog/services/episodic-catalog.js";
import type { UpdateStoppedAgentOrgRunConfig, TeamWorkspacePatch } from "../domain/agent-org-run-config.js";
import type { RemoteInboundQuery, StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import { listAgentOrgRunSelectionScopes, applyAgentOrgTeamWorkspacePatches, resolveAgentOrgTeamWorkspacePatches } from "./agent-org-run-config-mutator.js";
import type { RunModelSelectionService } from "../../llm-management/services/run-model-selection-service.js";
import { projectAgentOrgExecutionSnapshot } from "../../services/agent-streaming/agent-org-execution-view-projector.js";
import { projectAgentOrgExecutionTree } from "../../services/agent-streaming/collaboration-execution-tree-dto-projection.js";
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
import { AgentOrgRunManager, type LiveAgentOrg } from "./agent-org-run-manager.js";
import { planAgentOrgContainer } from "../container/agent-org-container-plan.js";
import { AgentOrgRunPlanner, type ResolvedAgentOrgLaunchPlan } from "./agent-org-run-planner.js";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { isUnavailableModelSelection, runModelSelectionRefusal } from "../../llm-management/services/run-model-selection-refusal.js";
import type { AgentOrgRunHistoryCatalogService } from "../../run-history/services/agent-org-run-history-catalog-service.js";
import { createRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { getProjectTaskService, type ProjectTaskService } from "../../projects/services/project-task-service.js";

export type AgentOrgLaunchConfigurationInput = Readonly<{
  runtimeKind: RuntimeKind | string;
  llmModelIdentifier: string;
  llmConfig?: Readonly<Record<string, unknown>> | null;
  autoExecuteTools: boolean;
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
    teamDefinitions: Pick<AgentTeamDefinitionService, "getDefinitionById">;
    agentDefinitions: Pick<AgentDefinitionService, "getAgentDefinitionById">;
    agentIdentities: Pick<AgentRunIdentityAllocator, "allocateForAgentDefinition">;
    teamIdentities: Pick<TeamRunIdentityAllocator, "allocateForTeamDefinitionName">;
    workspaces: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
    admission: Pick<DefinitionAdmissionService, "requireAvailable">;
    modelSelectionValidator: RunModelSelectionValidator;
    modelSelectionOptions: Pick<RunModelSelectionService, "listOptions" | "listOptionsMany">;
    history: Pick<AgentOrgRunHistoryCatalogService, "recordCreated" | "recordRestored" | "recordTerminated" | "recordRunSummary" | "archiveStored" | "deleteStored">;
    /** Removes the ad-hoc Tasks of a permanently deleted run; defaults to the process Task service. */
    adHocTasks?: Pick<ProjectTaskService, "deleteAdHocTasksDelegatedFrom">;
    /** Archive and delete wait for the runs it delegated to (REQ-007). */
    workGuard: Pick<DelegatedWorkGuard, "guard">;
    /** Told after a committed delete, so the run's members leave the episodic catalogs. */
    episodicCatalog: Pick<EpisodicCatalog, "runDeleted">;
    /** Base's token-usage restore check (SR-078); defaults to the process capability. */
    tokenUsage?: Pick<TokenUsageCapability, "assertExistingRunRestoreReady">;
  }>) {}

  /**
   * The stored Org tree as the wire carries it. A configured Agent's pending runtime switch is server state and is not on the
   * wire (autobyteus-348, contract §6), so every Org tree this service returns as JSON goes through this one projection.
   */
  async getRunConfig(orgRunId: string) {
    const config = await this.dependencies.manager.getRunConfig(orgRunId);
    return Object.freeze({ ...config, executionTree: projectAgentOrgExecutionTree(config.executionTree) });
  }
  async runModelOptions(orgRunId: string, teamWorkspacePatches: readonly TeamWorkspacePatch[] = []) {
    const canonical = await this.dependencies.manager.getRunConfig(orgRunId);
    const patches = resolveAgentOrgTeamWorkspacePatches(canonical.executionTree, teamWorkspacePatches)
      .map(patch => ({ ...patch, workspaceRootPath: canonicalizeWorkspaceRootPath(patch.workspaceRootPath) }));
    const scopes = listAgentOrgRunSelectionScopes(applyAgentOrgTeamWorkspacePatches(canonical.executionTree, patches));
    const options = await this.dependencies.modelSelectionOptions.listOptionsMany(scopes.map(({ scopeKind, launchConfiguration }) => ({
      runtimeKind: launchConfiguration.runtimeKind,
      currentModelIdentifier: launchConfiguration.llmModelIdentifier,
      workspaceRootPath: launchConfiguration.workspaceRootPath ?? process.cwd(),
      // A configured Agent can hand over; the Org's and a mounted Team's own default scopes have no session (DEC-007).
      handOver: scopeKind === "CONFIGURED_AGENT" ? "available" : "no_session",
    })));
    if (options.length !== scopes.length) throw new Error("Model options returned an incomplete AgentOrg scope result.");
    return scopes.map(({ scopeKind, scopeAddress }, index) => ({ scopeKind, scopeAddress, ...options[index]! }));
  }
  async updateStoppedRunConfig(input: UpdateStoppedAgentOrgRunConfig) {
    const result = await this.dependencies.manager.updateStoppedRunConfig(input);
    return Object.freeze({ ...result, canonical: result.canonical ? projectAgentOrgExecutionTree(result.canonical) : null });
  }

  async create(command: CreateAgentOrgRunCommand): Promise<LiveAgentOrg> {
    const definitionId = required(command.agentOrgDefinitionId, "agentOrgDefinitionId");
    const admission = await this.dependencies.admission.requireAvailable("agent_org", definitionId);
    const definition = admission.definition;
    if (!("members" in definition)) throw new Error(`Admission returned the wrong definition subject for AgentOrg '${definitionId}'.`);
    const rootConfiguration = await this.activateWorkspace(normalizeConfiguration(command.rootConfiguration, "rootConfiguration"));
    const teamOverrides = await this.normalizeOverrides(command.teamOverrides ?? [], "teamOverrides");
    const agentOverrides = await this.normalizeOverrides(command.agentOverrides ?? [], "agentOverrides");
    // Unit run IDs are allocated by their run services when the units are created (DS-001).
    const planner = new AgentOrgRunPlanner({
      getAgentById: (id) => this.dependencies.agentDefinitions.getAgentDefinitionById(id),
      getTeamById: (id) => this.dependencies.teamDefinitions.getDefinitionById(id),
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
    const launch = await this.validateCompleteConfiguration(resolved.launch);
    // DS-001 (org-teams-follow-definition): the Org is a container; each mounted Team and each direct agent its own run.
    const run = await this.dependencies.manager.createContainer({
      orgRunId: AgentOrgRunPlanner.defaultOrgIdentity(definition.name), orgDefinitionId: definitionId, orgDefinitionName: definition.name,
      defaultLaunchConfiguration: launch.root, applicationBinding: command.applicationBinding ?? null,
      plan: planAgentOrgContainer({ topology: resolved.topology, launch }),
    });
    try {
      await this.dependencies.history.recordCreated(run.getExecutionTreeSnapshot());
      return run;
    } catch (error) {
      await this.dependencies.manager.terminate(run.orgRunId).catch(() => false);
      throw error;
    }
  }

  /**
   * Validates every placement's launch and returns the launch to build the tree from: the same placements,
   * each with its validated (canonical) model selection, so no launch carries a setting its model does not
   * declare. Inheritance is already resolved here, so no placement's selection is re-derived from another's.
   */
  private async validateCompleteConfiguration(
    launch: ResolvedAgentOrgLaunchPlan["launch"],
  ): Promise<ResolvedAgentOrgLaunchPlan["launch"]> {
    const entries = [
      ["/", launch.root] as const,
      ...[...launch.teams.entries()],
      ...[...launch.agents.entries()],
    ];
    for (const [address, configuration] of entries) {
      if (!configuration.workspaceRootPath?.trim()) {
        throw coded("AGENT_ORG_WORKSPACE_REQUIRED", `Workspace is required for AgentOrg placement '${address}'.`);
      }
    }
    const results = await this.dependencies.modelSelectionValidator.validateMany(entries.map(([, configuration]) => ({
      context: {
        runtimeKind: configuration.runtimeKind,
        currentModelIdentifier: configuration.llmModelIdentifier,
        workspaceRootPath: configuration.workspaceRootPath!,
        // A new AgentOrg's launch has no session yet to continue (AR-002, autobyteus-53).
        handOver: "no_session",
      },
      selection: {
        llmModelIdentifier: configuration.llmModelIdentifier,
        llmConfig: configuration.llmConfig,
      },
    })));
    if (results.length !== entries.length) {
      const address = results.length < entries.length ? entries[results.length]![0] : "/";
      throw coded("AGENT_ORG_CONFIGURATION_INVALID", `Invalid configuration for '${address}': Model validation returned an incomplete result.`);
    }
    const canonical = new Map<string, AgentLaunchConfiguration>();
    for (const [index, [address, configuration]] of entries.entries()) {
      const result = results[index]!;
      if (result.kind !== "valid") {
        const detail = isUnavailableModelSelection(result)
          ? runModelSelectionRefusal({ result, llmModelIdentifier: configuration.llmModelIdentifier,
            runtimeKind: configuration.runtimeKind, savedSettingsUnchanged: false }).message
          : result.errors.map((error) => `${error.path}: ${error.message}`).join("; ");
        throw coded("AGENT_ORG_CONFIGURATION_INVALID", `Invalid configuration for '${address}': ${detail}`);
      }
      canonical.set(address, Object.freeze({ ...configuration,
        llmModelIdentifier: result.selection.llmModelIdentifier, llmConfig: result.selection.llmConfig }));
    }
    const of = <K extends string>(entries: ReadonlyMap<K, AgentLaunchConfiguration>) =>
      new Map([...entries.keys()].map((address) => [address, canonical.get(address)!] as const));
    return Object.freeze({ root: canonical.get("/")!, teams: of(launch.teams), agents: of(launch.agents) });
  }

  /** Base's restore admission (SR-078, CR-461-069), before the stored file is read: its reason, or `null` when it may restore. */
  restoreRefusal(agentOrgRunId: string): Promise<RootRestoreRefusal | null> {
    const orgRunId = required(agentOrgRunId, "agentOrgRunId");
    return rootRestoreRefusal({ tokenUsage: this.dependencies.tokenUsage ?? new TokenUsageCapability(),
      isCataloged: () => this.dependencies.manager.isCatalogedPackage(orgRunId),
      notCataloged: { code: "AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED", message: `AgentOrg '${orgRunId}' is not an admitted current package.` } });
  }

  /**
   * A stopped Org restored for its first input (SR-046, SR-078): the active run, else base's admission answers with its own
   * reason; a restore that fails after admission is answered as a run that cannot be restored (the detail logged).
   */
  async restoreForInput(agentOrgRunId: string): Promise<LiveAgentOrg | RootRestoreRefusal> {
    const orgRunId = required(agentOrgRunId, "agentOrgRunId");
    const active = this.getActive(orgRunId);
    if (active) return active;
    const refused = await this.restoreRefusal(orgRunId);
    if (refused) return refused;
    try {
      return await this.restore(orgRunId);
    } catch (error) {
      // A concurrent restore registered it first.
      return this.getActive(orgRunId) ?? unrestorableRoot({ kind: "AgentOrg run", code: "AGENT_ORG_RUN_NOT_RESTORABLE", runId: orgRunId, error });
    }
  }

  async restore(agentOrgRunId: string): Promise<LiveAgentOrg> {
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

  async archiveStoredRun(orgRunId: string) {
    const normalized = required(orgRunId, "orgRunId");
    return this.guarded(normalized, "archived", () => this.dependencies.history.archiveStored(normalized));
  }

  async deleteStoredRun(orgRunId: string) {
    const normalized = required(orgRunId, "orgRunId");
    const root = createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: normalized });
    const result = await this.guarded(normalized, "deleted", () => this.dependencies.history.deleteStored(normalized));
    if (!result.success) return result;
    this.dependencies.episodicCatalog.runDeleted(root);
    // An Org container's unit runs were deleted with it (org-teams-follow-definition).
    for (const unit of ("unitRuns" in result ? result.unitRuns : undefined) ?? []) this.dependencies.episodicCatalog.runDeleted(unit);
    // After the committed delete, the run's ad-hoc Tasks go too (best effort; never throws).
    await (this.dependencies.adHocTasks ?? getProjectTaskService()).deleteAdHocTasksDelegatedFrom(root);
    return result;
  }

  /**
   * Archive and delete wait for the runs it delegated to (REQ-007): an Org container's delegations are its unit runs', so
   * each unit run is guarded too (org-teams-follow-definition, contract §6).
   */
  private async guarded<R extends { success: boolean; message: string }>(orgRunId: string, action: "archived" | "deleted", perform: () => Promise<R>) {
    const runs = [createRootExecutionIdentity({ rootSubjectKind: "agent_org", rootRunId: orgRunId }), ...await this.dependencies.manager.unitRunsOf(orgRunId)];
    const chain = runs.reduceRight<() => Promise<R | { success: boolean; message: string }>>((next, run) => () => this.dependencies.workGuard.guard(run, action, next), perform);
    return chain();
  }

  /** N-303 / N-304: the stored-link check before a peer's message restores an Org run. */
  storedRemoteLinkCheck(agentOrgRunId: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    return this.dependencies.manager.storedRemoteLinkCheck(required(agentOrgRunId, "agentOrgRunId"), query);
  }

  getActive(agentOrgRunId: string): LiveAgentOrg | null {
    return this.dependencies.manager.getActive(required(agentOrgRunId, "agentOrgRunId"));
  }

  /** The Org's stored or live view: its own parts (its tree is `runTree(run)`, SR-084). */
  async getInspection(orgRunId: string) {
    return projectAgentOrgExecutionSnapshot(await this.dependencies.manager.getInspection(orgRunId));
  }

  recordRunActivity(run: Pick<LiveAgentOrg, "orgRunId">, input: { summary?: string | null } = {}): Promise<void> {
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
  workspaceRootPath: value.workspaceRootPath?.trim() || null,
});

const normalizePatch = (value: Partial<AgentOrgLaunchConfigurationInput>, label: string): Partial<AgentLaunchConfiguration> => {
  const patch: {
    runtimeKind?: RuntimeKind;
    llmModelIdentifier?: string;
    llmConfig?: Readonly<Record<string, unknown>> | null;
    autoExecuteTools?: boolean;
    workspaceRootPath?: string | null;
  } = {};
  if (value.runtimeKind !== undefined) patch.runtimeKind = runtime(value.runtimeKind, `${label}.runtimeKind`);
  if (value.llmModelIdentifier !== undefined) patch.llmModelIdentifier = required(value.llmModelIdentifier, `${label}.llmModelIdentifier`);
  if (Object.hasOwn(value, "llmConfig")) patch.llmConfig = value.llmConfig ? Object.freeze(structuredClone(value.llmConfig)) : null;
  if (value.autoExecuteTools !== undefined) patch.autoExecuteTools = Boolean(value.autoExecuteTools);
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
