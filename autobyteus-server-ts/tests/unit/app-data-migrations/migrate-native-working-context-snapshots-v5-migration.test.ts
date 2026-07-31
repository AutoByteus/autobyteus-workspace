import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { Message, MessageRole } from "autobyteus-ts/llm/utils/messages.js";
import { RawTraceItem } from "autobyteus-ts/memory/models/raw-trace-item.js";
import { MemoryManager } from "autobyteus-ts/memory/memory-manager.js";
import { WorkingContextSnapshotBootstrapper } from "autobyteus-ts/memory/restore/working-context-snapshot-bootstrapper.js";
import { FileMemoryStore } from "autobyteus-ts/memory/store/file-store.js";
import { FileCompactionLineageStore } from "autobyteus-ts/memory/store/file-compaction-lineage-store.js";
import {
  COMPACTION_LINEAGE_FILE_NAME,
  RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
  WORKING_CONTEXT_SNAPSHOT_FILE_NAME,
} from "autobyteus-ts/memory/store/memory-file-names.js";
import { createNaturalUserMessageProvenance, WorkingContextFinalizer } from "autobyteus-ts/memory/working-context-finalizer.js";
import { WorkingContextSnapshotSerializer } from "autobyteus-ts/memory/working-context-snapshot-serializer.js";
import { WorkingContextSnapshotStore } from "autobyteus-ts/memory/store/working-context-snapshot-store.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import {
  MigrateNativeWorkingContextSnapshotsV5Migration,
} from "../../../src/app-data-migrations/migrations/migrate-native-working-context-snapshots-v5-migration.js";
import { RawTraceActiveFileNameMigration } from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name-migration.js";
import { OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME } from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name-migration-files.js";
import { RawTraceRotationLayoutMigration } from "../../../src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.js";
import { RemoveExternalRuntimeWorkingContextSnapshotsMigration } from "../../../src/app-data-migrations/migrations/remove-external-runtime-working-context-snapshots-migration.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const obsoleteFiles = ["episodic.jsonl", "semantic.jsonl", "compacted_memory_manifest.json"];
let memoryDir: string;

const writeText = async (filePath: string, content: string | Uint8Array): Promise<void> => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content);
};
const writeJson = (filePath: string, value: unknown): Promise<void> =>
  writeText(filePath, `${JSON.stringify(value, null, 2)}\n`);
const exists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};
const standaloneDir = (runId: string): string => path.join(memoryDir, "agents", runId);
const snapshotPath = (runDir: string): string => path.join(runDir, WORKING_CONTEXT_SNAPSHOT_FILE_NAME);
const lineagePath = (runDir: string): string => path.join(runDir, COMPACTION_LINEAGE_FILE_NAME);

const writeStandaloneMetadata = async (runId: string, runtimeKind = RuntimeKind.AUTOBYTEUS): Promise<void> => {
  const runDir = standaloneDir(runId);
  await writeJson(path.join(runDir, "run_metadata.json"), {
    runId,
    agentDefinitionId: `agent-${runId}`,
    workspaceRootPath: `/workspace/${runId}`,
    memoryDir: runDir,
    llmModelIdentifier: "model-test",
    llmConfig: null,
    autoExecuteTools: false,
    skillAccessMode: SkillAccessMode.NONE,
    runtimeKind,
    platformAgentRunId: null,
    startedAt: "2026-07-31T00:00:00.000Z",
  });
};

const writeTeamMetadata = async (teamRunId: string, memberRunId: string): Promise<string> => {
  const teamDir = path.join(memoryDir, "agent_teams", teamRunId);
  await writeJson(path.join(teamDir, "team_run_metadata.json"), {
    teamRunId,
    teamDefinitionId: `team-def-${teamRunId}`,
    teamDefinitionName: "Native Migration Team",
    coordinatorMemberRouteKey: "lead",
    createdAt: "2026-07-31T00:00:00.000Z",
    archivedAt: null,
    memberTree: [{
      memberKind: "agent",
      memberRouteKey: "lead",
      memberPath: ["lead"],
      memberName: "Lead",
      memberRunId,
      runtimeKind: RuntimeKind.AUTOBYTEUS,
      platformAgentRunId: null,
      agentDefinitionId: `agent-${memberRunId}`,
      llmModelIdentifier: "model-test",
      autoExecuteTools: false,
      skillAccessMode: SkillAccessMode.NONE,
      llmConfig: null,
      workspaceRootPath: "/workspace/team",
      applicationExecutionContext: null,
      role: null,
      description: null,
    }],
  });
  return path.join(teamDir, memberRunId);
};

const rawTrace = (id: string, content: string, turnId = "turn-1"): RawTraceItem =>
  new RawTraceItem({
    id,
    ts: 1,
    turnId,
    seq: 1,
    traceType: "user",
    content,
    sourceEvent: "UserMessageReceivedEvent",
  });

const writeActiveRaw = async (
  runDir: string,
  trace: RawTraceItem,
  fileName = RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
): Promise<Buffer> => {
  const bytes = Buffer.from(`${JSON.stringify(trace.toDict())}\n`);
  await writeText(path.join(runDir, fileName), bytes);
  return bytes;
};

const userSnapshot = (agentId: string, schemaVersion: number, rawId: string, content: string) => ({
  schema_version: schemaVersion,
  agent_id: agentId,
  messages: [{
    role: MessageRole.USER,
    content,
    metadata: {
      autobyteus_memory_provenance: {
        kind: "single",
        rawTraceIds: [rawId],
        turnId: "turn-1",
      },
    },
  }],
});

const strictV5 = (agentId: string, rawId: string, content: string) => {
  const workingContext = new WorkingContextFinalizer().finalize({
    messages: [createNaturalUserMessageProvenance(
      new Message(MessageRole.USER, { content }),
      { kind: "retained_user", rawTraceIds: [rawId], turnId: "turn-1" },
    )],
  });
  return WorkingContextSnapshotSerializer.serialize(workingContext, { agent_id: agentId });
};

const seedObsolete = async (runDir: string): Promise<Record<string, Buffer>> => {
  const result: Record<string, Buffer> = {};
  for (const fileName of obsoleteFiles) {
    const bytes = Buffer.from(`obsolete:${fileName}\n`);
    result[fileName] = bytes;
    await writeText(path.join(runDir, fileName), bytes);
  }
  return result;
};

class InMemoryMigrationRepository implements AppDataMigrationRecordRepositoryLike {
  readonly records = new Map<string, AppDataMigrationRecordSnapshot>();
  async getRecord(migrationId: string) { return this.records.get(migrationId) ?? null; }
  async listRecords() { return [...this.records.values()]; }
  async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: "RUNNING",
      attempts: (previous?.attempts ?? 0) + 1,
      startedAt: input.startedAt,
      completedAt: null,
      summaryJson: null,
      errorMessage: null,
      logPath: null,
    };
    this.records.set(input.migrationId, record);
    return record;
  }
  async complete(input: {
    migrationId: string;
    displayName: string;
    status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS";
    completedAt: Date;
    summaryJson: string;
    errorMessage: string | null;
    logPath: string | null;
  }) {
    const previous = this.records.get(input.migrationId);
    const record: AppDataMigrationRecordSnapshot = {
      migrationId: input.migrationId,
      displayName: input.displayName,
      status: input.status,
      attempts: previous?.attempts ?? 1,
      startedAt: previous?.startedAt ?? null,
      completedAt: input.completedAt,
      summaryJson: input.summaryJson,
      errorMessage: input.errorMessage,
      logPath: input.logPath,
    };
    this.records.set(input.migrationId, record);
    return record;
  }
  async markFailed(input: {
    migrationId: string;
    displayName: string;
    completedAt: Date;
    summaryJson: string;
    errorMessage: string;
    logPath: string | null;
  }) {
    return this.complete({ ...input, status: "FAILED" });
  }
}

beforeEach(async () => {
  memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "native-snapshot-v5-migration-"));
});

afterEach(async () => {
  await fs.rm(memoryDir, { recursive: true, force: true });
});

describe("MigrateNativeWorkingContextSnapshotsV5Migration", () => {
  it.each(["absent", "zero-byte"] as const)(
    "converts standalone v4 with %s lineage, exact active provenance, exact cleanup, and idempotence",
    async (lineageState) => {
      const runId = `standalone-v4-${lineageState}`;
      const runDir = standaloneDir(runId);
      await writeStandaloneMetadata(runId);
      const rawBefore = await writeActiveRaw(runDir, rawTrace("raw-1", "Retain standalone context"));
      await writeJson(snapshotPath(runDir), userSnapshot(runId, 4, "raw-1", "Retain standalone context"));
      if (lineageState === "zero-byte") await writeText(lineagePath(runDir), Buffer.alloc(0));
      await seedObsolete(runDir);
      const rawManifest = Buffer.from("raw manifest remains\n");
      await writeText(path.join(runDir, "raw_traces_manifest.json"), rawManifest);

      const first = await new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir).execute();

      expect(first.status).toBe("SUCCEEDED");
      expect(first.summary).toMatchObject({ migratedCount: 1, failedCount: 0 });
      const migrated = JSON.parse(await fs.readFile(snapshotPath(runDir), "utf-8"));
      expect(WorkingContextSnapshotSerializer.validate(migrated)).toBe(true);
      expect(migrated).toMatchObject({ schema_version: 5, agent_id: runId });
      expect(migrated.messages).toMatchObject([{ role: "user", content: "Retain standalone context" }]);
      expect(await fs.readFile(path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toEqual(rawBefore);
      expect(await fs.readFile(path.join(runDir, "raw_traces_manifest.json"))).toEqual(rawManifest);
      if (lineageState === "zero-byte") {
        expect(await fs.readFile(lineagePath(runDir))).toEqual(Buffer.alloc(0));
      } else {
        expect(await exists(lineagePath(runDir))).toBe(false);
      }
      for (const fileName of obsoleteFiles) expect(await exists(path.join(runDir, fileName))).toBe(false);

      const snapshotAfterFirst = await fs.readFile(snapshotPath(runDir));
      const second = await new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir).execute();
      expect(second).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, failedCount: 0 } });
      expect(await fs.readFile(snapshotPath(runDir))).toEqual(snapshotAfterFirst);
    },
  );

  it("uses memberRunId as team snapshot identity and publishes an empty strict v5 with warnings when nothing survives", async () => {
    const memberRunId = "member-native-v1";
    const runDir = await writeTeamMetadata("team-native", memberRunId);
    await writeJson(snapshotPath(runDir), {
      schema_version: 1,
      agent_id: memberRunId,
      messages: [{ role: "user", content: "Unsourced historical text" }],
      epoch_id: 9,
    });
    await seedObsolete(runDir);

    const result = await new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({
        itemId: `agent_teams/team-native/${memberRunId}`,
        status: "MIGRATED",
        message: expect.stringContaining("unsourced_message"),
      }),
    ]));
    const migrated = JSON.parse(await fs.readFile(snapshotPath(runDir), "utf-8"));
    expect(migrated).toEqual({ schema_version: 5, agent_id: memberRunId, messages: [] });
    expect(WorkingContextSnapshotSerializer.validate(migrated)).toBe(true);
  });

  it("skips any nonempty-lineage location before snapshot inspection or cleanup", async () => {
    const runId = "lineage-outside-transition";
    const runDir = standaloneDir(runId);
    await writeStandaloneMetadata(runId);
    const invalidSnapshot = Buffer.from("{not-json\n");
    await writeText(snapshotPath(runDir), invalidSnapshot);
    const obsoleteBefore = await seedObsolete(runDir);
    const lineageBefore = Buffer.from("not-even-parsed-lineage\n");
    await writeText(lineagePath(runDir), lineageBefore);

    const result = await new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir).execute();

    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 0, skippedCount: 1 } });
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: `agents/${runId}`, status: "SKIPPED", message: expect.stringContaining("Nonempty") }),
    ]));
    expect(await fs.readFile(snapshotPath(runDir))).toEqual(invalidSnapshot);
    expect(await fs.readFile(lineagePath(runDir))).toEqual(lineageBefore);
    for (const [fileName, bytes] of Object.entries(obsoleteBefore)) {
      expect(await fs.readFile(path.join(runDir, fileName))).toEqual(bytes);
    }
  });

  it("retains equivalent current-v5 bytes while cleaning obsolete files and rejects identity conflict without mutation", async () => {
    const currentId = "already-v5";
    const currentDir = standaloneDir(currentId);
    await writeStandaloneMetadata(currentId);
    await writeActiveRaw(currentDir, rawTrace("raw-v5", "Current exact context"));
    const currentBytes = Buffer.from(`${JSON.stringify(strictV5(currentId, "raw-v5", "Current exact context"), null, 2)}\n`);
    await writeText(snapshotPath(currentDir), currentBytes);
    await seedObsolete(currentDir);

    const rejectedId = "identity-rejected";
    const rejectedDir = standaloneDir(rejectedId);
    await writeStandaloneMetadata(rejectedId);
    const rejectedSnapshot = Buffer.from(`${JSON.stringify(userSnapshot("different-id", 4, "raw-reject", "Must not move"))}\n`);
    await writeText(snapshotPath(rejectedDir), rejectedSnapshot);
    const rejectedObsolete = await seedObsolete(rejectedDir);

    const result = await new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir).execute();

    expect(result.status).toBe("FAILED");
    expect(result.summary).toMatchObject({ migratedCount: 1, failedCount: 1 });
    expect(await fs.readFile(snapshotPath(currentDir))).toEqual(currentBytes);
    for (const fileName of obsoleteFiles) expect(await exists(path.join(currentDir, fileName))).toBe(false);
    expect(await fs.readFile(snapshotPath(rejectedDir))).toEqual(rejectedSnapshot);
    for (const [fileName, bytes] of Object.entries(rejectedObsolete)) {
      expect(await fs.readFile(path.join(rejectedDir, fileName))).toEqual(bytes);
    }
  });

  it("runs the default prerequisite class order through the ordinary runner and preserves a raw-1-backed direct upgrade", async () => {
    const defaultDefinitions = new AppDataMigrationRegistry().listDefinitions();
    const externalIndex = defaultDefinitions.findIndex((item) => item instanceof RemoveExternalRuntimeWorkingContextSnapshotsMigration);
    const rotationIndex = defaultDefinitions.findIndex((item) => item instanceof RawTraceRotationLayoutMigration);
    const activeNameIndex = defaultDefinitions.findIndex((item) => item instanceof RawTraceActiveFileNameMigration);
    const nativeIndex = defaultDefinitions.findIndex((item) => item instanceof MigrateNativeWorkingContextSnapshotsV5Migration);
    expect([externalIndex, rotationIndex, activeNameIndex, nativeIndex]).toEqual([3, 4, 5, 6]);

    const runId = "ordinary-runner-direct-upgrade";
    const runDir = standaloneDir(runId);
    await writeStandaloneMetadata(runId);
    const rawBefore = await writeActiveRaw(
      runDir,
      rawTrace("raw-1", "Legacy filename retains this exact user message"),
      OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME,
    );
    await writeJson(snapshotPath(runDir), userSnapshot(
      runId,
      4,
      "raw-1",
      "Legacy filename retains this exact user message",
    ));

    const repository = new InMemoryMigrationRepository();
    const pipeline = [
      new RemoveExternalRuntimeWorkingContextSnapshotsMigration(memoryDir),
      new RawTraceRotationLayoutMigration(memoryDir),
      new RawTraceActiveFileNameMigration(memoryDir),
      new MigrateNativeWorkingContextSnapshotsV5Migration(memoryDir),
    ];
    const statuses = await new AppDataMigrationRunner(
      new AppDataMigrationRegistry(pipeline),
      repository,
      { logsDir: path.join(memoryDir, "migration-logs") },
    ).runPending();

    expect(statuses.map(({ migrationId, status }) => ({ migrationId, status }))).toEqual(
      pipeline.map(({ id }) => ({ migrationId: id, status: "SUCCEEDED" })),
    );
    expect(await exists(path.join(runDir, OLD_RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toBe(false);
    expect(await fs.readFile(path.join(runDir, RAW_TRACES_ACTIVE_MEMORY_FILE_NAME))).toEqual(rawBefore);
    const migrated = JSON.parse(await fs.readFile(snapshotPath(runDir), "utf-8"));
    expect(WorkingContextSnapshotSerializer.validate(migrated)).toBe(true);
    expect(migrated.messages).toMatchObject([
      { role: "user", content: "Legacy filename retains this exact user message" },
    ]);
    expect([...repository.records.values()].map(({ migrationId, status }) => ({ migrationId, status })))
      .toEqual(pipeline.map(({ id }) => ({ migrationId: id, status: "SUCCEEDED" })));

    const migratedSnapshotStore = new WorkingContextSnapshotStore(memoryDir, runId);
    const restoredMemoryStore = new FileMemoryStore(memoryDir, runId);
    const restoredLineageScope = {
      targetKind: "agent_run" as const,
      runId,
      memberId: null,
    };
    const restoredManager = new MemoryManager({
      store: restoredMemoryStore,
      workingContextSnapshotStore: migratedSnapshotStore,
      lineageStore: new FileCompactionLineageStore(restoredMemoryStore.agentDir, restoredLineageScope),
      lineageScope: restoredLineageScope,
      agentId: runId,
    });
    new WorkingContextSnapshotBootstrapper(migratedSnapshotStore).bootstrap(
      restoredManager,
      "Ignored current system prompt",
      { maxItemChars: null },
    );
    expect(restoredManager.getWorkingContextMessages()).toMatchObject([
      { role: "user", content: "Legacy filename retains this exact user message" },
    ]);

    restoredManager.appendWorkingContextUserMessage(
      new Message(MessageRole.USER, { content: "Continue after direct upgrade" }),
      { turnId: "turn-2" },
    );
    const continued = migratedSnapshotStore.read(runId)!;
    expect(WorkingContextSnapshotSerializer.validate(continued)).toBe(true);
    expect(continued.messages).toMatchObject([{
      role: "user",
      content: expect.stringContaining("Continue after direct upgrade"),
    }]);
    expect(JSON.stringify(continued)).toContain("Legacy filename retains this exact user message");
  });
});
