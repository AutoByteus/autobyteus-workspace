import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { RawTraceArchiveManager } from "autobyteus-ts/memory/store/raw-trace-archive-manager.js";
import { RawTraceRotationLayoutMigration } from "../../../src/app-data-migrations/migrations/raw-trace-rotation-layout-migration.js";

let memoryDir: string;

const OLD_MANIFEST = "raw_traces_archive_manifest.json";
const NEW_MANIFEST = "raw_traces_manifest.json";
const OLD_ARCHIVE_DIR = "raw_traces_archive";

const readJson = async (filePath: string): Promise<Record<string, unknown>> =>
  JSON.parse(await fs.readFile(filePath, "utf-8")) as Record<string, unknown>;

const pathExists = async (filePath: string): Promise<boolean> => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const segment = (input: {
  index: number;
  fileName: string;
  boundaryKey: string;
  status?: "complete" | "pending";
}) => ({
  index: input.index,
  file_name: input.fileName,
  boundary_type: "provider_compaction_boundary",
  boundary_key: input.boundaryKey,
  boundary_trace_id: `marker-${input.index}`,
  runtime_kind: "CODEX",
  source_event: "test",
  archived_at: input.index,
  first_trace_id: `rt-${input.index}`,
  last_trace_id: `rt-${input.index}`,
  first_ts: input.index,
  last_ts: input.index,
  record_count: 1,
  status: input.status ?? "complete",
});

const writeOldRun = async (
  relativeRunDir: string,
  segments: Array<ReturnType<typeof segment>>,
  options: { skipFiles?: string[] } = {},
): Promise<string> => {
  const runDir = path.join(memoryDir, relativeRunDir);
  await fs.mkdir(path.join(runDir, OLD_ARCHIVE_DIR), { recursive: true });
  for (const entry of segments) {
    if (options.skipFiles?.includes(entry.file_name)) {
      continue;
    }
    const fileName = path.basename(entry.file_name);
    await fs.writeFile(
      path.join(runDir, OLD_ARCHIVE_DIR, fileName),
      `${JSON.stringify({ id: `rt-${entry.index}`, ts: entry.index, seq: entry.index, turn_id: "turn-1" })}\n`,
      "utf-8",
    );
  }
  await fs.writeFile(
    path.join(runDir, OLD_MANIFEST),
    `${JSON.stringify({ schema_version: 1, next_segment_index: 10, segments }, null, 2)}\n`,
    "utf-8",
  );
  return runDir;
};

const readNewManifest = async (runDir: string) => readJson(path.join(runDir, NEW_MANIFEST));

const backupNames = async (runDir: string): Promise<string[]> =>
  (await fs.readdir(runDir)).filter((name) => name.includes("backup"));

describe("RawTraceRotationLayoutMigration", () => {
  beforeEach(async () => {
    memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-trace-rotation-layout-migration-"));
  });

  afterEach(async () => {
    await fs.rm(memoryDir, { recursive: true, force: true });
  });

  it("migrates standalone and nested team old layouts into direct raw trace rotation files", async () => {
    const standaloneDir = await writeOldRun("agents/run-1", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "standalone-boundary" }),
    ]);
    const teamMemberDir = await writeOldRun("agent_teams/team-1/member-run-1", [
      segment({ index: 2, fileName: "000002_20260430T103015123Z.jsonl", boundaryKey: "team-boundary" }),
    ]);

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.migratedCount).toBe(2);
    for (const [runDir, fileName, boundaryKey] of [
      [standaloneDir, "raw_traces_000001.jsonl", "standalone-boundary"],
      [teamMemberDir, "raw_traces_000002.jsonl", "team-boundary"],
    ] as const) {
      expect(await pathExists(path.join(runDir, fileName))).toBe(true);
      expect(await pathExists(path.join(runDir, NEW_MANIFEST))).toBe(true);
      expect(await pathExists(path.join(runDir, OLD_MANIFEST))).toBe(false);
      expect(await pathExists(path.join(runDir, OLD_ARCHIVE_DIR))).toBe(false);
      expect(await backupNames(runDir)).not.toHaveLength(0);
      const manifest = await readNewManifest(runDir);
      expect(manifest.segments).toEqual([
        expect.objectContaining({ file_name: fileName, boundary_key: boundaryKey, status: "complete" }),
      ]);
    }
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agents/run-1", backupPath: expect.stringContaining(`${OLD_MANIFEST}.backup-`) }),
      expect.objectContaining({ itemId: "agent_teams/team-1/member-run-1" }),
    ]));
  });

  it("skips already migrated runs and ignores old manifest backup evidence on rerun", async () => {
    const runDir = path.join(memoryDir, "agents", "run-new");
    await fs.mkdir(runDir, { recursive: true });
    await fs.writeFile(path.join(runDir, "raw_traces_000001.jsonl"), `${JSON.stringify({ id: "rt-1" })}\n`, "utf-8");
    await fs.writeFile(
      path.join(runDir, NEW_MANIFEST),
      `${JSON.stringify({ schema_version: 1, next_segment_index: 2, segments: [segment({ index: 1, fileName: "raw_traces_000001.jsonl", boundaryKey: "new" })] })}\n`,
      "utf-8",
    );
    await fs.writeFile(path.join(runDir, `${OLD_MANIFEST}.backup-2026-06-17T00-00-00-000Z`), "{}", "utf-8");

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.skippedCount).toBe(1);
    expect(result.summary.details[0]).toMatchObject({ itemId: "agents/run-new", status: "SKIPPED" });
  });

  it("isolates missing complete segment failures without blocking other runs", async () => {
    const goodDir = await writeOldRun("agents/run-good", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "good" }),
    ]);
    const badDir = await writeOldRun("agents/run-bad", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "bad" }),
    ], { skipFiles: ["000001_20260430T103015123Z.jsonl"] });

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.migratedCount).toBe(1);
    expect(result.summary.failedCount).toBe(1);
    expect(await pathExists(path.join(goodDir, NEW_MANIFEST))).toBe(true);
    expect(await pathExists(path.join(badDir, OLD_MANIFEST))).toBe(true);
    expect(await pathExists(path.join(badDir, NEW_MANIFEST))).toBe(false);
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agents/run-bad", status: "FAILED", message: expect.stringContaining("missing") }),
    ]));
  });

  it("excludes pending entries, backs up present pending files, and preserves next segment index", async () => {
    const mixedDir = await writeOldRun("agents/run-mixed", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "shared", status: "pending" }),
      segment({ index: 2, fileName: "000002_20260430T103015123Z.jsonl", boundaryKey: "shared", status: "complete" }),
    ]);
    const pendingOnlyDir = await writeOldRun("agents/run-pending-only", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "pending-present", status: "pending" }),
      segment({ index: 2, fileName: "000002_20260430T103015123Z.jsonl", boundaryKey: "pending-missing", status: "pending" }),
    ], { skipFiles: ["000002_20260430T103015123Z.jsonl"] });

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect((await readNewManifest(mixedDir)).segments).toEqual([
      expect.objectContaining({ index: 2, file_name: "raw_traces_000002.jsonl", boundary_key: "shared", status: "complete" }),
    ]);
    const pendingOnlyManifest = await readNewManifest(pendingOnlyDir);
    expect(pendingOnlyManifest.segments).toEqual([]);
    expect(pendingOnlyManifest.next_segment_index).toBe(10);
    expect(await pathExists(path.join(mixedDir, OLD_MANIFEST))).toBe(false);
    expect(await pathExists(path.join(pendingOnlyDir, OLD_MANIFEST))).toBe(false);
    expect((await fs.readdir(mixedDir)).some((name) => name.startsWith("raw_traces_migration_backup-"))).toBe(true);
    expect((await fs.readdir(pendingOnlyDir)).some((name) => name.startsWith("raw_traces_migration_backup-"))).toBe(true);
    expect(result.summary.details).toEqual(expect.arrayContaining([
      expect.objectContaining({ itemId: "agents/run-pending-only", message: expect.stringContaining("dropped") }),
    ]));
  });

  it("completes cleanup when both new and old manifests exist and the new layout is valid", async () => {
    const runDir = await writeOldRun("agents/run-partial", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "partial" }),
    ]);
    await fs.copyFile(
      path.join(runDir, OLD_ARCHIVE_DIR, "000001_20260430T103015123Z.jsonl"),
      path.join(runDir, "raw_traces_000001.jsonl"),
    );
    await fs.writeFile(
      path.join(runDir, NEW_MANIFEST),
      `${JSON.stringify({ schema_version: 1, next_segment_index: 2, segments: [segment({ index: 1, fileName: "raw_traces_000001.jsonl", boundaryKey: "partial" })] }, null, 2)}\n`,
      "utf-8",
    );

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details[0]).toMatchObject({ itemId: "agents/run-partial", status: "MIGRATED" });
    expect(await pathExists(path.join(runDir, OLD_MANIFEST))).toBe(false);
    expect(await pathExists(path.join(runDir, OLD_ARCHIVE_DIR))).toBe(false);
    expect(await backupNames(runDir)).not.toHaveLength(0);
  });

  it("recovers when runtime writes a new segment before an old-layout run is migrated", async () => {
    const runDir = await writeOldRun("agents/run-runtime-before-migration", [
      segment({ index: 1, fileName: "000001_20260430T103015123Z.jsonl", boundaryKey: "old-boundary" }),
    ]);

    const runtimeResult = new RawTraceArchiveManager(runDir).archiveRecords([
      { id: "rt-runtime", ts: 10, seq: 10, turn_id: "turn-1", trace_type: "assistant" },
    ], {
      boundaryType: "provider_compaction_boundary",
      boundaryKey: "runtime-boundary",
      boundaryTraceId: "rt-runtime-marker",
      runtimeKind: "CODEX",
      sourceEvent: "test",
    });

    expect(runtimeResult?.created).toBe(true);
    expect(await pathExists(path.join(runDir, NEW_MANIFEST))).toBe(true);
    expect(await pathExists(path.join(runDir, OLD_MANIFEST))).toBe(true);
    expect((await readNewManifest(runDir)).segments).toEqual(expect.arrayContaining([
      expect.objectContaining({ file_name: "000001_20260430T103015123Z.jsonl", boundary_key: "old-boundary" }),
      expect.objectContaining({ file_name: "raw_traces_000010.jsonl", boundary_key: "runtime-boundary" }),
    ]));

    const result = await new RawTraceRotationLayoutMigration(memoryDir).execute();

    expect(result.status).toBe("SUCCEEDED");
    expect(result.summary.details[0]).toMatchObject({
      itemId: "agents/run-runtime-before-migration",
      status: "MIGRATED",
    });
    expect(await pathExists(path.join(runDir, OLD_MANIFEST))).toBe(false);
    expect(await pathExists(path.join(runDir, OLD_ARCHIVE_DIR))).toBe(false);
    expect(await pathExists(path.join(runDir, "raw_traces_000001.jsonl"))).toBe(true);
    expect(await pathExists(path.join(runDir, "raw_traces_000010.jsonl"))).toBe(true);
    expect((await readNewManifest(runDir)).segments).toEqual(expect.arrayContaining([
      expect.objectContaining({ file_name: "raw_traces_000001.jsonl", boundary_key: "old-boundary" }),
      expect.objectContaining({ file_name: "raw_traces_000010.jsonl", boundary_key: "runtime-boundary" }),
    ]));
    expect(new RawTraceArchiveManager(runDir).readCompleteArchiveRawTraceDicts().map((trace) => trace.id)).toEqual([
      "rt-1",
      "rt-runtime",
    ]);
  });
});
