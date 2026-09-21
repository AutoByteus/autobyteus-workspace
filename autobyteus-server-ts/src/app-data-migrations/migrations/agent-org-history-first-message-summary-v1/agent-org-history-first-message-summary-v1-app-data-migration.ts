import { AgentMemoryLayout } from "../../../agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../agent-org-execution/services/agent-org-execution-index.js";
import { validateAgentOrgStatePackage } from "../../../agent-org-execution/services/agent-org-state-package-validator.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../../agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import type { AppDataMigrationDefinition, AppDataMigrationExecutionResult, AppDataMigrationItemDetail } from "../../domain/app-data-migration-types.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../raw-trace-active-file-name-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../raw-trace-rotation-layout-migration.js";
import { AgentOrgRunExecutionTreeStore } from "../../../run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../run-history/store/agent-org-run-history-index-store.js";
import type { AgentOrgRunIndexRowRecord } from "../../../run-history/store/agent-org-run-history-index-record-types.js";
import { AgentOrgRunPackageCatalog } from "../../../run-history/services/agent-org-run-package-catalog.js";
import { projectAgentOrgRunHistoryRow } from "../../../run-history/services/agent-org-run-history-row-projector.js";
import { AgentOrgRunHistorySummaryWriter } from "../../../run-history/services/agent-org-run-history-summary-writer.js";
import {
  classifyAgentOrgFirstExternalMessage,
  type AgentOrgConfiguredTraceCorpus,
} from "./agent-org-history-first-message-summary-classifier.js";
import {
  buildAgentOrgInternalDeliveryEvidence,
  readStrictCurrentRawTraceCorpus,
} from "./agent-org-history-first-message-summary-evidence-reader.js";

export const AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID =
  "20260905_agent_org_history_first_message_summary_v1";

type Disposition =
  | "BACKFILLED_AGENT_ORG_HISTORY_SUMMARY"
  | "SKIPPED_EXISTING_AGENT_ORG_HISTORY_SUMMARY"
  | "SKIPPED_NO_UNIQUE_QUALIFYING_TRACE"
  | "FAILED_CURRENT_VALIDATION"
  | "FAILED_AGENT_ORG_HISTORY_SUMMARY_WRITE";
type Count = { count: number; examples: string[]; reasons: string[] };

type MigrationDependencies = Readonly<{
  packages: Pick<AgentOrgRunPackageCatalog, "rebuild" | "listAdmitted" | "listDiagnostics">;
  index: Pick<AgentOrgRunHistoryIndexStore, "readIndex" | "writeIndex">;
  trees: Pick<AgentOrgRunExecutionTreeStore, "read">;
  tasks: Pick<AgentOrgTaskDelegationRecordsV1Store, "read">;
  messages: Pick<AgentOrgCommunicationMessagesV1Store, "read">;
  summaryWriter: AgentOrgRunHistorySummaryWriter;
  readCorpus(runDir: string): Promise<readonly Record<string, unknown>[]>;
}>;

export class AgentOrgHistoryFirstMessageSummaryV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID;
  readonly displayName = "AgentOrg first-message history summaries";
  readonly description = "Conservatively derives missing AgentOrg history summaries from strict configured-member provenance.";
  readonly requiredOnStartup = true;
  readonly executionPolicy = "STARTUP_ONLY" as const;
  readonly prerequisiteMigrationIds = [
    AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
    RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID,
    RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID,
  ] as const;

  private readonly layout: AgentMemoryLayout;
  private readonly dependencies: MigrationDependencies;
  private counts = new Map<Disposition, Count>();
  private scanned = 0;

  constructor(memoryDir: string, dependencies: Partial<MigrationDependencies> = {}) {
    this.layout = new AgentMemoryLayout(memoryDir);
    const index = dependencies.index ?? new AgentOrgRunHistoryIndexStore(memoryDir);
    this.dependencies = {
      packages: dependencies.packages ?? new AgentOrgRunPackageCatalog(memoryDir),
      index,
      trees: dependencies.trees ?? new AgentOrgRunExecutionTreeStore(),
      tasks: dependencies.tasks ?? new AgentOrgTaskDelegationRecordsV1Store(),
      messages: dependencies.messages ?? new AgentOrgCommunicationMessagesV1Store(),
      summaryWriter: dependencies.summaryWriter ?? new AgentOrgRunHistorySummaryWriter(index),
      readCorpus: dependencies.readCorpus ?? readStrictCurrentRawTraceCorpus,
    };
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    this.counts.clear();
    this.scanned = 0;
    let rows: readonly AgentOrgRunIndexRowRecord[];
    let packages: Array<Awaited<ReturnType<typeof this.readPackage>>>;
    try {
      await this.dependencies.packages.rebuild();
      const diagnostics = this.dependencies.packages.listDiagnostics();
      if (diagnostics.length) {
        diagnostics.forEach((item) => this.add("FAILED_CURRENT_VALIDATION", item.orgRunId, item.reason));
        return this.result();
      }
      const persisted = new Map((await this.dependencies.index.readIndex()).map((row) => [row.orgRunId, row]));
      packages = [];
      const projected: AgentOrgRunIndexRowRecord[] = [];
      for (const orgRunId of [...this.dependencies.packages.listAdmitted()].sort()) {
        const current = await this.readPackage(orgRunId);
        packages.push(current);
        projected.push(projectAgentOrgRunHistoryRow(current.tree, persisted.get(orgRunId)));
      }
      rows = Object.freeze(projected);
    } catch (cause) {
      this.add("FAILED_CURRENT_VALIDATION", "agent_orgs", errorMessage(cause));
      return this.result();
    }

    for (const current of packages) {
      this.scanned += 1;
      const row = rows.find((candidate) => candidate.orgRunId === current.orgRunId);
      if (!row) {
        this.add("FAILED_CURRENT_VALIDATION", current.orgRunId, "CURRENT_HISTORY_ROW_MISSING");
        continue;
      }
      if (row.summary.trim()) {
        this.add("SKIPPED_EXISTING_AGENT_ORG_HISTORY_SUMMARY", current.orgRunId);
        continue;
      }
      let classification: ReturnType<typeof classifyAgentOrgFirstExternalMessage>;
      try {
        classification = classifyAgentOrgFirstExternalMessage({
          corpora: await this.readConfiguredCorpora(current.index),
          exclusions: buildAgentOrgInternalDeliveryEvidence(current),
        });
      } catch (cause) {
        this.add("SKIPPED_NO_UNIQUE_QUALIFYING_TRACE", current.orgRunId, safeReason(cause));
        continue;
      }
      if (classification.kind === "ambiguous") {
        this.add("SKIPPED_NO_UNIQUE_QUALIFYING_TRACE", current.orgRunId, classification.reason);
        continue;
      }
      try {
        const committed = await this.dependencies.summaryWriter.commitFirstNonEmpty({
          rows,
          orgRunId: current.orgRunId,
          summary: classification.content,
        });
        if (committed.disposition !== "WRITTEN") {
          throw new Error(`Unexpected summary writer disposition '${committed.disposition}'.`);
        }
        rows = committed.rows;
        this.add("BACKFILLED_AGENT_ORG_HISTORY_SUMMARY", current.orgRunId);
      } catch (cause) {
        this.add("FAILED_AGENT_ORG_HISTORY_SUMMARY_WRITE", current.orgRunId, safeReason(cause));
        break;
      }
    }
    return this.result();
  }

  private async readPackage(orgRunId: string) {
    const orgDir = this.layout.getOrgDirPath(orgRunId);
    const [tree, taskRecords, communicationMessages] = await Promise.all([
      this.dependencies.trees.read(orgDir, orgRunId),
      this.dependencies.tasks.read(orgDir, orgRunId),
      this.dependencies.messages.read(orgDir, orgRunId),
    ]);
    if (!tree || !taskRecords || !communicationMessages) {
      throw new Error(`AgentOrg '${orgRunId}' is missing a required current authority.`);
    }
    const validated = validateAgentOrgStatePackage({ executionTree: tree, taskRecords, communicationMessages });
    return Object.freeze({ orgRunId, tree, taskRecords, communicationMessages, index: validated.index });
  }

  private async readConfiguredCorpora(index: AgentOrgExecutionIndex): Promise<readonly AgentOrgConfiguredTraceCorpus[]> {
    const result: AgentOrgConfiguredTraceCorpus[] = [];
    for (const agent of index.listAgents().filter((candidate) => candidate.executionKind === "configured")
      .sort((left, right) => left.agentRunId.localeCompare(right.agentRunId))) {
      const runDir = this.layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(agent.agentRunId), agent.agentRunId);
      result.push(Object.freeze({ agentRunId: agent.agentRunId, records: await this.dependencies.readCorpus(runDir) }));
    }
    return Object.freeze(result);
  }

  private add(disposition: Disposition, example: string, reason?: string): void {
    const current = this.counts.get(disposition) ?? { count: 0, examples: [], reasons: [] };
    current.count += 1;
    current.examples.push(example);
    if (reason) current.reasons.push(reason);
    current.examples.sort(); current.examples.splice(5);
    current.reasons.sort(); current.reasons.splice(5);
    this.counts.set(disposition, current);
  }

  private result(): AppDataMigrationExecutionResult {
    let migratedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;
    let warning = false;
    const details: AppDataMigrationItemDetail[] = [];
    for (const [disposition, count] of [...this.counts].sort(([left], [right]) => left.localeCompare(right))) {
      const failed = disposition.startsWith("FAILED_");
      const skipped = disposition.startsWith("SKIPPED_");
      if (failed) failedCount += count.count;
      else if (skipped) skippedCount += count.count;
      else migratedCount += count.count;
      if (disposition === "SKIPPED_NO_UNIQUE_QUALIFYING_TRACE") warning = true;
      details.push({
        itemId: disposition,
        status: failed ? "FAILED" : skipped ? "SKIPPED" : "MIGRATED",
        message: `Count: ${count.count}.${count.examples.length ? ` Examples: ${count.examples.join(", ")}.` : ""}${count.reasons.length ? ` Reasons: ${count.reasons.join(" | ")}.` : ""}`,
      });
    }
    const status = failedCount ? "FAILED" : warning ? "SUCCEEDED_WITH_WARNINGS" : "SUCCEEDED";
    return {
      status,
      summary: { scannedCount: this.scanned, migratedCount, skippedCount, failedCount, details },
      errorMessage: failedCount ? `${failedCount} AgentOrg history summary item(s) require correction and restart.` : null,
    };
  }
}

const errorMessage = (cause: unknown): string => cause instanceof Error ? cause.message : String(cause);
const safeReason = (cause: unknown): string => {
  const value = errorMessage(cause);
  if (value.includes("timestamp")) return "INVALID_SIDECAR_TIMESTAMP";
  if (value.includes("manifest")) return "INVALID_TRACE_MANIFEST";
  if (value.includes("JSON")) return "INVALID_TRACE_CORPUS";
  return "UNREADABLE_REQUIRED_EVIDENCE";
};
