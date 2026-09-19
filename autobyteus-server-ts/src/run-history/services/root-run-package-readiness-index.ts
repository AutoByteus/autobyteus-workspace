import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME } from "../../agent-org-execution/persistence/agent-org-communication-messages-v1.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME } from "../../agent-org-execution/persistence/agent-org-task-delegation-records-v1.js";
import { validateAgentOrgStatePackage } from "../../agent-org-execution/services/agent-org-state-package-validator.js";
import { TaskDelegationRecordsV1Store, TASK_DELEGATION_RECORDS_V1_FILE_NAME } from "../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { TeamCommunicationV1Store, TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME } from "../../services/team-communication/team-communication-v1-store.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME } from "../store/agent-org-run-execution-tree-path.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TEAM_RUN_EXECUTION_TREE_FILE_NAME } from "../store/team-run-execution-tree-path.js";
import { validateTeamRunStatePackage } from "./team-run-state-package-validator.js";

export type RootRunPackageFamily = "agent_team" | "agent_org";

export type RootRunPackageReadinessDiagnostic = Readonly<{
  rootSubjectKind: RootRunPackageFamily;
  rootRunId: string;
  packagePath: string;
  code:
    | "ROOT_RUN_FAMILY_CONFLICT"
    | "ROOT_RUN_PACKAGE_NOT_DIRECTORY"
    | "ROOT_RUN_PACKAGE_MANIFEST_INVALID"
    | "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED";
  reason: string;
}>;

type ReadinessSnapshot = {
  admittedTeams: Set<string>;
  admittedOrgs: Set<string>;
  diagnostics: RootRunPackageReadinessDiagnostic[];
};
type ReadinessState = ReadinessSnapshot & {
  initialized: boolean;
  rebuildPromise: Promise<void> | null;
  mutationRevision: number;
};

const states = new Map<string, ReadinessState>();
const stateKey = (memoryDir: string): string => path.resolve(memoryDir);
const stateFor = (memoryDir: string): ReadinessState => {
  const key = stateKey(memoryDir);
  const existing = states.get(key);
  if (existing) return existing;
  const created: ReadinessState = {
    initialized: false,
    admittedTeams: new Set(),
    admittedOrgs: new Set(),
    diagnostics: [],
    rebuildPromise: null,
    mutationRevision: 0,
  };
  states.set(key, created);
  return created;
};

const exists = (filePath: string): Promise<boolean> =>
  fs.access(filePath).then(() => true).catch(() => false);

const requiredTeamFiles = Object.freeze([
  TEAM_RUN_EXECUTION_TREE_FILE_NAME,
  TASK_DELEGATION_RECORDS_V1_FILE_NAME,
  TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME,
]);
const retiredTeamFiles = Object.freeze([
  "team_run_metadata.json",
  AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME,
  AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME,
  AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME,
]);
const requiredOrgFiles = Object.freeze([
  AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME,
  AGENT_ORG_TASK_DELEGATION_RECORDS_V1_FILE_NAME,
  AGENT_ORG_COMMUNICATION_MESSAGES_V1_FILE_NAME,
]);
const retiredOrgFiles = Object.freeze([
  "team_run_metadata.json",
  TEAM_RUN_EXECUTION_TREE_FILE_NAME,
  TASK_DELEGATION_RECORDS_V1_FILE_NAME,
  TEAM_COMMUNICATION_MESSAGES_V1_FILE_NAME,
]);

/**
 * Current-only readiness owner for both durable collaboration root families.
 * It selects by physical family, never tries the other codec, never repairs or
 * transforms a package, and rejects the same root ID when both families exist.
 */
export class RootRunPackageReadinessIndex {
  private readonly state: ReadinessState;
  private readonly layout: AgentMemoryLayout;

  constructor(
    private readonly memoryDir: string,
    private readonly stores: Readonly<{
      teamTree: TeamRunExecutionTreeStore;
      teamTasks: TaskDelegationRecordsV1Store;
      teamMessages: TeamCommunicationV1Store;
      orgTree: AgentOrgRunExecutionTreeStore;
      orgTasks: AgentOrgTaskDelegationRecordsV1Store;
      orgMessages: AgentOrgCommunicationMessagesV1Store;
    }> = {
      teamTree: new TeamRunExecutionTreeStore(),
      teamTasks: new TaskDelegationRecordsV1Store(),
      teamMessages: new TeamCommunicationV1Store(),
      orgTree: new AgentOrgRunExecutionTreeStore(),
      orgTasks: new AgentOrgTaskDelegationRecordsV1Store(),
      orgMessages: new AgentOrgCommunicationMessagesV1Store(),
    },
  ) {
    this.state = stateFor(memoryDir);
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  isInitialized(): boolean { return this.state.initialized; }
  awaitReady(): Promise<void> {
    if (this.state.rebuildPromise) return this.state.rebuildPromise;
    return this.state.initialized ? Promise.resolve() : this.rebuild();
  }

  isAdmitted(rootSubjectKind: RootRunPackageFamily, rootRunId: string): boolean {
    const id = rootRunId.trim();
    return rootSubjectKind === "agent_team"
      ? this.state.admittedTeams.has(id)
      : this.state.admittedOrgs.has(id);
  }

  listAdmitted(rootSubjectKind: RootRunPackageFamily): readonly string[] {
    const values = rootSubjectKind === "agent_team"
      ? this.state.admittedTeams
      : this.state.admittedOrgs;
    return Object.freeze([...values].sort());
  }

  listDiagnostics(rootSubjectKind?: RootRunPackageFamily): readonly RootRunPackageReadinessDiagnostic[] {
    return Object.freeze(this.state.diagnostics
      .filter((item) => rootSubjectKind === undefined || item.rootSubjectKind === rootSubjectKind)
      .map((item) => Object.freeze({ ...item })));
  }

  admitCurrent(rootSubjectKind: RootRunPackageFamily, rootRunId: string): void {
    const id = rootRunId.trim();
    if (!id) throw new Error("rootRunId is required.");
    const own = rootSubjectKind === "agent_team" ? this.state.admittedTeams : this.state.admittedOrgs;
    const other = rootSubjectKind === "agent_team" ? this.state.admittedOrgs : this.state.admittedTeams;
    if (other.has(id)) throw new Error(`RootRun '${id}' is already admitted in the other collaboration family.`);
    own.add(id);
    this.state.diagnostics = this.state.diagnostics.filter((item) =>
      item.rootSubjectKind !== rootSubjectKind || item.rootRunId !== id);
    this.state.mutationRevision += 1;
  }

  excludeCurrent(
    rootSubjectKind: RootRunPackageFamily,
    rootRunId: string,
    reason: string,
  ): void {
    const id = rootRunId.trim();
    if (!id) return;
    (rootSubjectKind === "agent_team" ? this.state.admittedTeams : this.state.admittedOrgs).delete(id);
    this.state.diagnostics = this.state.diagnostics.filter((item) =>
      item.rootSubjectKind !== rootSubjectKind || item.rootRunId !== id);
    const packagePath = rootSubjectKind === "agent_team"
      ? this.layout.getTeamDirPath({ rootTeamRunId: id, ancestorTeamRunIds: [] })
      : this.layout.getOrgDirPath(id);
    this.record(this.state, rootSubjectKind, id, packagePath, "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", reason);
    this.state.mutationRevision += 1;
  }

  rebuild(): Promise<void> {
    if (this.state.rebuildPromise) return this.state.rebuildPromise;
    const attempt = this.rebuildUntilStable();
    this.state.rebuildPromise = attempt;
    void attempt.finally(() => {
      if (this.state.rebuildPromise === attempt) this.state.rebuildPromise = null;
    }).catch(() => undefined);
    return attempt;
  }

  private async rebuildUntilStable(): Promise<void> {
    while (true) {
      const revision = this.state.mutationRevision;
      const candidate = await this.buildSnapshot();
      if (revision !== this.state.mutationRevision) continue;
      this.state.admittedTeams = candidate.admittedTeams;
      this.state.admittedOrgs = candidate.admittedOrgs;
      this.state.diagnostics = candidate.diagnostics;
      this.state.initialized = true;
      return;
    }
  }

  private async buildSnapshot(): Promise<ReadinessSnapshot> {
    const candidate: ReadinessSnapshot = {
      admittedTeams: new Set(),
      admittedOrgs: new Set(),
      diagnostics: [],
    };

    const [teamEntries, orgEntries] = await Promise.all([
      this.listFamilyEntries(this.layout.getTeamRootDirPath()),
      this.listFamilyEntries(this.layout.getOrgRootDirPath()),
    ]);
    const teamById = new Map(teamEntries.map((entry) => [entry.name, entry]));
    const orgById = new Map(orgEntries.map((entry) => [entry.name, entry]));
    const allIds = [...new Set([...teamById.keys(), ...orgById.keys()])].sort();

    for (const rootRunId of allIds) {
      const team = teamById.get(rootRunId);
      const org = orgById.get(rootRunId);
      if (team && org) {
        this.record(candidate, "agent_team", rootRunId, team.packagePath, "ROOT_RUN_FAMILY_CONFLICT",
          `RootRun '${rootRunId}' exists in both agent_teams and agent_orgs; neither family is admitted.`);
        this.record(candidate, "agent_org", rootRunId, org.packagePath, "ROOT_RUN_FAMILY_CONFLICT",
          `RootRun '${rootRunId}' exists in both agent_teams and agent_orgs; neither family is admitted.`);
        continue;
      }
      if (team) await this.inspectTeam(candidate, rootRunId, team);
      if (org) await this.inspectOrg(candidate, rootRunId, org);
    }
    return candidate;
  }

  private async inspectTeam(
    target: ReadinessSnapshot,
    rootRunId: string,
    entry: Readonly<{ packagePath: string; isDirectory: boolean }>,
  ): Promise<void> {
    if (!entry.isDirectory) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_NOT_DIRECTORY", "Package root is not a directory.");
      return;
    }
    const manifestError = await this.validateManifest(entry.packagePath, requiredTeamFiles, retiredTeamFiles);
    if (manifestError) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MANIFEST_INVALID", manifestError);
      return;
    }
    try {
      const [executionTree, taskRecords, communicationMessages] = await Promise.all([
        this.stores.teamTree.read(entry.packagePath, rootRunId),
        this.stores.teamTasks.read(entry.packagePath, rootRunId),
        this.stores.teamMessages.read(entry.packagePath, rootRunId),
      ]);
      if (!executionTree || !taskRecords || !communicationMessages) {
        throw new Error("Team Run V2 tree and both strict Team sidecars are required.");
      }
      validateTeamRunStatePackage({ executionTree, taskRecords, communicationMessages });
      target.admittedTeams.add(rootRunId);
    } catch (error) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", message(error));
    }
  }

  private async inspectOrg(
    target: ReadinessSnapshot,
    rootRunId: string,
    entry: Readonly<{ packagePath: string; isDirectory: boolean }>,
  ): Promise<void> {
    if (!entry.isDirectory) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_NOT_DIRECTORY", "Package root is not a directory.");
      return;
    }
    const manifestError = await this.validateManifest(entry.packagePath, requiredOrgFiles, retiredOrgFiles);
    if (manifestError) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MANIFEST_INVALID", manifestError);
      return;
    }
    try {
      const [executionTree, taskRecords, communicationMessages] = await Promise.all([
        this.stores.orgTree.read(entry.packagePath, rootRunId),
        this.stores.orgTasks.read(entry.packagePath, rootRunId),
        this.stores.orgMessages.read(entry.packagePath, rootRunId),
      ]);
      if (!executionTree || !taskRecords || !communicationMessages) {
        throw new Error("AgentOrg Run V1 tree and both strict Org sidecars are required.");
      }
      validateAgentOrgStatePackage({ executionTree, taskRecords, communicationMessages });
      target.admittedOrgs.add(rootRunId);
    } catch (error) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", message(error));
    }
  }

  private async listFamilyEntries(root: string): Promise<readonly Readonly<{
    name: string;
    packagePath: string;
    isDirectory: boolean;
  }>[]> {
    const entries = await fs.readdir(root, { withFileTypes: true }).catch((error: NodeJS.ErrnoException) => {
      if (error.code === "ENOENT") return [];
      throw error;
    });
    return Object.freeze(entries
      .filter((entry) => !entry.name.startsWith("."))
      .sort((left, right) => left.name.localeCompare(right.name))
      .map((entry) => Object.freeze({
        name: entry.name,
        packagePath: path.join(root, entry.name),
        isDirectory: entry.isDirectory(),
      })));
  }

  private async validateManifest(
    packagePath: string,
    required: readonly string[],
    retired: readonly string[],
  ): Promise<string | null> {
    const missing = (await Promise.all(required.map(async (name) =>
      await exists(path.join(packagePath, name)) ? null : name))).filter((name): name is string => name !== null);
    if (missing.length) return `Current package is missing required authorities: ${missing.join(", ")}.`;
    const residue = (await Promise.all(retired.map(async (name) =>
      await exists(path.join(packagePath, name)) ? name : null))).filter((name): name is string => name !== null);
    return residue.length ? `Current package still contains retired root authorities: ${residue.join(", ")}.` : null;
  }

  private record(
    target: ReadinessSnapshot,
    rootSubjectKind: RootRunPackageFamily,
    rootRunId: string,
    packagePath: string,
    code: RootRunPackageReadinessDiagnostic["code"],
    reason: string,
  ): void {
    target.diagnostics.push(Object.freeze({ rootSubjectKind, rootRunId, packagePath, code, reason }));
  }
}

const message = (error: unknown): string => error instanceof Error ? error.message : String(error);

export const resetRootRunPackageReadinessIndex = (memoryDir: string): void => {
  states.delete(stateKey(memoryDir));
};
