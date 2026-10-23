// Frozen copy of `src/run-history/services/root-run-package-current-validator.ts` as of
// origin/personal@66429d6f31 (after the D-10 rename): today's root-package validator, whose owners
// and directories are nested by physical scope (a task agent inside its coordinating run). Only the
// default readers changed: trees are read with the released tree parser and message files directly
// (`released-trees-before-task-agent-own-run.ts`) instead of through the current stores, which compose
// task agents from their own files after `20261017_task_agent_own_run_v1`. Owned by the released
// app-data migrations that run before it; current runtime must not import it.
//
// Same-ID repair R-B (append-only message logs): a package's message authority is present when its JSON
// log or any file of its append-only log exists; its messages are read through the R-A readers.

import fs from "node:fs/promises";
import path from "node:path";
import { AgentMemoryLayout } from "../server/agent-memory/store/agent-memory-layout.js";
import { validateAgentOrgStatePackage } from "../server/agent-org-execution/services/agent-org-state-package-validator.js";
import { AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME, TEAM_COMMUNICATION_MESSAGES_FILE_NAME } from "./released-message-logs-before-append-only.js";
import { hasReleasedAppendOnlyMessageLogFile, type ReleasedAppendOnlyMessageLogBaseName } from "./released-message-log-files-from-append-only.js";
import { AGENT_ORG_RUN_EXECUTION_TREE_FILE_NAME } from "../server/run-history/store/agent-org-run-execution-tree-path.js";
import { TEAM_RUN_EXECUTION_TREE_FILE_NAME } from "../server/run-history/store/team-run-execution-tree-path.js";
import { validateTeamRunStatePackage } from "../server/run-history/services/team-run-state-package-validator.js";
import {
  ReleasedAgentOrgCommunicationMessagesReader,
  ReleasedAgentOrgRunExecutionTreeReader,
  ReleasedTeamCommunicationMessagesReader,
  ReleasedTeamRunExecutionTreeReader,
} from "./released-trees-before-task-agent-own-run.js";

import { AgentRunMetadataStore } from "../server/run-history/store/agent-run-metadata-store.js";
import { TeamExecutionIndex } from "../server/agent-team-execution/services/team-execution-index.js";
import { AgentOrgExecutionIndex } from "../server/agent-org-execution/services/agent-org-execution-index.js";
import type { ContextFileFinalOwnerDescriptor } from "../server/context-files/domain/context-file-owner-types.js";

export type RootRunPackageFamily = "agent_team" | "agent_org" | "agent";
export type RootRunPackageReadinessDiagnostic = Readonly<{
  rootSubjectKind: RootRunPackageFamily; rootRunId: string; packagePath: string;
  code: "ROOT_RUN_FAMILY_CONFLICT" | "ROOT_RUN_PACKAGE_NOT_DIRECTORY" | "ROOT_RUN_PACKAGE_MANIFEST_INVALID"
    | "ROOT_RUN_PACKAGE_MISSING_TREE" | "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED"
    | "FAILED_ATTEMPT";
  reason: string;
}>;
export type CurrentContextFileOwner = Readonly<{
  descriptor: ContextFileFinalOwnerDescriptor; directory: string;
}> & ({ descriptor: Extract<ContextFileFinalOwnerDescriptor, {kind: "team_member_final"}>; address: string }
  | { descriptor: Exclude<ContextFileFinalOwnerDescriptor, {kind: "team_member_final"}> });
export type CurrentRunPackage = Readonly<{
  key: string; family: RootRunPackageFamily; id: string; directory: string;
  rootDirectories: string[]; agentDirectories: string[]; owners: CurrentContextFileOwner[];
}>;
export type CurrentPackageSnapshot = { groups: CurrentRunPackage[]; diagnostics: RootRunPackageReadinessDiagnostic[] };
export const packageKey = (family: RootRunPackageFamily, id: string): string => `${family}:${id}`;
export const isAttemptError = (error: unknown): boolean => typeof (error as NodeJS.ErrnoException)?.code === "string";
const exists = (filePath: string): Promise<boolean> =>
  fs.access(filePath).then(() => true).catch((error: NodeJS.ErrnoException) => { if (error.code === "ENOENT") return false; throw error; });
/** The append-only log that stands in for each JSON message authority (R-B). */
const APPEND_ONLY_MESSAGE_LOGS: Readonly<Record<string, ReleasedAppendOnlyMessageLogBaseName>> = Object.freeze({
  [TEAM_COMMUNICATION_MESSAGES_FILE_NAME]: "team_communication_messages",
  [AGENT_ORG_COMMUNICATION_MESSAGES_FILE_NAME]: "agent_org_communication_messages",
});
const hasAuthority = async (packagePath: string, name: string): Promise<boolean> => {
  if (await exists(path.join(packagePath, name))) return true;
  const appendOnly = APPEND_ONLY_MESSAGE_LOGS[name];
  return appendOnly !== undefined && await hasReleasedAppendOnlyMessageLogFile(packagePath, appendOnly);
};

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


/** Strict structure of the released packages, as admitted before task-agent-own-run. */
export class ReleasedRootRunPackageValidator {
  private readonly layout: AgentMemoryLayout;
  constructor(
    private readonly memoryDir: string,
    private readonly stores: Readonly<{
      teamTree: ReleasedTeamRunExecutionTreeReader;
      teamMessages: ReleasedTeamCommunicationMessagesReader;
      orgTree: ReleasedAgentOrgRunExecutionTreeReader;
      orgMessages: ReleasedAgentOrgCommunicationMessagesReader;
    }> = {
      teamTree: new ReleasedTeamRunExecutionTreeReader(),
      teamMessages: new ReleasedTeamCommunicationMessagesReader(),
      orgTree: new ReleasedAgentOrgRunExecutionTreeReader(),
      orgMessages: new ReleasedAgentOrgCommunicationMessagesReader(),
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
      const state = await new AgentRunMetadataStore(this.memoryDir).readMetadataState(id);
      if (state.kind !== "present") {
        this.record(candidate, "agent", id, entry.packagePath,
          state.kind === "unreadable" && isAttemptError(state.error) ? "FAILED_ATTEMPT" : "ROOT_RUN_PACKAGE_CURRENT_VALIDATION_FAILED",
          state.kind === "missing" ? "Current standalone metadata is missing." : state.error.message);
        continue;
      }
      const key = packageKey("agent", id);
      candidate.groups.push({ key, family: "agent", id, directory: entry.packagePath,
        rootDirectories: [], agentDirectories: [entry.packagePath],
        owners: [{ descriptor: {kind: "agent_final", runId: id}, directory: entry.packagePath }] });
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
    const manifestError = await this.validateManifest(entry.packagePath, requiredTeamFiles, retiredTeamFiles);
    if (manifestError) {
      this.record(target, "agent_team", rootRunId, entry.packagePath, "ROOT_RUN_PACKAGE_MANIFEST_INVALID", manifestError);
      return;
    }
    try {
      const [executionTree, communicationMessages] = await Promise.all([
        this.stores.teamTree.read(entry.packagePath, rootRunId),
        this.stores.teamMessages.read(entry.packagePath, rootRunId),
      ]);
      if (!executionTree || !communicationMessages) {
        throw new Error("Team Run V3 tree and strict Team communication messages are required.");
      }
      const currentInput = executionTree;
      validateTeamRunStatePackage({ executionTree: currentInput, communicationMessages });
      const index = new TeamExecutionIndex(currentInput);
      const key = packageKey("agent_team", rootRunId);
      const owners: CurrentContextFileOwner[] = index.listAgentExecutions().map((agent) => ({
        descriptor: { kind: "team_member_final", teamRunId: agent.containingTeamRunId, agentRunId: agent.agentRunId },
        address: agent.address,
        directory: this.layout.getRootedAgentRunDirPath(index.getTeamRunPhysicalScope(agent.containingTeamRunId), agent.agentRunId),
      }));
      target.groups.push({ key, family: "agent_team", id: rootRunId, directory: entry.packagePath, owners,
        rootDirectories: index.listTeamExecutions().map((team) => this.layout.getRootExecutionDirPath(index.getTeamRunPhysicalScope(team.teamRunId))),
        agentDirectories: owners.map((owner) => owner.directory) });
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
      const [executionTree, communicationMessages] = await Promise.all([
        this.stores.orgTree.read(entry.packagePath, rootRunId),
        this.stores.orgMessages.read(entry.packagePath, rootRunId),
      ]);
      if (!executionTree || !communicationMessages) {
        throw new Error("AgentOrg Run V2 tree and strict Org communication messages are required.");
      }
      const currentInput = executionTree;
      validateAgentOrgStatePackage({ executionTree: currentInput, communicationMessages });
      const index = new AgentOrgExecutionIndex(currentInput);
      const key = packageKey("agent_org", rootRunId);
      const owners: CurrentContextFileOwner[] = index.listAgents().map((agent) => ({
        descriptor: { kind: "org_member_final", orgRunId: rootRunId, agentRunId: agent.agentRunId },
        directory: this.layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(agent.agentRunId), agent.agentRunId),
      }));
      target.groups.push({ key, family: "agent_org", id: rootRunId, directory: entry.packagePath, owners,
        rootDirectories: [entry.packagePath, ...index.listTeams().map((team) => this.layout.getRootExecutionDirPath(index.getPhysicalScopeForTeam(team.teamRunId)))],
        agentDirectories: owners.map((owner) => owner.directory) });
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
      await hasAuthority(packagePath, name) ? null : name))).filter((name): name is string => name !== null);
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

export type AgentOrgRunPackageDiagnostic = Readonly<{
  orgRunId: string;
  path: string;
  reason: string;
}>;

/**
 * Frozen copy of today's `AgentOrgRunPackageCatalog` over `RootRunPackageReadinessIndex`, as used by a
 * one-shot startup migration: `rebuild()` scans once with the released validator (a failed discovery
 * admits nothing and reports one `FAILED_ATTEMPT`, as the readiness index does). It keeps its own state
 * and never touches the runtime's shared readiness index.
 */
export class ReleasedAgentOrgRunPackageCatalog {
  private readonly validator: ReleasedRootRunPackageValidator;
  private admitted: string[] = [];
  private diagnostics: RootRunPackageReadinessDiagnostic[] = [];

  constructor(private readonly memoryDir: string) {
    this.validator = new ReleasedRootRunPackageValidator(memoryDir);
  }

  async rebuild(): Promise<void> {
    let snapshot: CurrentPackageSnapshot;
    try { snapshot = await this.validator.scan(); }
    catch (error) {
      this.admitted = [];
      this.diagnostics = [{ rootSubjectKind: "agent_team", rootRunId: "*", packagePath: this.memoryDir,
        code: "FAILED_ATTEMPT", reason: `History discovery unavailable: ${message(error)}` }];
      console.warn(this.diagnostics[0]!.reason);
      return;
    }
    const prefix = "agent_org:";
    this.admitted = snapshot.groups.map((group) => group.key).filter((key) => key.startsWith(prefix))
      .map((key) => key.slice(prefix.length)).sort();
    this.diagnostics = snapshot.diagnostics;
  }

  listAdmitted(): string[] { return [...this.admitted]; }

  listDiagnostics(): readonly AgentOrgRunPackageDiagnostic[] {
    return this.diagnostics.filter((item) => item.rootSubjectKind === "agent_org").map((diagnostic) => Object.freeze({
      orgRunId: diagnostic.rootRunId,
      path: diagnostic.packagePath,
      reason: `${diagnostic.code}: ${diagnostic.reason}`,
    }));
  }
}
