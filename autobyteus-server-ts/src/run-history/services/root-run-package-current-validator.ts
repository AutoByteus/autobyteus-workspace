import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgCommunicationMessagesStore } from "../../agent-org-execution/persistence/agent-org-communication-messages-store.js";
import { AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME } from "../../agent-org-execution/persistence/agent-org-communication-messages.js";
import { validateAgentOrgStatePackage } from "../../agent-org-execution/services/agent-org-state-package-validator.js";
import { TeamCommunicationStore, TEAM_COMMUNICATION_MESSAGES_FILE_NAME } from "../../services/team-communication/team-communication-store.js";
import { AgentOrgRunExecutionTreeStore } from "../store/agent-org-run-execution-tree-store.js";
import { AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME } from "../store/agent-org-run-execution-tree-path.js";
import { TeamRunExecutionTreeStore } from "../store/team-run-execution-tree-store.js";
import { TEAM_RUN_EXECUTION_TREE_FILE_NAME } from "../store/team-run-execution-tree-path.js";
import { validateTeamRunStatePackage } from "./team-run-state-package-validator.js";

import { AgentRunMetadataStore } from "../store/agent-run-metadata-store.js";

export type RootRunPackageFamily = "agent_team" | "agent_org" | "agent";
export type RootRunPackageReadinessDiagnostic = Readonly<{
  rootSubjectKind: RootRunPackageFamily; rootRunId: string; packagePath: string;
  code: "ROOT_RUN_FAMILY_CONFLICT" | "ROOT_RUN_PACKAGE_NOT_DIRECTORY" | "ROOT_RUN_PACKAGE_MANIFEST_INVALID"
    | "ROOT_RUN_PACKAGE_MISSING_TREE" | "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED"
    | "FAILED_ATTEMPT";
  reason: string;
}>;
/** One admitted root run's package (its family folder). */
export type CurrentRunPackage = Readonly<{
  key: string; family: RootRunPackageFamily; id: string; directory: string;
}>;
export type CurrentPackageSnapshot = { groups: CurrentRunPackage[]; diagnostics: RootRunPackageReadinessDiagnostic[] };
export const packageKey = (family: RootRunPackageFamily, id: string): string => `${family}:${id}`;
export const isAttemptError = (error: unknown): boolean => typeof (error as NodeJS.ErrnoException)?.code === "string";
const exists = (filePath: string): Promise<boolean> =>
  fs.access(filePath).then(() => true).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return false; throw error; });

// Released task-records files are neither required nor retired: an old package
// keeps its untouched records file on disk and is still admitted.
const requiredTeamFiles = Object.freeze([
  TEAM_RUN_EXECUTION_TREE_FILE_NAME,
  TEAM_COMMUNICATION_MESSAGES_FILE_NAME,
]);
const retiredTeamFiles = Object.freeze([
  "team_run_metadata.json",
  AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME,
  AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME,
]);
const requiredOrgFiles = Object.freeze([
  AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME,
  AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME,
]);
const retiredOrgFiles = Object.freeze([
  "team_run_metadata.json",
  TEAM_RUN_EXECUTION_TREE_FILE_NAME,
  TEAM_COMMUNICATION_MESSAGES_FILE_NAME,
]);


/**
 * Strict current structure only; the runtime's admission of root runs (runs the user started). A task
 * agent's folder is never a root candidate (G1, G2): `agents/<id>/` with a task agent's own file and
 * `agent_teams/<id>/` with a task agent team's own tree are skipped without a diagnostic, linked or
 * detached (contract §4, §10).
 */
export class RootRunPackageCurrentValidator {
  private readonly layout: AgentMemoryLayout;
  constructor(
    private readonly memoryDir: string,
    private readonly stores: Readonly<{
      teamTree: TeamRunExecutionTreeStore;
      teamMessages: TeamCommunicationStore;
      orgTree: AgentOrgRunExecutionTreeStore;
      orgMessages: AgentOrgCommunicationMessagesStore;
    }> = {
      teamTree: new TeamRunExecutionTreeStore(),
      teamMessages: new TeamCommunicationStore(),
      orgTree: new AgentOrgRunExecutionTreeStore(),
      orgMessages: new AgentOrgCommunicationMessagesStore(),
    },
  ) {
    this.layout = new AgentMemoryLayout(memoryDir);
  }

  async scan(): Promise<CurrentPackageSnapshot> {
    const candidate: CurrentPackageSnapshot = {
      groups: [],
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
      try {
        if (team) await this.inspectTeam(candidate, rootRunId, team);
        if (org) await this.inspectOrg(candidate, rootRunId, org);
      } catch (error) {
        const entry = team ?? org!;
        this.record(candidate, team ? "agent_team" : "agent_org", rootRunId, entry.packagePath, "FAILED_ATTEMPT", message(error));
      }
    }
    for (const entry of await this.listFamilyEntries(this.layout.getStandaloneRootDirPath())) {
      const id = entry.name;
      if (!entry.isDirectory) {
        this.record(candidate, "agent", id, entry.packagePath, "ROOT_RUN_PACKAGE_NOT_DIRECTORY", "Package root is not a directory.");
        continue;
      }
      const metadataStore = new AgentRunMetadataStore(this.memoryDir);
      const state = await metadataStore.readMetadataState(id);
      if (state.kind === "missing" && (await metadataStore.readTaskAgentMetadataState(id)).kind !== "missing") continue;
      if (state.kind !== "present") {
        this.record(candidate, "agent", id, entry.packagePath,
          state.kind === "unreadable" && isAttemptError(state.error) ? "FAILED_ATTEMPT" : "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED",
          state.kind === "missing" ? "Current standalone metadata is missing." : state.error.message);
        continue;
      }
      const key = packageKey("agent", id);
      candidate.groups.push({ key, family: "agent", id, directory: entry.packagePath });
    }
    return candidate;
  }

  private async inspectTeam(
    target: CurrentPackageSnapshot,
    rootRunId: string,
    entry: Readonly<{ packagePath: string; isDirectory: boolean }>,
  ): Promise<void> {
    if (!entry.isDirectory) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_NOT_DIRECTORY", "Package root is not a directory.");
      return;
    }
    if (!await exists(path.join(entry.packagePath, TEAM_RUN_EXECUTION_TREE_FILE_NAME))) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MISSING_TREE", "Execution tree is missing; package preserved.");
      return;
    }
    try {
      if (await this.stores.teamTree.isTaskAgentTeamDir(entry.packagePath)) return;
    } catch (error) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, isAttemptError(error) ? "FAILED_ATTEMPT" : "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", message(error));
      return;
    }
    const manifestError = await this.validateManifest(entry.packagePath, requiredTeamFiles, retiredTeamFiles);
    if (manifestError) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MANIFEST_INVALID", manifestError);
      return;
    }
    try {
      const executionTree = await this.stores.teamTree.read(entry.packagePath, rootRunId);
      const communicationMessages = executionTree ? await this.stores.teamMessages.read(entry.packagePath, executionTree) : null;
      if (!executionTree || !communicationMessages) {
        throw new Error("Team Run V3 tree and strict Team communication messages are required.");
      }
      validateTeamRunStatePackage({ executionTree, communicationMessages });
      target.groups.push({ key: packageKey("agent_team", rootRunId), family: "agent_team", id: rootRunId, directory: entry.packagePath });
    } catch (error) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, isAttemptError(error) ? "FAILED_ATTEMPT" : "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", message(error));
    }
  }

  private async inspectOrg(
    target: CurrentPackageSnapshot,
    rootRunId: string,
    entry: Readonly<{ packagePath: string; isDirectory: boolean }>,
  ): Promise<void> {
    if (!entry.isDirectory) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_NOT_DIRECTORY", "Package root is not a directory.");
      return;
    }
    if (!await exists(path.join(entry.packagePath, AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME))) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MISSING_TREE", "Execution tree is missing; package preserved.");
      return;
    }
    const manifestError = await this.validateManifest(entry.packagePath, requiredOrgFiles, retiredOrgFiles);
    if (manifestError) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MANIFEST_INVALID", manifestError);
      return;
    }
    try {
      const executionTree = await this.stores.orgTree.read(entry.packagePath, rootRunId);
      const communicationMessages = executionTree ? await this.stores.orgMessages.read(entry.packagePath, executionTree) : null;
      if (!executionTree || !communicationMessages) {
        throw new Error("AgentOrg Run V2 tree and strict Org communication messages are required.");
      }
      validateAgentOrgStatePackage({ executionTree, communicationMessages });
      target.groups.push({ key: packageKey("agent_org", rootRunId), family: "agent_org", id: rootRunId, directory: entry.packagePath });
    } catch (error) {
      this.record(target, "agent_org", rootRunId, entry.packagePath, isAttemptError(error) ? "FAILED_ATTEMPT" : "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED", message(error));
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
    target: CurrentPackageSnapshot,
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
