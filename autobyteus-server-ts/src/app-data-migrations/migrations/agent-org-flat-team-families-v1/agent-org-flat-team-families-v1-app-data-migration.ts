import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../../config/app-config.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { validateTeamRunExecutionTreePayload } from "../../../run-history/store/team-run-execution-tree-schema.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
import { getTeamRunExecutionTreePath } from "../../../run-history/store/team-run-execution-tree-path.js";
import { getAgentOrgRunExecutionTreePath } from "../../../run-history/store/agent-org-run-execution-tree-path.js";
import { getAtomicRunPackageFileCommitWriter, type AtomicRunPackageFileCommitWriter } from "../../../run-history/store/atomic-run-package-file-commit-writer.js";
import { getTaskDelegationRecordsV1Path } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-store.js";
import { validateTaskDelegationRecordsV1Payload } from "../../../agent-team-execution/task-delegation/records/task-delegation-records-v1-schema.js";
import { getTeamCommunicationMessagesV1Path } from "../../../services/team-communication/team-communication-v1-store.js";
import { validateTeamCommunicationMessagesV1Payload } from "../../../services/team-communication/team-communication-v1-schema.js";
import { getAgentOrgTaskDelegationRecordsV1Path } from "../../../agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { validateAgentOrgTaskDelegationRecordsV1 } from "../../../agent-org-execution/persistence/agent-org-task-delegation-records-v1-schema.js";
import { getAgentOrgCommunicationMessagesV1Path } from "../../../agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { validateAgentOrgCommunicationMessagesV1 } from "../../../agent-org-execution/persistence/agent-org-communication-messages-v1-schema.js";
import { TeamRunHistoryIndexStore } from "../../../run-history/store/team-run-history-index-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../run-history/store/agent-org-run-history-index-store.js";
import type { AgentOrgRunIndexRowRecord } from "../../../run-history/store/agent-org-run-history-index-record-types.js";
import { validateReleasedTeamRunV2 } from "./released-team-run-v2-schema.js";

import { validateAgentOrgStatePackage } from "../../../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgContextFileLocatorTransition } from "./agent-org-context-file-locator-transition.js";
import { orgTreeTarget } from "./agent-org-runtime-tree-target.js";

export const AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID = "20260901_agent_org_flat_team_families_v1";

type Disposition =
  | "SKIPPED_FLAT_TEAM_RUN_ZERO_WRITE" | "MIGRATED_ORG_RUN" | "CLEANED_CURRENT_ORG"
  | "MIGRATED_ORG_HISTORY" | "FAILED_RUNTIME" | "FAILED_HISTORY" | "FAILED_FAMILY_CONFLICT";
type Count = { count: number; examples: string[]; reasons: string[] };
const exists = (target: string): Promise<boolean> => fs.access(target).then(() => true).catch(() => false);
const errorReason = (error: unknown): string => error instanceof Error ? error.message : String(error);
export class AgentOrgFlatTeamFamiliesV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID;
  readonly displayName = "Cut over flat Team and AgentOrg run families";
  readonly description = "Converts one-level organization-like Team runs and their history while preserving native flat Team runs byte-for-byte.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID] as const;
  private counts = new Map<Disposition, Count>();
  private scanned = 0;
  private readonly layout: AgentMemoryLayout;
  private locatorTransition!: AgentOrgContextFileLocatorTransition;
  constructor(
    private readonly memoryDir: string,
    private readonly config: AppConfig = appConfigProvider.config,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
  ) { this.layout = new AgentMemoryLayout(memoryDir); }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.counts.clear(); this.scanned = 0;
    this.locatorTransition = new AgentOrgContextFileLocatorTransition(this.memoryDir, this.writer, () => this.config.getBaseUrl());
    await this.locatorTransition.prepareAndCommit();
    for (const [id, reason] of this.locatorTransition.failures) this.add("FAILED_RUNTIME", id, reason);
    await this.migrateRuntimeRoots();
    await this.cleanupOrgTargets();
    await this.migrateHistoryIndexes();
    return this.result();
  }
  private async migrateRuntimeRoots(): Promise<void> {
    const sourceRoot = this.layout.getTeamRootDirPath();
    const targetRoot = this.layout.getOrgRootDirPath();
    const entries = await fs.readdir(sourceRoot, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      this.scanned += 1;
      const source = path.join(sourceRoot, entry.name);
      if (this.locatorTransition.failures.has(entry.name)) {
        if (await exists(path.join(targetRoot, entry.name))) this.add("FAILED_FAMILY_CONFLICT", source, "AgentOrg run destination already exists.");
        continue;
      }
      const filePath = getTeamRunExecutionTreePath(source);
      let raw: unknown;
      try { raw = JSON.parse(await fs.readFile(filePath, "utf8")); }
      catch (error) { this.add("FAILED_RUNTIME", filePath, errorReason(error)); continue; }
      try {
        validateTeamRunExecutionTreePayload(raw, entry.name);
        this.add("SKIPPED_FLAT_TEAM_RUN_ZERO_WRITE", filePath);
        continue;
      } catch { /* migration-only released V2 classifier follows */ }
      try {
        const released = validateReleasedTeamRunV2(raw, entry.name);
        if (released.teamCount < 1) throw new Error("non-flat root is not organization-like.");
        const targetDir = path.join(targetRoot, entry.name);
        if (await exists(targetDir)) {
          this.add("FAILED_FAMILY_CONFLICT", targetDir, "AgentOrg run destination already exists.");
          continue;
        }
        const teamTasks = validateTaskDelegationRecordsV1Payload(
          JSON.parse(await fs.readFile(getTaskDelegationRecordsV1Path(source), "utf8")),
          entry.name,
        );
        const teamMessages = validateTeamCommunicationMessagesV1Payload(
          JSON.parse(await fs.readFile(getTeamCommunicationMessagesV1Path(source), "utf8")),
          entry.name,
        );
        const target = orgTreeTarget(released);
        validateAgentOrgRunExecutionTreePayload(target, entry.name);
        const orgTasks = validateAgentOrgTaskDelegationRecordsV1({
          schemaVersion: 1,
          subjectKind: "agent_org",
          orgRunId: entry.name,
          records: teamTasks.records,
        }, entry.name);
        const orgMessages = validateAgentOrgCommunicationMessagesV1({
          schemaVersion: 1,
          subjectKind: "agent_org",
          orgRunId: entry.name,
          messages: teamMessages.messages,
        }, entry.name);
        await this.writeJson(getAgentOrgRunExecutionTreePath(source), target, "execution_tree");
        await this.writeJson(getAgentOrgTaskDelegationRecordsV1Path(source), orgTasks, "org_task_records");
        await this.writeJson(getAgentOrgCommunicationMessagesV1Path(source), orgMessages, "org_communication_messages");
        validateAgentOrgRunExecutionTreePayload(JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(source), "utf8")), entry.name);
        validateAgentOrgTaskDelegationRecordsV1(JSON.parse(await fs.readFile(getAgentOrgTaskDelegationRecordsV1Path(source), "utf8")), entry.name);
        validateAgentOrgCommunicationMessagesV1(JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesV1Path(source), "utf8")), entry.name);
        await this.locatorTransition.validateRoot(source, entry.name);
        await fs.mkdir(targetRoot, { recursive: true });
        await fs.rename(source, targetDir);
        await this.validateCompleteOrgRunPackage(targetDir, entry.name);
        await fs.rm(getTeamRunExecutionTreePath(targetDir), { force: true });
        await fs.rm(getTaskDelegationRecordsV1Path(targetDir), { force: true });
        await fs.rm(getTeamCommunicationMessagesV1Path(targetDir), { force: true });
        if (await exists(getTeamRunExecutionTreePath(targetDir))
          || await exists(getTaskDelegationRecordsV1Path(targetDir))
          || await exists(getTeamCommunicationMessagesV1Path(targetDir))) {
          throw new Error("retired Team run authorities cleanup failed.");
        }
        await this.validateCompleteOrgRunPackage(targetDir, entry.name);
        this.add("MIGRATED_ORG_RUN", targetDir);
      } catch (error) { this.add("FAILED_RUNTIME", filePath, errorReason(error)); }
    }
  }
  private async cleanupOrgTargets(): Promise<void> {
    const root = this.layout.getOrgRootDirPath();
    const entries = await fs.readdir(root, { withFileTypes: true }).catch(() => []);
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (!entry.isDirectory()) continue;
      const dir = path.join(root, entry.name);
      const retired = [
        getTeamRunExecutionTreePath(dir),
        getTaskDelegationRecordsV1Path(dir),
        getTeamCommunicationMessagesV1Path(dir),
      ];
      if (!(await Promise.all(retired.map(exists))).some(Boolean)) continue;
      this.scanned += 1;
      try {
        await this.validateCompleteOrgRunPackage(dir, entry.name);
        for (const filePath of retired) await fs.rm(filePath, { force: true });
        if ((await Promise.all(retired.map(exists))).some(Boolean)) throw new Error("retired Team run authorities cleanup failed.");
        await this.validateCompleteOrgRunPackage(dir, entry.name);
        this.add("CLEANED_CURRENT_ORG", dir);
      } catch (error) { this.add("FAILED_RUNTIME", dir, errorReason(error)); }
    }
  }
  private async migrateHistoryIndexes(): Promise<void> {
    const teamIndex = new TeamRunHistoryIndexStore(this.memoryDir);
    const orgIndex = new AgentOrgRunHistoryIndexStore(this.memoryDir);
    this.scanned += 1;
    try {
      const [teamSnapshot, existingOrgRows] = await Promise.all([
        teamIndex.readIndexStrict(),
        orgIndex.readIndex(),
      ]);
      const teamRows = new Map(teamSnapshot.rows.map((row) => [row.teamRunId, row]));
      const orgRows = new Map(existingOrgRows.map((row) => [row.orgRunId, row]));
      const orgRunIds = new Set<string>();
      const entries = await fs.readdir(this.layout.getOrgRootDirPath(), { withFileTypes: true }).catch(() => []);
      for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
        if (!entry.isDirectory()) continue;
        const orgDir = this.layout.getOrgDirPath(entry.name);
        await this.validateCompleteOrgRunPackage(orgDir, entry.name);
        const tree = validateAgentOrgRunExecutionTreePayload(
          JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(orgDir), "utf8")),
          entry.name,
        );
        orgRunIds.add(entry.name);
        const orgRow = orgRows.get(entry.name);
        const retiredTeamRow = teamRows.get(entry.name);
        const preserved = orgRow ?? retiredTeamRow;
        const next: AgentOrgRunIndexRowRecord = Object.freeze({
          orgRunId: entry.name,
          orgDefinitionId: tree.rootOrg.orgDefinitionId,
          orgDefinitionName: tree.rootOrg.orgDefinitionName,
          workspaceRootPath: tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath,
          summary: preserved?.summary ?? "",
          createdAt: tree.createdAt,
          archivedAt: tree.archivedAt,
          terminatedAt: preserved?.terminatedAt ?? null,
        });
        orgRows.set(entry.name, next);
      }
      const nextOrgRows = [...orgRows.values()].filter((row) => orgRunIds.has(row.orgRunId));
      await orgIndex.writeIndex(nextOrgRows);
      const nextTeamRows = teamSnapshot.rows.filter((row) => !orgRunIds.has(row.teamRunId));
      if (teamSnapshot.sourceExists && nextTeamRows.length !== teamSnapshot.rows.length) {
        await teamIndex.writeIndex(nextTeamRows);
      }
      const convertedCount = teamSnapshot.rows.length - nextTeamRows.length;
      if (convertedCount > 0) this.add("MIGRATED_ORG_HISTORY", teamSnapshot.sourcePath);
    } catch (error) {
      this.add("FAILED_HISTORY", this.memoryDir, errorReason(error));
    }
  }
  private async validateCompleteOrgRunPackage(dir: string, orgRunId: string): Promise<void> {
    await this.locatorTransition.validateRoot(dir, orgRunId);
    const executionTree = validateAgentOrgRunExecutionTreePayload(
      JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(dir), "utf8")),
      orgRunId,
    );
    const taskRecords = validateAgentOrgTaskDelegationRecordsV1(
      JSON.parse(await fs.readFile(getAgentOrgTaskDelegationRecordsV1Path(dir), "utf8")),
      orgRunId,
    );
    const communicationMessages = validateAgentOrgCommunicationMessagesV1(
      JSON.parse(await fs.readFile(getAgentOrgCommunicationMessagesV1Path(dir), "utf8")),
      orgRunId,
    );
    validateAgentOrgStatePackage({ executionTree, taskRecords, communicationMessages });
  }
  private async writeJson(filePath: string, payload: unknown, file: string): Promise<void> {
    const outcome = await this.writer.write({ file, filePath, payload });
    if (outcome.outcome !== "committed") {
      throw new Error(`Atomic write did not finalize for '${filePath}' (${outcome.outcome}:${outcome.stage}).`);
    }
  }
  private add(disposition: Disposition, example: string, reason?: string): void {
    const current = this.counts.get(disposition) ?? { count: 0, examples: [], reasons: [] };
    current.count += 1;
    current.examples.push(path.relative(this.memoryDir, example).split(path.sep).join("/"));
    if (reason) current.reasons.push(reason);
    current.examples.sort(); current.examples.splice(5);
    current.reasons.sort(); current.reasons.splice(5);
    this.counts.set(disposition, current);
  }
  private result(): AppDataMigrationExecutionResult {
    let migratedCount = 0, skippedCount = 0, failedCount = 0;
    const details: AppDataMigrationItemDetail[] = [];
    for (const [name, value] of [...this.counts].sort(([a], [b]) => a.localeCompare(b))) {
      const failed = name.startsWith("FAILED_");
      const skipped = name.startsWith("SKIPPED_");
      if (failed) failedCount += value.count; else if (skipped) skippedCount += value.count; else migratedCount += value.count;
      details.push({
        itemId: name,
        status: failed ? "FAILED" : skipped ? "SKIPPED" : "MIGRATED",
        message: `Count: ${value.count}.${value.examples.length ? ` Examples: ${value.examples.join(", ")}.` : ""}${value.reasons.length ? ` Reasons: ${value.reasons.join(" | ")}.` : ""}`,
      });
    }
    return { status: failedCount ? "FAILED" : "SUCCEEDED", summary: { scannedCount: this.scanned, migratedCount, skippedCount, failedCount, details }, errorMessage: failedCount ? `${failedCount} flat-Team/AgentOrg runtime/history item(s) require correction and restart.` : null };
  }
}
