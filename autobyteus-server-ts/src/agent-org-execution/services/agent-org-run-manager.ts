import type { DelegationIndex } from "../../agent-collaboration/delegation/delegation-index.js";
import { selectionContextFor } from "../../agent-execution/services/stopped-run-selection-context.js";
import type { UpdateStoppedAgentOrgRunConfig } from "../domain/agent-org-run-config.js";
import type { WorkspaceManager } from "../../workspaces/workspace-manager.js";
import { canonicalizeWorkspaceRootPath } from "../../workspaces/workspace-path-utils.js";
import { applyAgentOrgTeamWorkspacePatches, resolveAgentOrgTeamWorkspacePatches, listAgentOrgRunSelectionScopes } from "./agent-org-run-config-mutator.js";
import { isDeepStrictEqual } from "node:util";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import { isUnavailableModelSelection, runModelSelectionRefusal } from "../../llm-management/services/run-model-selection-refusal.js";
import type { AgentOrgRunConfig, AgentOrgRunConfigResult } from "../domain/agent-org-run-config.js";
import { AgentOrgWorkspacePatchError, AgentOrgRunConfigNotFound, applyAgentOrgRunSelectionPatches, resolveAgentOrgRunSelectionTargets } from "./agent-org-run-config-mutator.js";
import { runModelConfigEditability } from "../../run-history/domain/run-model-config.js";
import { ActiveCollaborationRootDirectory, getActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentOrgRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import type { AgentOrgRunExecutionTreeFile } from "../domain/agent-org-run-execution-tree.js";
import type { AgentOrgRunPackageSnapshot } from "../domain/agent-org-package-snapshot.js";
import { AgentOrgRunPackageCatalog } from "../../run-history/services/agent-org-run-package-catalog.js";
import { storedRemoteLinkCheck, type RemoteInboundQuery, type StoredRemoteLinkCheck } from "../../agent-collaboration/execution/remote/remote-run-links.js";
import type { AgentOrgContainers } from "../container/agent-org-containers.js";
import type { CreateAgentOrgContainerInput } from "../container/agent-org-container-manager.js";
import type { LiveAgentOrgContainer } from "../container/live-agent-org-container.js";
import { ContainerConfigTrees } from "../container/container-config-trees.js";

/** A live Org: an Org container (org-teams-follow-definition): its units are runs of their own. */
export type LiveAgentOrg = LiveAgentOrgContainer;

export type AgentOrgRunManagerOptions = Readonly<{
  modelSelectionValidator?: RunModelSelectionValidator;
  workspaces?: Pick<WorkspaceManager, "ensureWorkspaceByRootPath">;
  memoryDir: string;
  /** The relationships between runs, from the Task entries (SR-047). */
  delegationIndex: DelegationIndex;
  activeRootDirectory?: ActiveCollaborationRootDirectory;
  /** The Org containers (org-teams-follow-definition): an Org is a container; a stored container reopens as one. */
  containers: AgentOrgContainers;
}>;

export type InactiveAgentOrgHistoryMutationResult<T> =
  | Readonly<{ kind: "managed" }>
  | Readonly<{ kind: "completed"; value: T }>;

/**
 * The Org lifecycle and registry owner (org-teams-follow-definition DS-001, DS-003): an Org is a container of unit runs
 * (its mounted Teams and direct agents are runs of their own, managed by their own services); this manager creates,
 * reopens, stops and registers containers, and serves the Org's stored settings.
 */
export class AgentOrgRunManager {
  private static instance: AgentOrgRunManager | null = null;
  private readonly packageCatalog: AgentOrgRunPackageCatalog;
  private readonly delegationIndex: DelegationIndex;
  private readonly activeRootDirectory: ActiveCollaborationRootDirectory;
  private readonly active = new Map<string, LiveAgentOrg>();
  private readonly transitions = new Map<string, Promise<void>>();
  private readonly containers: AgentOrgContainers;
  private readonly containerConfig: ContainerConfigTrees;
  private rootAdmissionOpen = true;
  private readonly workspaces: AgentOrgRunManagerOptions["workspaces"];
  private readonly modelSelectionValidator: RunModelSelectionValidator | undefined;

  static getInstance(): AgentOrgRunManager {
    if (!this.instance) throw new Error("The process AgentOrgRunManager is not initialized.");
    return this.instance;
  }
  static initializeProcessInstance(options: AgentOrgRunManagerOptions): AgentOrgRunManager {
    if (this.instance) throw new Error("The process AgentOrgRunManager is already initialized.");
    return this.instance = new AgentOrgRunManager(options);
  }
  static releaseProcessInstance(instance: AgentOrgRunManager): void {
    if (this.instance === instance) this.instance = null;
  }

  constructor(options: AgentOrgRunManagerOptions) {
    this.modelSelectionValidator = options.modelSelectionValidator;
    this.workspaces = options.workspaces;
    this.delegationIndex = options.delegationIndex;
    this.packageCatalog = new AgentOrgRunPackageCatalog(options.memoryDir);
    this.activeRootDirectory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
    this.containers = options.containers;
    this.containerConfig = new ContainerConfigTrees(options.memoryDir);
  }

  /** DS-001: a new Org: each unit its own run (Offline), then the container file; registered and admitted. */
  createContainer(input: CreateAgentOrgContainerInput): Promise<LiveAgentOrgContainer> {
    this.assertRootAdmissionOpen();
    return this.withTransition(input.orgRunId, async () => {
      this.assertNotActive(input.orgRunId);
      const live = await this.containers.create(input);
      try {
        await this.packageCatalog.admit(input.orgRunId);
        this.register(live);
      } catch (error) {
        await this.containers.stop(input.orgRunId).catch(() => false);
        throw error;
      }
      return live;
    });
  }

  /** DS-003: a stopped Org reopens from its container file; its units are restored when first needed. */
  restore(orgRunIdInput: string): Promise<LiveAgentOrg> {
    this.assertRootAdmissionOpen();
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      this.assertNotActive(orgRunId);
      await this.packageCatalog.awaitReady();
      if (!this.packageCatalog.isAdmitted(orgRunId)) {
        throw new Error(`AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED: AgentOrg '${orgRunId}' is not an admitted current package.`);
      }
      const live = await this.containers.restore(orgRunId);
      this.register(live);
      return live;
    });
  }

  getActive(orgRunIdInput: string): LiveAgentOrg | null {
    const run = this.active.get(required(orgRunIdInput, "orgRunId")) ?? null;
    return run?.isActive() ? run : null;
  }
  /** N-303 / N-304: a peer's request checked against an inactive Org run's stored remote links; it loads nothing. */
  async storedRemoteLinkCheck(orgRunIdInput: string, query: RemoteInboundQuery): Promise<StoredRemoteLinkCheck> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    if (this.active.has(orgRunId)) return "proceed";
    const stored = await this.containers.isStored(orgRunId);
    return storedRemoteLinkCheck(stored ? { run: { rootSubjectKind: "agent_org", rootRunId: orgRunId }, tree: this.delegationIndex } : null, query);
  }
  listActiveOrgRunIds(): readonly string[] { return Object.freeze([...this.active.keys()].filter((id) => this.getActive(id))); }

  withInactiveHistoryMutation<T>(
    orgRunIdInput: string,
    operation: () => Promise<T>,
  ): Promise<InactiveAgentOrgHistoryMutationResult<T>> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      if (this.active.has(orgRunId)) return Object.freeze({ kind: "managed" as const });
      return Object.freeze({ kind: "completed" as const, value: await operation() });
    });
  }

  /** The Org's view parts (today's Org view shape): the live container's, else its stored file composed with its units'. */
  getInspection(orgRunIdInput: string): Promise<Readonly<{
    orgRunId: string;
    isActive: boolean;
    snapshot: AgentOrgRunPackageSnapshot;
    baseChangeSequence: number;
    liveSequenceId: string | null;
    lastMessageChangeSequence: number | null;
  }>> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const active = this.getActive(orgRunId);
      if (active) {
        const connection = await active.openPackageSnapshotConnection();
        try {
          return Object.freeze({ orgRunId, isActive: true,
            snapshot: connection.snapshot, baseChangeSequence: connection.baseChangeSequence, liveSequenceId: connection.liveSequenceId,
            lastMessageChangeSequence: connection.lastMessageChangeSequence });
        } finally { connection.close(); }
      }
      const stored = await this.containers.storedSnapshot(orgRunId);
      if (!stored) throw new Error(`AgentOrg '${orgRunId}' inspection package is unavailable.`);
      return Object.freeze({ orgRunId, isActive: false, baseChangeSequence: 0, liveSequenceId: null, lastMessageChangeSequence: null, snapshot: stored });
    });
  }

  getRunConfig(orgRunIdInput: string): Promise<AgentOrgRunConfig> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const tree = await this.readConfigTree(orgRunId);
      const isActive = this.active.has(orgRunId);
      return Object.freeze({ orgRunId, executionTree: tree, isActive,
        editability: this.configEditability(tree, isActive) });
    });
  }

  updateStoppedRunConfig(input: UpdateStoppedAgentOrgRunConfig): Promise<AgentOrgRunConfigResult> {
    return this.stoppedRunConfig(input, false);
  }

  /** The Save's checks without writing: the refusal, or `null` (SR-039: a delegator's Settings checks every run first). */
  async checkStoppedRunConfig(input: UpdateStoppedAgentOrgRunConfig): Promise<AgentOrgRunConfigResult | null> {
    const checked = await this.stoppedRunConfig(input, true);
    return checked.success ? null : checked;
  }

  private stoppedRunConfig(input: UpdateStoppedAgentOrgRunConfig, checkOnly: boolean): Promise<AgentOrgRunConfigResult> {
    const orgRunId = required(input.orgRunId, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      let tree: AgentOrgRunExecutionTreeFile | null = null;
      const result = (outcome: AgentOrgRunConfigResult["outcome"], message: string,
        canonical: AgentOrgRunExecutionTreeFile | null = tree,
        fieldErrors: AgentOrgRunConfigResult["fieldErrors"] = []): AgentOrgRunConfigResult => {
        const isActive = this.active.has(orgRunId);
        return Object.freeze({ success: outcome === "UPDATED" || outcome === "UNCHANGED", outcome, message,
          canonical, isActive, editability: canonical
            ? this.configEditability(canonical, isActive)
            : runModelConfigEditability({ isActive, archived: false, available: false }),
          fieldErrors: Object.freeze([...fieldErrors]) });
      };
      try { tree = await this.readConfigTree(orgRunId); }
      catch (error) { return result(error instanceof AgentOrgRunConfigNotFound ? "NOT_FOUND" : "INTERNAL_ERROR",
        error instanceof Error ? error.message : String(error), null); }
      if (this.active.has(orgRunId)) return result("RUN_ACTIVE", "The enclosing AgentOrg is managed or active.");
      if (tree.archivedAt) return result("RUN_ARCHIVED", "Archived AgentOrg runs cannot be edited.");
      if (tree.applicationBinding) return result("VALIDATION_FAILED", "Application-owned AgentOrg runs cannot be edited here.");
      if (!this.rootAdmissionOpen) return result("VALIDATION_FAILED", "AgentOrg admission is closed.");
      if (!this.modelSelectionValidator) return result("INTERNAL_ERROR", "Model selection capability is unavailable.");
      if (!input.selectionPatches.length && !input.teamWorkspacePatches.length) {
        return result("VALIDATION_FAILED", "At least one configuration patch is required.");
      }
      let modelTargets;
      let workspacePatches;
      try { modelTargets = resolveAgentOrgRunSelectionTargets(tree, input.selectionPatches); }
      catch (error) {
        return result("VALIDATION_FAILED", "AgentOrg model-setting targets are invalid.", tree,
          [{ path: "selectionPatches", message: error instanceof Error ? error.message : String(error) }]);
      }
      try { workspacePatches = resolveAgentOrgTeamWorkspacePatches(tree, input.teamWorkspacePatches); }
      catch (error) {
        return result("VALIDATION_FAILED", "AgentOrg Team workspace targets are invalid.", tree,
          [{ path: error instanceof AgentOrgWorkspacePatchError ? error.path : "teamWorkspacePatches", message: error instanceof Error ? error.message : String(error) }]);
      }
      const normalizedWorkspaces = [];
      for (const patch of workspacePatches) {
        if (!this.workspaces) return result("INTERNAL_ERROR", "Workspace capability is unavailable.");
        try {
          const workspace = await this.workspaces.ensureWorkspaceByRootPath(canonicalizeWorkspaceRootPath(patch.workspaceRootPath));
          normalizedWorkspaces.push({ ...patch, workspaceRootPath: workspace.getBasePath() });
        } catch (error) {
          return result("VALIDATION_FAILED", "Team workspace could not be registered.", tree,
            [{ path: `teamWorkspacePatches[${patch.teamAddress}].workspaceRootPath`,
              message: error instanceof Error ? error.message : String(error) }]);
        }
      }
      const proposed = applyAgentOrgRunSelectionPatches(applyAgentOrgTeamWorkspacePatches(tree, normalizedWorkspaces), modelTargets);
      const originals = new Map(listAgentOrgRunSelectionScopes(tree).map(scope => [scope.scopeAddress, scope]));
      const modelAddresses = new Set(modelTargets.map(target => target.patch.scopeAddress));
      const workspaceAddresses = new Set<string>(normalizedWorkspaces.flatMap(patch => {
        const team = tree!.rootOrg.members.find(member => member.address === patch.teamAddress)!;
        return 'teamRunId' in team ? [team.address, ...team.members.map(agent => agent.address)] : [];
      }));
      const targets = listAgentOrgRunSelectionScopes(proposed).filter(scope =>
        modelAddresses.has(scope.scopeAddress) || workspaceAddresses.has(scope.scopeAddress));
      let validations;
      try {
        validations = await this.modelSelectionValidator.validateMany(targets.map(({ scopeKind, scopeAddress, launchConfiguration }) => ({
          // The reference is the session the scope last ran on (DEC-005); a configured Agent can hand over, a default
          // scope (Org or a mounted Team) has no session to continue (DEC-007).
          context: selectionContextFor({ ...originals.get(scopeAddress)!.launchConfiguration,
            workspaceRootPath: launchConfiguration.workspaceRootPath, pendingRuntimeSwitch: originals.get(scopeAddress)!.pendingRuntimeSwitch },
            { runtimeKind: launchConfiguration.runtimeKind }, scopeKind === "CONFIGURED_AGENT" ? "available" : "no_session"),
          selection: { llmModelIdentifier: launchConfiguration.llmModelIdentifier, llmConfig: launchConfiguration.llmConfig },
        })));
      } catch { return result("INTERNAL_ERROR", "Model validation is unavailable."); }
      if (validations.length !== targets.length) {
        return result("INTERNAL_ERROR", "Model validation returned an incomplete aggregate result.");
      }
      for (const [index, validation] of validations.entries()) {
        if (!isUnavailableModelSelection(validation)) continue;
        const { launchConfiguration } = targets[index]!;
        const refusal = runModelSelectionRefusal({ result: validation, llmModelIdentifier: launchConfiguration.llmModelIdentifier,
          runtimeKind: launchConfiguration.runtimeKind, scopeAddress: targets[index]!.scopeAddress, savedSettingsUnchanged: true });
        return result(refusal.outcome, refusal.message);
      }
      const fieldErrors = validations.flatMap((validation, index) => validation.kind === "invalid"
        ? validation.errors.map(error => ({ path: `selectionPatches[${targets[index]!.scopeAddress}].${error.path}`, message: error.message }))
        : []);
      if (fieldErrors.length) return result("VALIDATION_FAILED", "One or more AgentOrg settings are invalid.", tree, fieldErrors);
      // Validation of unchanged models must not normalize those models as a side effect of a workspace edit.
      const normalized = modelTargets.map(target => {
        const validation = validations[targets.findIndex(scope => scope.scopeAddress === target.patch.scopeAddress)]!;
        return { ...target, patch: { ...target.patch, ...(validation.kind === 'valid' ? validation.selection : {}) },
          // The continuation decided for this scope (REQ-003); a default scope never reaches the switch rule.
          continuation: validation.kind === 'valid' ? validation.continuation : 'same_session' as const };
      });
      const expected = applyAgentOrgRunSelectionPatches(applyAgentOrgTeamWorkspacePatches(tree, normalizedWorkspaces), normalized);
      if (checkOnly || isDeepStrictEqual(tree, expected)) return result("UNCHANGED", "AgentOrg settings are already up to date.");
      if (!this.rootAdmissionOpen) return result("VALIDATION_FAILED", "AgentOrg admission is closed.");
      let outcome: "committed" | "not_committed" | "finalization_indeterminate";
      // An Org container's settings are written to the files that own them (its units', its own default).
      try { outcome = await this.containerConfig.write(orgRunId, expected); }
      catch { outcome = "finalization_indeterminate"; }
      const readback = await this.containerConfig.read(orgRunId).catch(() => null);
      if (outcome === "not_committed") return result("PERSISTENCE_FAILED", "AgentOrg settings were not saved.", readback ?? tree);
      if (outcome !== "committed" || !readback || !isDeepStrictEqual(readback, expected)) {
        return result("PERSISTENCE_INDETERMINATE",
          "Save outcome is uncertain. Refresh canonical AgentOrg configuration before another Save.", readback);
      }
      return result("UPDATED", "AgentOrg settings saved.", readback);
    });
  }

  /** The stored Org's settings as its settings page reads them: its container file composed with its units' files. */
  private async readConfigTree(orgRunId: string): Promise<AgentOrgRunExecutionTreeFile> {
    await this.packageCatalog.awaitReady();
    if (!this.packageCatalog.isAdmitted(orgRunId)) throw new AgentOrgRunConfigNotFound("AgentOrg package is not admitted.");
    const tree = await this.containerConfig.read(orgRunId);
    if (!tree) throw new AgentOrgRunConfigNotFound("AgentOrg configuration is unavailable.");
    if (tree.rootOrg.orgRunId !== orgRunId) throw new AgentOrgRunConfigNotFound("AgentOrg configuration identity is invalid.");
    return tree;
  }

  private configEditability(tree: AgentOrgRunExecutionTreeFile, isActive: boolean) {
    if (tree.applicationBinding) {
      return Object.freeze({ editable: false, reason: "OWNERSHIP_UNAVAILABLE" as const });
    }
    if (!this.rootAdmissionOpen) {
      return Object.freeze({ editable: false, reason: "ADMISSION_CLOSED" as const });
    }
    return runModelConfigEditability({ isActive, archived: Boolean(tree.archivedAt), available: true });
  }

  /** DS-003: Stop stops every unit run; one that did not stop keeps the Org live (a retry stops the rest). */
  terminate(orgRunIdInput: string): Promise<boolean> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const run = this.active.get(orgRunId);
      if (!run) return false;
      if (!await this.containers.stop(orgRunId)) return false;
      return this.unregister(orgRunId, run) || !this.active.has(orgRunId);
    });
  }
  async stopAllAgentOrgRuns(): Promise<void> {
    const errors: unknown[] = [];
    for (const id of [...this.active.keys()]) {
      try {
        if (!await this.terminate(id) && this.active.has(id)) errors.push(new Error(`AgentOrg '${id}' did not accept termination.`));
      } catch (error) { errors.push(error); }
    }
    if (errors.length) throw new AggregateError(errors, "Failed to stop all AgentOrg runs.");
  }
  /** Whether the run's stored package is admitted (base's restore check, SR-078); nothing is read or loaded. */
  async isCatalogedPackage(orgRunId: string): Promise<boolean> {
    await this.packageCatalog.awaitReady();
    return this.packageCatalog.isAdmitted(required(orgRunId, "orgRunId"));
  }

  closeRootAdmission(): void { this.rootAdmissionOpen = false; }
  /** A stored Org container's unit runs (its delegations are theirs). */
  unitRunsOf(orgRunId: string) { return this.containers.storedUnitRuns(orgRunId); }

  private register(run: LiveAgentOrg): void {
    if (!run.isActive() || this.active.has(run.orgRunId)) throw new Error(`Cannot register AgentOrg '${run.orgRunId}'.`);
    const reservation = this.activeRootDirectory.reserve(run.rootIdentity, run);
    try {
      this.active.set(run.orgRunId, run);
      reservation.commit();
    } catch (error) {
      this.active.delete(run.orgRunId);
      reservation.release();
      throw error;
    }
  }
  private unregister(orgRunId: string, expected: LiveAgentOrg): boolean {
    if (this.active.get(orgRunId) !== expected) return false;
    this.active.delete(orgRunId);
    this.activeRootDirectory.unregister(createAgentOrgRootExecutionIdentity(orgRunId), expected);
    return true;
  }
  private assertNotActive(orgRunId: string): void {
    if (this.active.has(orgRunId)) throw new Error(`AgentOrg '${orgRunId}' is already active.`);
  }
  private assertRootAdmissionOpen(): void {
    if (!this.rootAdmissionOpen) {
      throw new Error("AgentOrg root admission is closed for process shutdown.");
    }
  }
  private async withTransition<T>(orgRunId: string, operation: () => Promise<T>): Promise<T> {
    const previous = this.transitions.get(orgRunId) ?? Promise.resolve();
    let release!: () => void;
    const current = new Promise<void>((resolve) => { release = resolve; });
    const tail = previous.then(() => current);
    this.transitions.set(orgRunId, tail);
    await previous;
    try { return await operation(); }
    finally {
      release();
      if (this.transitions.get(orgRunId) === tail) this.transitions.delete(orgRunId);
    }
  }
}

const required = (value: string, label: string): string => {
  const normalized = value?.trim();
  if (!normalized) throw new Error(`${label} is required.`);
  return normalized;
};
