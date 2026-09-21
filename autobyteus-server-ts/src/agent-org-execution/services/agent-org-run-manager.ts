import { isDeepStrictEqual } from "node:util";
import type { RunModelSelectionValidator } from "../../llm-management/services/run-model-selection-service.js";
import type { AgentOrgRunModelConfig, AgentOrgRunModelConfigPatch, AgentOrgRunModelConfigResult } from "../domain/agent-org-run-model-config.js";
import { AgentOrgRunModelConfigNotFound, applyAgentOrgRunModelConfigPatches, resolveAgentOrgRunModelConfigTargets } from "./agent-org-run-model-config-mutator.js";
import { runModelConfigEditability } from "../../run-history/domain/run-model-config.js";
import { TokenUsageRunStore } from "../../token-usage/providers/token-usage-run-store.js";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { ActiveCollaborationRootDirectory, getActiveCollaborationRootDirectory } from "../../agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { createAgentOrgRootExecutionIdentity } from "../../agent-collaboration/execution/domain/root-execution-identity.js";
import { AgentOrgRunExecutionTreeStore } from "../../run-history/store/agent-org-run-execution-tree-store.js";
import type { AgentOrgRunExecutionTreeFileV1 } from "../domain/agent-org-run-execution-tree.js";
import { AgentOrgRun, type AgentOrgRunPackageSnapshot } from "../domain/agent-org-run.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../persistence/agent-org-task-delegation-records-v1-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../persistence/agent-org-communication-messages-v1-store.js";
import type { AgentOrgTaskDelegationRecordsFileV1 } from "../persistence/agent-org-task-delegation-records-v1.js";
import type { AgentOrgCommunicationMessagesFileV1 } from "../persistence/agent-org-communication-messages-v1.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../persistence/agent-org-task-delegation-records-v1-schema.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../persistence/agent-org-communication-messages-v1-schema.js";
import { AgentOrgStatePackageLoader } from "./agent-org-state-package-loader.js";
import { validateAgentOrgStatePackage } from "./agent-org-state-package-validator.js";
import { AgentOrgRunPersistenceCoordinator } from "./agent-org-run-persistence-coordinator.js";
import type { AgentOrgExecutionScopeBuilder } from "./agent-org-execution-scope-builder.js";
import { AgentOrgRunPackageCatalog } from "../../run-history/services/agent-org-run-package-catalog.js";

export type AgentOrgRunManagerOptions = Readonly<{
  modelSelectionValidator?: RunModelSelectionValidator;
  memoryDir: string;
  scopeBuilder: AgentOrgExecutionScopeBuilder;
  executionTreeStore?: AgentOrgRunExecutionTreeStore;
  taskRecordsStore?: AgentOrgTaskDelegationRecordsV1Store;
  communicationStore?: AgentOrgCommunicationMessagesV1Store;
  tokenUsageRunStore?: Pick<TokenUsageRunStore, "assertAgentOrgRecordsReady">;
  activeRootDirectory?: ActiveCollaborationRootDirectory;
}>;

export type AgentOrgCollaborationRecordsSnapshot = Readonly<{
  tasks: AgentOrgTaskDelegationRecordsFileV1;
  messages: AgentOrgCommunicationMessagesFileV1;
}>;

/** Org-family lifecycle/registry owner. Mounted Teams never enter the Team root manager. */
export class AgentOrgRunManager {
  private static instance: AgentOrgRunManager | null = null;
  private readonly tokenUsageRunStore: Pick<TokenUsageRunStore, "assertAgentOrgRecordsReady">;
  private readonly layout: AgentMemoryLayout;
  private readonly scopeBuilder: AgentOrgExecutionScopeBuilder;
  private readonly executionTreeStore: AgentOrgRunExecutionTreeStore;
  private readonly taskRecordsStore: AgentOrgTaskDelegationRecordsV1Store;
  private readonly communicationStore: AgentOrgCommunicationMessagesV1Store;
  private readonly packageCatalog: AgentOrgRunPackageCatalog;
  private readonly activeRootDirectory: ActiveCollaborationRootDirectory;
  private readonly active = new Map<string, AgentOrgRun>();
  private readonly transitions = new Map<string, Promise<void>>();
  private rootAdmissionOpen = true;
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
    if (!options.scopeBuilder) throw new Error("AgentOrgExecutionScopeBuilder is required.");
    this.modelSelectionValidator = options.modelSelectionValidator;
    this.layout = new AgentMemoryLayout(options.memoryDir);
    this.scopeBuilder = options.scopeBuilder;
    this.tokenUsageRunStore = options.tokenUsageRunStore ?? new TokenUsageRunStore();
    this.executionTreeStore = options.executionTreeStore ?? new AgentOrgRunExecutionTreeStore();
    this.taskRecordsStore = options.taskRecordsStore ?? new AgentOrgTaskDelegationRecordsV1Store();
    this.communicationStore = options.communicationStore ?? new AgentOrgCommunicationMessagesV1Store();
    this.packageCatalog = new AgentOrgRunPackageCatalog(options.memoryDir);
    this.activeRootDirectory = options.activeRootDirectory ?? getActiveCollaborationRootDirectory();
  }

  create(tree: AgentOrgRunExecutionTreeFileV1): Promise<AgentOrgRun> {
    this.assertRootAdmissionOpen();
    const orgRunId = tree.rootOrg.orgRunId;
    const state = validateAgentOrgStatePackage({
      executionTree: tree,
      taskRecords: validateAgentOrgTaskDelegationRecordsV1({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        records: [],
      }, orgRunId),
      communicationMessages: validateAgentOrgCommunicationMessagesV1({
        schemaVersion: 1,
        subjectKind: "agent_org",
        orgRunId,
        messages: [],
      }, orgRunId),
    });
    return this.withTransition(orgRunId, () => this.materialize(state, "fresh", true));
  }

  restore(orgRunIdInput: string): Promise<AgentOrgRun> {
    this.assertRootAdmissionOpen();
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      this.assertNotActive(orgRunId);
      if (this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(orgRunId)) {
        throw new Error(`AGENT_ORG_STATE_PACKAGE_NOT_CATALOGED: AgentOrg '${orgRunId}' is not an admitted current package.`);
      }
      const loaded = await new AgentOrgStatePackageLoader({
        executionTree: this.executionTreeStore,
        tasks: this.taskRecordsStore,
        messages: this.communicationStore,
      }).loadAndRepair({ orgMemoryDir: this.layout.getOrgDirPath(orgRunId), orgRunId });
      if (!loaded.loaded) throw new Error(`${loaded.code}: ${loaded.message}`);
      await this.tokenUsageRunStore.assertAgentOrgRecordsReady({
        orgRunId, agentRunIds: loaded.state.index.listAgents().map((agent) => agent.agentRunId),
      });
      return this.materialize(loaded.state, "restore", false);
    });
  }

  getActive(orgRunIdInput: string): AgentOrgRun | null {
    const run = this.active.get(required(orgRunIdInput, "orgRunId")) ?? null;
    return run?.isActive() ? run : null;
  }
  async getCollaborationRecordsSnapshot(orgRunIdInput: string): Promise<AgentOrgCollaborationRecordsSnapshot> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    const active = this.getActive(orgRunId);
    if (active) return Object.freeze({
      tasks: active.getTaskRecordsSnapshot(),
      messages: active.getCommunicationSnapshot(),
    });
    const orgDir = this.layout.getOrgDirPath(orgRunId);
    const [tasks, messages] = await Promise.all([
      this.taskRecordsStore.read(orgDir, orgRunId),
      this.communicationStore.read(orgDir, orgRunId),
    ]);
    if (!tasks || !messages) {
      throw new Error(`AgentOrg collaboration records for '${orgRunId}' were not found.`);
    }
    return Object.freeze({ tasks, messages });
  }
  listActiveOrgRunIds(): readonly string[] { return Object.freeze([...this.active.keys()].filter((id) => this.getActive(id))); }

  getInspection(orgRunIdInput: string): Promise<Readonly<{
    orgRunId: string;
    isActive: boolean;
    snapshot: AgentOrgRunPackageSnapshot;
    baseChangeSequence: number;
  }>> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const active = this.getActive(orgRunId);
      if (active) {
        const connection = await active.openPackageSnapshotConnection();
        try {
          return Object.freeze({ orgRunId, isActive: true,
            snapshot: connection.snapshot, baseChangeSequence: connection.baseChangeSequence });
        } finally { connection.close(); }
      }
      const dir = this.layout.getOrgDirPath(orgRunId);
      const [tree, tasks, messages] = await Promise.all([
        this.executionTreeStore.read(dir, orgRunId),
        this.taskRecordsStore.read(dir, orgRunId),
        this.communicationStore.read(dir, orgRunId),
      ]);
      if (!tree || !tasks || !messages) throw new Error(`AgentOrg '${orgRunId}' inspection package is unavailable.`);
      const state = validateAgentOrgStatePackage({ executionTree: tree, taskRecords: tasks, communicationMessages: messages });
      // The current DTO carries statuses for live executions only. Inactive
      // inspection has none; retained contexts initialize as offline.
      const statuses = Object.freeze([]);
      return Object.freeze({ orgRunId, isActive: false, baseChangeSequence: 0,
        snapshot: Object.freeze({ tree: state.executionTree, tasks: state.taskRecords,
          messages: state.communicationMessages, statuses }) });
    });
  }

  getRunModelConfig(orgRunIdInput: string): Promise<AgentOrgRunModelConfig> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const tree = await this.readModelConfigTree(orgRunId);
      const isActive = this.active.has(orgRunId);
      return Object.freeze({ orgRunId, executionTree: tree, isActive,
        editability: this.modelConfigEditability(tree, isActive) });
    });
  }

  updateStoppedRunModelConfigs(input: Readonly<{
    orgRunId: string;
    patches: readonly AgentOrgRunModelConfigPatch[];
  }>): Promise<AgentOrgRunModelConfigResult> {
    const orgRunId = required(input.orgRunId, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      let tree: AgentOrgRunExecutionTreeFileV1 | null = null;
      const result = (outcome: AgentOrgRunModelConfigResult["outcome"], message: string,
        canonical: AgentOrgRunExecutionTreeFileV1 | null = tree,
        fieldErrors: AgentOrgRunModelConfigResult["fieldErrors"] = []): AgentOrgRunModelConfigResult => {
        const isActive = this.active.has(orgRunId);
        return Object.freeze({ success: outcome === "UPDATED" || outcome === "UNCHANGED", outcome, message,
          canonical, isActive, editability: canonical
            ? this.modelConfigEditability(canonical, isActive)
            : runModelConfigEditability({ isActive, archived: false, available: false }),
          fieldErrors: Object.freeze([...fieldErrors]) });
      };
      try { tree = await this.readModelConfigTree(orgRunId); }
      catch (error) { return result(error instanceof AgentOrgRunModelConfigNotFound ? "NOT_FOUND" : "INTERNAL_ERROR",
        error instanceof Error ? error.message : String(error), null); }
      if (this.active.has(orgRunId)) return result("RUN_ACTIVE", "The enclosing AgentOrg is managed or active.");
      if (tree.archivedAt) return result("RUN_ARCHIVED", "Archived AgentOrg runs cannot be edited.");
      if (tree.applicationBinding) return result("VALIDATION_FAILED", "Application-owned AgentOrg runs cannot be edited here.");
      if (!this.rootAdmissionOpen) return result("VALIDATION_FAILED", "AgentOrg admission is closed.");
      if (!this.modelSelectionValidator) return result("INTERNAL_ERROR", "Model selection capability is unavailable.");
      let targets;
      try { targets = resolveAgentOrgRunModelConfigTargets(tree, input.patches); }
      catch (error) {
        return result("VALIDATION_FAILED", "AgentOrg model-setting targets are invalid.", tree,
          [{ path: "patches", message: error instanceof Error ? error.message : String(error) }]);
      }
      let validations;
      try {
        validations = await this.modelSelectionValidator.validateMany(targets.map(({ patch, launchConfiguration }) => ({
          context: { runtimeKind: launchConfiguration.runtimeKind,
            currentModelIdentifier: launchConfiguration.llmModelIdentifier,
            workspaceRootPath: launchConfiguration.workspaceRootPath ?? process.cwd() },
          selection: { llmModelIdentifier: patch.llmModelIdentifier, llmConfig: patch.llmConfig },
        })));
      } catch { return result("INTERNAL_ERROR", "Model validation is unavailable."); }
      if (validations.length !== targets.length) {
        return result("INTERNAL_ERROR", "Model validation returned an incomplete aggregate result.");
      }
      const unavailable = validations.findIndex((validation) =>
        validation.kind === "model_unavailable" || validation.kind === "schema_unavailable");
      if (unavailable >= 0) {
        const validation = validations[unavailable]!;
        return result(validation.kind === "model_unavailable" ? "MODEL_UNAVAILABLE" : "SCHEMA_UNAVAILABLE",
          `Model options for '${targets[unavailable]!.patch.scopeAddress}' are unavailable.`);
      }
      const fieldErrors = validations.flatMap((validation, index) => validation.kind === "invalid"
        ? validation.errors.map((error) => ({
            path: `patches[${targets[index]!.patch.scopeAddress}].${error.path}`,
            message: error.message,
          }))
        : []);
      if (fieldErrors.length) return result("VALIDATION_FAILED", "One or more AgentOrg model settings are invalid.", tree, fieldErrors);
      const normalized = targets.map((target, index) => ({ ...target, patch: {
        ...target.patch,
        ...(validations[index]!.kind === "valid" ? validations[index]!.selection : {}),
      } }));
      const expected = applyAgentOrgRunModelConfigPatches(tree, normalized);
      if (isDeepStrictEqual(tree, expected)) return result("UNCHANGED", "AgentOrg model settings are already up to date.");
      let outcome: "committed" | "not_renamed" | "renamed_finalization_indeterminate";
      try { outcome = (await this.executionTreeStore.write(this.layout.getOrgDirPath(orgRunId), expected)).outcome; }
      catch { outcome = "renamed_finalization_indeterminate"; }
      const readback = await this.executionTreeStore.read(this.layout.getOrgDirPath(orgRunId), orgRunId).catch(() => null);
      if (outcome === "not_renamed") return result("PERSISTENCE_FAILED", "AgentOrg model settings were not saved.", readback ?? tree);
      if (outcome !== "committed" || !readback || !isDeepStrictEqual(readback, expected)) {
        return result("PERSISTENCE_INDETERMINATE",
          "Save outcome is uncertain. Refresh canonical AgentOrg configuration before another Save.", readback);
      }
      return result("UPDATED", "AgentOrg model settings saved.", readback);
    });
  }

  private async readModelConfigTree(orgRunId: string) {
    if (this.packageCatalog.isInitialized() && !this.packageCatalog.isAdmitted(orgRunId)) {
      throw new AgentOrgRunModelConfigNotFound("AgentOrg package is not admitted.");
    }
    const tree = await this.executionTreeStore.read(this.layout.getOrgDirPath(orgRunId), orgRunId);
    if (!tree) throw new AgentOrgRunModelConfigNotFound("AgentOrg configuration is unavailable.");
    if (tree.rootOrg.orgRunId !== orgRunId) throw new AgentOrgRunModelConfigNotFound("AgentOrg configuration identity is invalid.");
    return tree;
  }

  private modelConfigEditability(tree: AgentOrgRunExecutionTreeFileV1, isActive: boolean) {
    if (tree.applicationBinding) {
      return Object.freeze({ editable: false, reason: "OWNERSHIP_UNAVAILABLE" as const });
    }
    if (!this.rootAdmissionOpen) {
      return Object.freeze({ editable: false, reason: "ADMISSION_CLOSED" as const });
    }
    return runModelConfigEditability({ isActive, archived: Boolean(tree.archivedAt), available: true });
  }

  terminate(orgRunIdInput: string): Promise<boolean> {
    const orgRunId = required(orgRunIdInput, "orgRunId");
    return this.withTransition(orgRunId, async () => {
      const run = this.active.get(orgRunId);
      if (!run) return false;
      const result = await run.terminate();
      if (!result.accepted) return false;
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
  closeRootAdmission(): void { this.rootAdmissionOpen = false; }

  private async materialize(
    state: ReturnType<typeof validateAgentOrgStatePackage>,
    mode: "fresh" | "restore",
    persistInitialPackage: boolean,
  ): Promise<AgentOrgRun> {
    const orgRunId = state.executionTree.rootOrg.orgRunId;
    this.assertNotActive(orgRunId);
    let run: AgentOrgRun | null = null;
    const persistence = new AgentOrgRunPersistenceCoordinator({
      orgRunId,
      orgMemoryDir: this.layout.getOrgDirPath(orgRunId),
      executionTreeStore: this.executionTreeStore,
      taskRecordsStore: this.taskRecordsStore,
      communicationStore: this.communicationStore,
      enterPersistenceFailStop: () => run?.enterPersistenceFailStop(),
    });
    run = await this.scopeBuilder.build({
      state,
      persistence,
      activationMode: mode,
      persistInitialPackage,
      onTerminated: () => { if (run) this.unregister(orgRunId, run); },
    });
    try {
      this.packageCatalog.admit(orgRunId);
      this.register(run);
    } catch (error) {
      await run.terminate().catch(() => undefined);
      throw error;
    }
    return run;
  }
  private register(run: AgentOrgRun): void {
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
  private unregister(orgRunId: string, expected: AgentOrgRun): boolean {
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
