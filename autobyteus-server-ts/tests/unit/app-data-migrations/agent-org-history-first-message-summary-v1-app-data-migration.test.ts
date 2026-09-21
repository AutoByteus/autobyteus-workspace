import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "autobyteus-ts/memory/store/memory-file-names.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { AgentOrgExecutionIndex } from "../../../src/agent-org-execution/services/agent-org-execution-index.js";
import { AgentOrgCommunicationMessagesV1Store } from "../../../src/agent-org-execution/persistence/agent-org-communication-messages-v1-store.js";
import { AgentOrgTaskDelegationRecordsV1Store } from "../../../src/agent-org-execution/persistence/agent-org-task-delegation-records-v1-store.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/agent-org-flat-team-families-v1/agent-org-flat-team-families-v1-app-data-migration.js";
import {
  AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID,
  AgentOrgHistoryFirstMessageSummaryV1AppDataMigration,
} from "../../../src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-v1-app-data-migration.js";
import { classifyAgentOrgFirstExternalMessage } from "../../../src/app-data-migrations/migrations/agent-org-history-first-message-summary-v1/agent-org-history-first-message-summary-classifier.js";
import { RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name-migration.js";
import { RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.js";
import { AgentOrgRunExecutionTreeStore } from "../../../src/run-history/store/agent-org-run-execution-tree-store.js";
import { AgentOrgRunHistoryIndexStore } from "../../../src/run-history/store/agent-org-run-history-index-store.js";
import { AgentOrgRunHistorySummaryWriter } from "../../../src/run-history/services/agent-org-run-history-summary-writer.js";
import { resetRootRunPackageReadinessIndex } from "../../../src/run-history/services/root-run-package-readiness-index.js";
import { testAgentOrgExecutionTree, testOrgAgentNode, testOrgTeamNode } from "../../fixtures/current-agent-org-run-fixtures.js";

const roots: string[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  for (const root of roots.splice(0)) {
    resetRootRunPackageReadinessIndex(root);
    await fs.rm(root, { recursive: true, force: true });
  }
});

const createPackage = async (options: { summary?: string; tie?: boolean; taskEvidence?: boolean } = {}) => {
  const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "org-summary-migration-"));
  roots.push(memoryDir);
  const orgRunId = "org-run";
  const direct = testOrgAgentNode("/director", "direct-run");
  const lead = testOrgAgentNode("/team/lead", "lead-run");
  const worker = testOrgAgentNode("/team/worker", "worker-run");
  const team = testOrgTeamNode({
    address: "/team", teamRunId: "team-run", coordinatorAddress: lead.address, members: [lead, worker],
  });
  const base = testAgentOrgExecutionTree({ orgRunId, members: [direct, team] });
  const taskExecution = {
    address: worker.address,
    agentRunId: "worker-task-run",
    platformAgentRunId: null,
    startedAt: "1970-01-01T00:00:40.000Z",
    settledAt: null,
  } as const;
  const tree = options.taskEvidence
    ? { ...base, rootOrg: { ...base.rootOrg, taskExecutions: [taskExecution] } }
    : base;
  const layout = new AgentMemoryLayout(memoryDir);
  const orgDir = layout.getOrgDirPath(orgRunId);
  await fs.mkdir(orgDir, { recursive: true });
  await Promise.all([
    new AgentOrgRunExecutionTreeStore().write(orgDir, tree),
    new AgentOrgTaskDelegationRecordsV1Store().write(orgDir, {
      schemaVersion: 1,
      subjectKind: "agent_org",
      orgRunId,
      records: options.taskEvidence ? [{
        taskId: "task-1",
        delegatorAgentRunId: worker.agentRunId,
        recipientAddress: worker.address,
        taskExecution: { agentRunId: taskExecution.agentRunId },
        description: "Task",
        referenceFiles: [],
        status: "awaiting_review",
        updates: [{
          submissionId: "submission-1",
          message: "Task response",
          referenceFiles: [],
          createdAt: "1970-01-01T00:00:50.000Z",
        }],
        createdAt: taskExecution.startedAt,
      }] : [],
    }),
    new AgentOrgCommunicationMessagesV1Store().write(orgDir, { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: [] }),
  ]);
  const indexStore = new AgentOrgRunHistoryIndexStore(memoryDir);
  await indexStore.writeIndex([{
    orgRunId,
    orgDefinitionId: tree.rootOrg.orgDefinitionId,
    orgDefinitionName: tree.rootOrg.orgDefinitionName,
    workspaceRootPath: tree.rootOrg.defaultLaunchConfiguration.workspaceRootPath,
    summary: options.summary ?? "",
    createdAt: tree.createdAt,
    archivedAt: tree.archivedAt,
    terminatedAt: null,
  }]);
  if (!options.summary) {
    const index = new AgentOrgExecutionIndex(tree);
    const writeTrace = async (agentRunId: string, content: string, ts: number) => {
      const agentDir = layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent(agentRunId), agentRunId);
      await fs.mkdir(agentDir, { recursive: true });
      await fs.writeFile(path.join(agentDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME), `${JSON.stringify({
        id: `trace-${agentRunId}`, trace_type: "user", source_event: "AgentRun.postUserMessage", content, ts,
      })}\n`);
    };
    await writeTrace(direct.agentRunId, "Later direct prompt", 200);
    await writeTrace(worker.agentRunId, "Mounted Team first prompt", options.tie ? 200 : 100);
    await writeTrace(lead.agentRunId, "Latest coordinator prompt", 300);
  }
  return { memoryDir, orgRunId, indexStore, tree };
};

describe("AgentOrg first-message summary startup migration", () => {
  it("is registered after every exact prerequisite as required startup-only", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const index = definitions.findIndex((item) => item.id === AGENT_ORG_HISTORY_FIRST_MESSAGE_SUMMARY_V1_MIGRATION_ID);
    const definition = definitions[index]!;
    expect(index).toBeGreaterThan(definitions.findIndex((item) => item.id === RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID));
    expect(definition).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
    expect(definition.prerequisiteMigrationIds).toEqual([
      AGENT_ORG_FLAT_TEAM_FAMILIES_V1_MIGRATION_ID,
      RAW_TRACE_ROTATION_LAYOUT_MIGRATION_ID,
      RAW_TRACE_ACTIVE_FILE_NAME_MIGRATION_ID,
    ]);
  });

  it("backfills the uniquely earliest configured mounted-Team prompt and is restart-idempotent", async () => {
    const test = await createPackage();
    const first = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(first.status).toBe("SUCCEEDED");
    expect(first.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("Mounted Team first prompt");

    const restarted = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(restarted.status).toBe("SUCCEEDED");
    expect(restarted.summary).toMatchObject({ migratedCount: 0, skippedCount: 1, failedCount: 0 });
  });

  it("restarts successfully after an interrupted attempt durably committed the selected summary", async () => {
    const test = await createPackage();
    const writer = new AgentOrgRunHistorySummaryWriter(test.indexStore);
    const interrupted = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir, {
      summaryWriter: {
        commitFirstNonEmpty: vi.fn(async (input) => {
          await writer.commitFirstNonEmpty(input);
          throw new Error("ordinary process interruption after durable write");
        }),
      } as never,
    }).execute();

    expect(interrupted.status).toBe("FAILED");
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("Mounted Team first prompt");

    resetRootRunPackageReadinessIndex(test.memoryDir);
    const restarted = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(restarted.status).toBe("SUCCEEDED");
    expect(restarted.summary).toMatchObject({ migratedCount: 0, skippedCount: 1, failedCount: 0 });
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("Mounted Team first prompt");
  });

  it("does not read traces or overwrite a current non-empty summary", async () => {
    const test = await createPackage({ summary: "Preserved current title" });
    const readCorpus = vi.fn(async () => { throw new Error("must not read"); });
    const result = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir, { readCorpus }).execute();
    expect(result.status).toBe("SUCCEEDED");
    expect(readCorpus).not.toHaveBeenCalled();
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("Preserved current title");
  });

  it("reports valid ambiguous evidence as warnings without selecting a tie", async () => {
    const test = await createPackage({ tie: true });
    const result = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary).toMatchObject({ migratedCount: 0, skippedCount: 1, failedCount: 0 });
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("");
  });

  it("uses current Org communication sidecars only as negative provenance evidence", async () => {
    const test = await createPackage();
    const layout = new AgentMemoryLayout(test.memoryDir);
    await new AgentOrgCommunicationMessagesV1Store().write(layout.getOrgDirPath(test.orgRunId), {
      schemaVersion: 1,
      subjectKind: "agent_org",
      orgRunId: test.orgRunId,
      messages: [{
        messageId: "internal-message",
        senderAgentRunId: "direct-run",
        receiverAgentRunId: "worker-run",
        content: "Internal delivery",
        messageType: "agent_message",
        referenceFiles: [],
        createdAt: "1970-01-01T00:00:50.000Z",
      }],
    });
    const result = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("");
  });

  it("uses current Org task submission sidecars only as negative provenance evidence", async () => {
    const test = await createPackage({ taskEvidence: true });
    const result = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("");
  });

  it("reads a strictly valid complete archive plus active corpus in chronological classification", async () => {
    const test = await createPackage();
    const layout = new AgentMemoryLayout(test.memoryDir);
    const index = new AgentOrgExecutionIndex(test.tree);
    const workerRunDir = layout.getRootedAgentRunDirPath(index.getPhysicalScopeForAgent("worker-run"), "worker-run");
    const archived = {
      id: "trace-worker-archived",
      trace_type: "user",
      source_event: "AgentRun.postUserMessage",
      content: "Archived earliest prompt",
      ts: 50,
    };
    await fs.writeFile(path.join(workerRunDir, "raw_traces_000001.jsonl"), `${JSON.stringify(archived)}\n`);
    await fs.writeFile(path.join(workerRunDir, "raw_traces_manifest.json"), JSON.stringify({
      schema_version: 1,
      next_segment_index: 2,
      segments: [{
        index: 1,
        file_name: "raw_traces_000001.jsonl",
        boundary_type: "native_compaction",
        boundary_key: "test-boundary",
        boundary_trace_id: null,
        runtime_kind: null,
        source_event: null,
        archived_at: 75,
        first_trace_id: archived.id,
        last_trace_id: archived.id,
        first_ts: archived.ts,
        last_ts: archived.ts,
        record_count: 1,
        status: "complete",
      }],
    }));

    const result = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir).execute();
    expect(result.status).toBe("SUCCEEDED");
    expect((await test.indexStore.readIndex())[0]?.summary).toBe("Archived earliest prompt");
  });

  it("gives required current validation and selected-write failures FAILED precedence", async () => {
    const test = await createPackage();
    const invalid = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir, {
      packages: {
        rebuild: async () => undefined,
        listAdmitted: () => [],
        listDiagnostics: () => [{ orgRunId: "bad", path: "/bad", reason: "invalid current package" }],
      },
    }).execute();
    expect(invalid.status).toBe("FAILED");

    resetRootRunPackageReadinessIndex(test.memoryDir);
    const writeFailed = await new AgentOrgHistoryFirstMessageSummaryV1AppDataMigration(test.memoryDir, {
      summaryWriter: { commitFirstNonEmpty: vi.fn(async () => { throw new Error("write failed"); }) } as never,
    }).execute();
    expect(writeFailed.status).toBe("FAILED");
    expect(writeFailed.summary.failedCount).toBe(1);
  });
});

describe("AgentOrg history summary provenance classifier", () => {
  const trace = (content: string, ts: number) => ({ trace_type: "user", source_event: "AgentRun.postUserMessage", content, ts });

  it("never promotes a later trace when the earliest is internal or chronology is contradictory", () => {
    expect(classifyAgentOrgFirstExternalMessage({
      corpora: [{ agentRunId: "agent-a", records: [trace("internal envelope", 10), trace("later external", 20)] }],
      exclusions: [{ receiverAgentRunId: "agent-a", timestamp: 10, envelopeContent: "internal envelope" }],
    })).toMatchObject({ kind: "ambiguous" });
  });

  it("rejects invalid configured user evidence rather than guessing", () => {
    expect(classifyAgentOrgFirstExternalMessage({
      corpora: [{ agentRunId: "agent-a", records: [{ trace_type: "user", content: "missing source", ts: 1 }] }],
      exclusions: [],
    })).toEqual({ kind: "ambiguous", reason: "INVALID_CONFIGURED_USER_TRACE" });
  });
});
