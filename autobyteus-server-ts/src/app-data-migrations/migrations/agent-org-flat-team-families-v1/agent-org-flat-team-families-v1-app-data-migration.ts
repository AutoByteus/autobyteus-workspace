import { isDeepStrictEqual } from "node:util";
import { AgentOrgHistoryCandidatePlanner, retiredTeamFiles, migrationPathExists, type HistoryCandidatePlan } from "./agent-org-history-candidate-plan.js";
import { AgentOrgHistoryIndexTransition } from "./agent-org-history-index-transition.js";
import { AgentOrgTokenAttributionTransition } from "./agent-org-token-attribution-transition.js";
import { TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID } from "../token-usage-run-records-v1/token-usage-run-records-v1-app-data-migration.js";
import fs from "node:fs/promises";
import path from "node:path";
import type { AppConfig } from "../../../config/app-config.js";
import { appConfigProvider } from "../../../config/app-config-provider.js";
import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";
import { TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID } from "../team-run-execution-tree-v2-app-data-migration.js";
import { validateAgentOrgRunExecutionTreePayload } from "../../../run-history/store/agent-org-run-execution-tree-schema.js";
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

import { validateAgentOrgStatePackage } from "../../../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgContextFileLocatorTransition } from "./agent-org-context-file-locator-transition.js";

export const AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID = "20260901_agent_org_flat_team_families_v1";

type Disposition =
  | "SKIPPED_FLAT_TEAM_RUN_ZERO_WRITE" | "MIGRATED_ORG_RUN" | "CLEANED_CURRENT_ORG"
  | "MIGRATED_ORG_TOKENS" | "FAILED_TOKEN" | "MIGRATED_ORG_HISTORY" | "FAILED_RUNTIME" | "FAILED_HISTORY" | "FAILED_FAMILY_CONFLICT";
type Count = { count: number; examples: string[]; reasons: string[] };

const errorReason = (error: unknown): string => error instanceof Error ? error.message : String(error);
export class AgentOrgFlatTeamFamiliesV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID;
  readonly displayName = "Cut over flat Team and AgentOrg run families";
  readonly description = "Converts selected nested Team histories and exact token ownership while preserving native flat Teams.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [TEAM_RUN_EXECUTION_TREE_V2_MIGRATION_ID, TOKEN_USAGE_RUN_RECORDS_V1_MIGRATION_ID] as const;
  private counts = new Map<Disposition, Count>();
  private scanned = 0;
  private readonly layout: AgentMemoryLayout;
  private locatorTransition!: AgentOrgContextFileLocatorTransition;
  constructor(
    private readonly memoryDir: string,
    private readonly config: AppConfig = appConfigProvider.config,
    private readonly writer: AtomicRunPackageFileCommitWriter = getAtomicRunPackageFileCommitWriter(),
    private readonly tokens = new AgentOrgTokenAttributionTransition(memoryDir),
  ) { this.layout = new AgentMemoryLayout(memoryDir); }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.counts.clear(); this.scanned = 0;
    const planner = new AgentOrgHistoryCandidatePlanner(this.memoryDir);
    let selection;
    try { selection = await planner.plan(); }
    catch (error) {
      this.add("FAILED_HISTORY", this.memoryDir, errorReason(error));
      // An unreadable history index must not suppress independent current-Org SQL work.
      try {
        const result = await this.tokens.execute([], new Map());
        this.scanned += result.failures.size + result.changed.size;
        for (const [id, reason] of result.failures) this.add("FAILED_TOKEN", id, reason);
        for (const [id, count] of result.changed) if (count) this.add("MIGRATED_ORG_TOKENS", id, `${count} records corrected.`);
      } catch (tokenError) { this.add("FAILED_TOKEN", this.memoryDir, errorReason(tokenError)); }
      return this.result();
    }
    const { plans } = selection;
    const failures = new Map(planner.failures);
    this.scanned = plans.length + planner.flatRoots.size + failures.size;
    for (const id of planner.flatRoots) this.add("SKIPPED_FLAT_TEAM_RUN_ZERO_WRITE", id);
    for (const [id, reason] of failures) this.add(planner.collisions.has(id) ? "FAILED_FAMILY_CONFLICT" : "FAILED_RUNTIME", id, reason);
    this.locatorTransition = new AgentOrgContextFileLocatorTransition(this.memoryDir, this.writer, () => this.config.getBaseUrl());
    try { await this.locatorTransition.prepareAndCommit(plans); }
    catch (error) {
      for (const plan of plans) if (plan.kind !== "index-only") this.locatorTransition.failures.set(plan.id, errorReason(error));
    }
    for (const [id, reason] of this.locatorTransition.failures) {
      failures.set(id, reason); this.add("FAILED_RUNTIME", id, reason);
    }
    this.failDependencies(failures);
    for (const plan of plans) {
      if (failures.has(plan.id) || plan.kind === "index-only") continue;
      try {
        if (plan.kind === "source-root") await this.migrateRuntimeRoot(plan);
        else await this.validateCompleteOrgRunPackage(plan.source, plan);
      } catch (error) {
        failures.set(plan.id, errorReason(error)); this.add("FAILED_RUNTIME", plan.id, errorReason(error));
      }
    }
    this.failDependencies(failures);
    try {
      const tokenResult = await this.tokens.execute(plans, failures);
      this.scanned += tokenResult.failures.size + tokenResult.changed.size;
      for (const [id, reason] of tokenResult.failures) { failures.set(id, reason); this.add("FAILED_TOKEN", id, reason); }
      for (const [id, count] of tokenResult.changed) if (count) this.add("MIGRATED_ORG_TOKENS", id, `${count} records corrected without accounting changes.`);
    } catch (error) {
      this.add("FAILED_TOKEN", this.memoryDir, errorReason(error));
      // Discovery/SQL availability is required for every selected root, even absent usage.
      for (const plan of plans) failures.set(plan.id, errorReason(error));
    }
    this.failDependencies(failures);
    // All members of a dependency component must have durable target effects before
    // any last source marker can be retired (including cyclic references).
    const complete = plans.filter((plan) => !failures.has(plan.id));
    try {
      const count = await new AgentOrgHistoryIndexTransition(selection,
        new TeamRunHistoryIndexStore(this.memoryDir), new AgentOrgRunHistoryIndexStore(this.memoryDir)).commit(complete);
      if (count) this.add("MIGRATED_ORG_HISTORY", selection.teamSnapshot.sourcePath);
    } catch (error) { this.add("FAILED_HISTORY", this.memoryDir, errorReason(error)); return this.result(); }
    for (const plan of complete) {
      if (plan.kind === "index-only") continue;
      const target = this.layout.getOrgDirPath(plan.id);
      try {
        const retired = plan.kind === "partial-target" ? plan.retiredFiles : retiredTeamFiles(target);
        for (const file of retired) await fs.rm(file, { force: true });
        if ((await Promise.all(retired.map(migrationPathExists))).some(Boolean)) throw new Error("Retired Team authorities cleanup failed.");
        this.add(plan.kind === "source-root" ? "MIGRATED_ORG_RUN" : "CLEANED_CURRENT_ORG", target);
      } catch (error) { this.add("FAILED_RUNTIME", target, errorReason(error)); }
    }
    return this.result();
  }

  private failDependencies(failures: Map<string, string>): void {
    let changed = true;
    while (changed) {
      changed = false;
      for (const [id, dependencies] of this.locatorTransition.dependencies) {
        if (failures.has(id)) continue;
        const failed = [...dependencies].find((dependency) => failures.has(dependency));
        if (failed) {
          const reason = `Referenced candidate '${failed}' has incomplete target effects.`;
          failures.set(id, reason); this.add("FAILED_RUNTIME", id, reason); changed = true;
        }
      }
    }
  }

  private async migrateRuntimeRoot(plan: HistoryCandidatePlan): Promise<void> {
    const source = plan.source, id = plan.id, targetDir = this.layout.getOrgDirPath(id);
    if (await migrationPathExists(targetDir)) throw new Error("AgentOrg run destination already exists.");
    const teamTasks = validateTaskDelegationRecordsV1Payload(
      JSON.parse(await fs.readFile(getTaskDelegationRecordsV1Path(source), "utf8")), id);
    const teamMessages = validateTeamCommunicationMessagesV1Payload(
      JSON.parse(await fs.readFile(getTeamCommunicationMessagesV1Path(source), "utf8")), id);
    const orgTasks = validateAgentOrgTaskDelegationRecordsV1({
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: id, records: teamTasks.records,
    }, id);
    const orgMessages = validateAgentOrgCommunicationMessagesV1({
      schemaVersion: 1, subjectKind: "agent_org", orgRunId: id, messages: teamMessages.messages,
    }, id);
    await this.writeJson(getAgentOrgRunExecutionTreePath(source), plan.index.tree, "execution_tree");
    await this.writeJson(getAgentOrgTaskDelegationRecordsV1Path(source), orgTasks, "org_task_records");
    await this.writeJson(getAgentOrgCommunicationMessagesV1Path(source), orgMessages, "org_communication_messages");
    await this.validateCompleteOrgRunPackage(source, plan);
    await fs.mkdir(this.layout.getOrgRootDirPath(), { recursive: true });
    await fs.rename(source, targetDir);
    await this.validateCompleteOrgRunPackage(targetDir, plan);
  }
  private async validateCompleteOrgRunPackage(dir: string, plan: HistoryCandidatePlan): Promise<void> {
    const orgRunId = plan.id;
    await this.locatorTransition.validateRoot(dir, orgRunId);
    const executionTree = validateAgentOrgRunExecutionTreePayload(
      JSON.parse(await fs.readFile(getAgentOrgRunExecutionTreePath(dir), "utf8")),
      orgRunId,
    );
    if (!isDeepStrictEqual(executionTree, plan.index.tree)) throw new Error("Target execution tree differs from selected ownership metadata.");
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
    current.examples.push(path.isAbsolute(example) ? path.relative(this.memoryDir, example).split(path.sep).join("/") : example);
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
