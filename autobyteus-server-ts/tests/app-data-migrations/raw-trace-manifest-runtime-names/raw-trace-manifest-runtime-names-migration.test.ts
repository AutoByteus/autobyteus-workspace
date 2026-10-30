import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type { AppDataMigrationRecordRepositoryLike, AppDataMigrationRecordSnapshot } from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { RawTraceActiveFileNameMigration } from "../../../src/app-data-migrations/migrations/raw-trace-active-file-name/raw-trace-active-file-name-migration.js";
import { RawTraceRotationLayoutMigration } from "../../../src/app-data-migrations/migrations/raw-trace-rotation-layout/raw-trace-rotation-layout-migration.js";
import {
  RAW_TRACE_MANIFEST_RUNTIME_NAMES_MIGRATION_ID,
  RawTraceManifestRuntimeNamesMigration,
} from "../../../src/app-data-migrations/migrations/raw-trace-manifest-runtime-names/raw-trace-manifest-runtime-names-migration.js";
import {
  CURRENT_RUNTIME_VALUES,
  MANIFEST_TEMP_FILE_NAME,
  OLD_RUNTIME_LABELS,
} from "../../../src/app-data-migrations/migrations/raw-trace-manifest-runtime-names/raw-trace-manifest-runtime-names-files.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * autobyteus-343: the runtime of each archived segment in `raw_traces_manifest.json` is the `RuntimeKind` value.
 * Fixtures are hand-built manifests shaped like the ones the library writes (compact JSON; keys `schema_version`,
 * `next_segment_index`, `segments[]`); nothing is copied from a real node.
 */

const MANIFEST = "raw_traces_manifest.json";
let memoryDir: string;

const entry = (index: number, runtimeKind: unknown, extra: Record<string, unknown> = {}): Record<string, unknown> => ({
  index,
  file_name: `raw_traces_${String(index).padStart(6, "0")}.jsonl`,
  boundary_type: "provider_compaction_boundary",
  boundary_key: `boundary-${index}`,
  boundary_trace_id: `trace-${index}`,
  ...(runtimeKind === undefined ? {} : { runtime_kind: runtimeKind }),
  source_event: "codex.thread_compacted",
  archived_at: 1_790_000_000 + index,
  first_trace_id: `a-${index}`,
  last_trace_id: `b-${index}`,
  first_ts: 1,
  last_ts: 2,
  record_count: 10 + index,
  status: "complete",
  ...extra,
});

const manifestOf = (...entries: Record<string, unknown>[]): Record<string, unknown> =>
  ({ schema_version: 1, next_segment_index: entries.length + 1, segments: entries });

const writeManifest = async (relativeRunDir: string, content: unknown): Promise<string> => {
  const runDir = path.join(memoryDir, relativeRunDir);
  await fs.mkdir(runDir, { recursive: true });
  const filePath = path.join(runDir, MANIFEST);
  await fs.writeFile(filePath, typeof content === "string" ? content : JSON.stringify(content), "utf-8");
  return filePath;
};

const read = (filePath: string): Promise<string> => fs.readFile(filePath, "utf-8");
const readManifest = async (filePath: string): Promise<{ segments: Record<string, unknown>[] } & Record<string, unknown>> =>
  JSON.parse(await read(filePath));
const exists = (filePath: string): Promise<boolean> => fs.access(filePath).then(() => true, () => false);
const run = () => new RawTraceManifestRuntimeNamesMigration(memoryDir).execute();

beforeEach(async () => {
  memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "raw-trace-manifest-runtime-names-"));
});
afterEach(async () => {
  await fs.chmod(memoryDir, 0o755).catch(() => undefined);
  await fs.rm(memoryDir, { recursive: true, force: true });
});

describe("RawTraceManifestRuntimeNamesMigration: conversion (AC-002)", () => {
  it("converts every old label to its RuntimeKind value and changes nothing else: other keys, unknown keys, key order, entry order", async () => {
    const filePath = await writeManifest("agents/run_a", manifestOf(
      entry(1, "CODEX"), entry(2, "CLAUDE"), entry(3, "ANTIGRAVITY"), entry(4, "GROK_BUILD"), entry(5, "AUTOBYTEUS"),
      entry(6, "CODEX", { vendor_note: { nested: [1, 2] }, another: null }),
    ));
    const before = await readManifest(filePath);

    const result = await run();

    const after = await readManifest(filePath);
    expect(after.segments.map((segment) => segment.runtime_kind)).toEqual([
      "codex_app_server", "claude_agent_sdk", "antigravity_cli", "grok_build", "autobyteus", "codex_app_server"]);
    // The file is the same document with only the six values replaced, in compact form like the library's own writes.
    const expected = JSON.parse(JSON.stringify(before)) as typeof before;
    expected.segments.forEach((segment, position) => { segment.runtime_kind = after.segments[position]!.runtime_kind; });
    expect(await read(filePath)).toBe(JSON.stringify(expected));
    expect(Object.keys(after.segments[5]!)).toEqual(Object.keys(before.segments[5]!));
    expect(after.segments[5]).toMatchObject({ vendor_note: { nested: [1, 2] }, another: null });
    expect(result).toMatchObject({ status: "SUCCEEDED", errorMessage: null, summary: { scannedCount: 1, migratedCount: 1, failedCount: 0 } });
  });

  it("converts a pending entry like a complete one", async () => {
    const filePath = await writeManifest("agents/run_pending", manifestOf(entry(1, "CODEX", { status: "pending" })));
    await run();
    expect((await readManifest(filePath)).segments[0]).toMatchObject({ runtime_kind: "codex_app_server", status: "pending" });
  });

  it("leaves null, a missing key, and RuntimeKind values as they are, and converts only the old labels of a mixed manifest", async () => {
    const mixed = await writeManifest("agents/run_mixed", manifestOf(
      entry(1, "codex_app_server"), entry(2, "CLAUDE"), entry(3, null), entry(4, undefined), entry(5, "autobyteus")));
    const result = await run();
    const segments = (await readManifest(mixed)).segments;
    expect(segments.map((segment) => segment.runtime_kind)).toEqual(["codex_app_server", "claude_agent_sdk", null, undefined, "autobyteus"]);
    expect(Object.hasOwn(segments[3]!, "runtime_kind")).toBe(false);
    expect(result.summary.migratedCount).toBe(1);
  });

  it("does not touch a manifest with nothing to convert: all current, null, missing, or no entries", async () => {
    const files = [
      await writeManifest("agents/current", manifestOf(entry(1, "codex_app_server"), entry(2, "grok_build"))),
      await writeManifest("agents/nulls", manifestOf(entry(1, null), entry(2, undefined))),
      await writeManifest("agents/empty", manifestOf()),
    ];
    const before = await Promise.all(files.map(read));
    const result = await run();
    expect(await Promise.all(files.map(read))).toEqual(before);
    expect(result).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 3, migratedCount: 0, failedCount: 0 } });
    expect(result.summary.details).toEqual([]);
  });
});

describe("RawTraceManifestRuntimeNamesMigration: families and depths (REQ-002, REQ-007)", () => {
  it("visits agents/<run>, agent_teams/<team>/<member> and agent_orgs/<org>/<team>/<member> and nothing else", async () => {
    const own = [
      await writeManifest("agents/run_1", manifestOf(entry(1, "CODEX"))),
      await writeManifest("agent_teams/team_1/member_1", manifestOf(entry(1, "CLAUDE"))),
      await writeManifest("agent_orgs/org_1/team_1/member_1", manifestOf(entry(1, "AUTOBYTEUS"))),
    ];
    const untouched = [
      await writeManifest("agent_teams/team_1", manifestOf(entry(1, "CODEX"))),
      await writeManifest("agent_orgs/org_1/team_1", manifestOf(entry(1, "CODEX"))),
      await writeManifest("agents/run_1/nested/deeper", manifestOf(entry(1, "CODEX"))),
      await writeManifest("agent_teams/team_1/member_1/nested", manifestOf(entry(1, "CODEX"))),
      await writeManifest("imports/source_a/agents/run_9", manifestOf(entry(1, "CODEX"))),
      await writeManifest("imports/source_a/agent_teams/team_9/member_9", manifestOf(entry(1, "ANTIGRAVITY"))),
      await writeManifest("other/run_1", manifestOf(entry(1, "CODEX"))),
    ];
    const importSync = path.join(memoryDir, "imports/source_a/sync-manifest.json");
    await fs.writeFile(importSync, "{\"files\":{}}", "utf-8");
    const before = await Promise.all(untouched.map(read));
    const archiveManifest = await writeManifest("agents/run_1", manifestOf(entry(1, "CODEX")));
    await fs.writeFile(path.join(memoryDir, "agents/run_1/raw_traces_archive_manifest.json"), "{\"segments\":[{\"runtime_kind\":\"CODEX\"}]}", "utf-8");

    const result = await run();

    expect((await Promise.all(own.map(readManifest))).map((manifest) => manifest.segments[0]!.runtime_kind))
      .toEqual(["codex_app_server", "claude_agent_sdk", "autobyteus"]);
    expect(await Promise.all(untouched.map(read))).toEqual(before);
    expect(await read(importSync)).toBe("{\"files\":{}}");
    expect(await read(path.join(memoryDir, "agents/run_1/raw_traces_archive_manifest.json"))).toContain("CODEX");
    expect(archiveManifest).toBe(own[0]);
    expect(result.summary).toMatchObject({ scannedCount: 3, migratedCount: 3 });
  });

  it("a node with no archived segments, or no memory folder at all, has nothing to do", async () => {
    expect(await run()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0, migratedCount: 0 } });
    await fs.rm(memoryDir, { recursive: true, force: true });
    expect(await run()).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 0 } });
  });
});

describe("RawTraceManifestRuntimeNamesMigration: idempotence and interruption (AC-003, AC-007)", () => {
  it("a second run finds everything current and changes nothing, not even a modification time", async () => {
    const files = [
      await writeManifest("agents/run_1", manifestOf(entry(1, "CODEX"))),
      await writeManifest("agent_teams/t/m", manifestOf(entry(1, "CLAUDE"))),
    ];
    await run();
    const stamps = await Promise.all(files.map(async (file) => [await read(file), (await fs.stat(file)).mtimeMs] as const));

    const second = await run();

    expect(await Promise.all(files.map(async (file) => [await read(file), (await fs.stat(file)).mtimeMs] as const))).toEqual(stamps);
    expect(second).toMatchObject({ status: "SUCCEEDED", summary: { scannedCount: 2, migratedCount: 0, failedCount: 0 } });
  });

  it("an attempt that stopped after some manifests is completed by the next one, which touches only the rest", async () => {
    const done = await writeManifest("agents/done", manifestOf(entry(1, "codex_app_server")));
    const rest = await writeManifest("agents/rest", manifestOf(entry(1, "CODEX"), entry(2, "codex_app_server")));
    const doneBefore = await read(done);
    const doneStamp = (await fs.stat(done)).mtimeMs;
    const result = await run();
    expect(await read(done)).toBe(doneBefore);
    expect((await fs.stat(done)).mtimeMs).toBe(doneStamp);
    expect((await readManifest(rest)).segments.map((segment) => segment.runtime_kind)).toEqual(["codex_app_server", "codex_app_server"]);
    expect(result.summary.migratedCount).toBe(1);
  });

  it("a leftover temporary file of an interrupted attempt is replaced when the manifest converts, and removed in every other case", async () => {
    const convertible = await writeManifest("agents/convertible", manifestOf(entry(1, "CODEX")));
    const current = await writeManifest("agents/current", manifestOf(entry(1, "autobyteus")));
    const unusable = await writeManifest("agents/unusable", "{not json");
    const temps = [convertible, current, unusable].map((file) => path.join(path.dirname(file), MANIFEST_TEMP_FILE_NAME));
    for (const temp of temps) await fs.writeFile(temp, "{\"half\":", "utf-8");
    const currentBefore = await read(current);
    const unusableBefore = await read(unusable);

    const result = await run();

    for (const temp of temps) expect(await exists(temp)).toBe(false);
    expect((await readManifest(convertible)).segments[0]!.runtime_kind).toBe("codex_app_server");
    expect(await read(current)).toBe(currentBefore);
    expect(await read(unusable)).toBe(unusableBefore);
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(MANIFEST_TEMP_FILE_NAME).toBe("raw_traces_manifest.json.tmp");
  });
});

describe("RawTraceManifestRuntimeNamesMigration: unusable content is kept and reported (AC-004)", () => {
  const unusableCases: ReadonlyArray<readonly [string, unknown, string]> = [
    ["unknown string value", manifestOf(entry(1, "CODEX"), entry(2, "CODEX_APP_SERVER")), "unknown runtime_kind value"],
    ["empty string value", manifestOf(entry(1, "")), "unknown runtime_kind value"],
    ["number value", manifestOf(entry(1, 7)), "runtime_kind that is not text"],
    ["object value", manifestOf(entry(1, { name: "CODEX" })), "runtime_kind that is not text"],
    ["an entry that is not an object", { schema_version: 1, next_segment_index: 2, segments: [entry(1, "CODEX"), "x"] }, "segment 1 is not an object"],
    ["segments is not an array", { schema_version: 1, next_segment_index: 1, segments: { a: 1 } }, "no segment list"],
    ["no segments key", { schema_version: 1, next_segment_index: 1 }, "no segment list"],
    ["root is not an object", [entry(1, "CODEX")], "not a JSON object"],
    ["invalid JSON", "{\"segments\":[", "not valid JSON"],
    ["empty file", "", "not valid JSON"],
  ];

  it.each(unusableCases)("%s: byte-identical, reported with its run and reason, and the other runs still convert", async (_name, content, reason) => {
    const bad = await writeManifest("agents/bad_run", content);
    const good = await writeManifest("agents/good_run", manifestOf(entry(1, "CODEX")));
    const before = await read(bad);

    const result = await run();

    expect(await read(bad)).toBe(before);
    expect((await readManifest(good)).segments[0]!.runtime_kind).toBe("codex_app_server");
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.errorMessage).toBeNull();
    expect(result.summary).toMatchObject({ scannedCount: 2, migratedCount: 1, failedCount: 0 });
    expect(result.summary.details.find((detail) => detail.itemId === "agents/bad_run")).toMatchObject({
      status: "SKIPPED", filePath: bad, message: expect.stringContaining(reason) });
  });

  it("is a warning, never a failure, when nothing converted at all", async () => {
    await writeManifest("agents/bad_run", manifestOf(entry(1, "NOT_A_RUNTIME")));
    expect(await run()).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", summary: { migratedCount: 0, failedCount: 0 } });
  });

  it("an unreadable manifest is kept and reported", async () => {
    if (process.getuid?.() === 0) return;
    const bad = await writeManifest("agents/unreadable", manifestOf(entry(1, "CODEX")));
    await fs.chmod(bad, 0o000);
    const good = await writeManifest("agents/good_run", manifestOf(entry(1, "CLAUDE")));
    const result = await run();
    await fs.chmod(bad, 0o644);
    expect(await readManifest(bad)).toMatchObject({ segments: [{ runtime_kind: "CODEX" }] });
    expect((await readManifest(good)).segments[0]!.runtime_kind).toBe("claude_agent_sdk");
    expect(result.status).toBe("SUCCEEDED_WITH_WARNINGS");
    expect(result.summary.details.find((detail) => detail.itemId === "agents/unreadable")?.message).toContain("cannot be read");
  });

  it("a node with none of these ends SUCCEEDED, whatever the number of converted runs", async () => {
    await writeManifest("agents/only_current", manifestOf(entry(1, "grok_build")));
    expect(await run()).toMatchObject({ status: "SUCCEEDED" });
  });
});

describe("RawTraceManifestRuntimeNamesMigration: a failed write (AC-004)", () => {
  it("ends FAILED, leaves the manifest as it was and no temporary file, and the next run retries", async () => {
    const filePath = await writeManifest("agents/blocked", manifestOf(entry(1, "CODEX")));
    const before = await read(filePath);
    // A folder where the temporary file belongs makes the write fail after the decision.
    await fs.mkdir(path.join(path.dirname(filePath), MANIFEST_TEMP_FILE_NAME));
    const other = await writeManifest("agents/other", manifestOf(entry(1, "CLAUDE")));

    const failed = await run();

    expect(failed.status).toBe("FAILED");
    expect(failed.errorMessage).toContain("1 raw trace manifest could not be converted");
    expect(await read(filePath)).toBe(before);
    expect(failed.summary.details.find((detail) => detail.itemId === "agents/blocked")).toMatchObject({ status: "FAILED" });
    expect((await readManifest(other)).segments[0]!.runtime_kind).toBe("claude_agent_sdk");

    await fs.rm(path.join(path.dirname(filePath), MANIFEST_TEMP_FILE_NAME), { recursive: true });
    expect(await run()).toMatchObject({ status: "SUCCEEDED", summary: { migratedCount: 1 } });
    expect((await readManifest(filePath)).segments[0]!.runtime_kind).toBe("codex_app_server");
  });

  it("an error while walking ends FAILED with the reason", async () => {
    await fs.mkdir(path.join(memoryDir, "agents"), { recursive: true });
    if (process.getuid?.() === 0) return;
    await fs.chmod(path.join(memoryDir, "agents"), 0o000);
    const result = await run();
    await fs.chmod(path.join(memoryDir, "agents"), 0o755);
    expect(result.status).toBe("FAILED");
    expect(result.errorMessage).toContain("Stopped while looking for raw trace manifests");
  });
});

describe("RawTraceManifestRuntimeNamesMigration: the frozen table and the registry", () => {
  it("maps the five old labels onto exactly the RuntimeKind values, so the frozen copy cannot drift", () => {
    expect(Object.keys(OLD_RUNTIME_LABELS).sort()).toEqual(["ANTIGRAVITY", "AUTOBYTEUS", "CLAUDE", "CODEX", "GROK_BUILD"]);
    expect([...CURRENT_RUNTIME_VALUES].sort()).toEqual(Object.values(RuntimeKind).sort());
    expect(Object.values(OLD_RUNTIME_LABELS).sort()).toEqual(Object.values(RuntimeKind).sort());
  });

  it("is registered last, after both raw-trace layout migrations it names, required on startup and startup-only", () => {
    const definitions = new AppDataMigrationRegistry().listDefinitions();
    const ids = definitions.map((definition) => definition.id);
    const last = definitions.at(-1)!;
    expect(last).toBeInstanceOf(RawTraceManifestRuntimeNamesMigration);
    expect(last.id).toBe(RAW_TRACE_MANIFEST_RUNTIME_NAMES_MIGRATION_ID);
    expect(last).toMatchObject({ requiredOnStartup: true, executionPolicy: "STARTUP_ONLY" });
    expect(last.holdsBackCapabilities ?? []).toEqual([]);
    expect(last.prerequisiteMigrationIds).toEqual(["20260617_raw_trace_rotation_layout", "20260707_raw_trace_active_file_name"]);
    for (const prerequisite of last.prerequisiteMigrationIds!) expect(ids.indexOf(prerequisite)).toBeGreaterThanOrEqual(0);
  });
});

describe("RawTraceManifestRuntimeNamesMigration: through the real runner", () => {
  class MemoryRecords implements AppDataMigrationRecordRepositoryLike {
    records = new Map<string, AppDataMigrationRecordSnapshot>();
    async getRecord(id: string) { return this.records.get(id) ?? null; }
    async listRecords() { return [...this.records.values()]; }
    async markRunning(input: { migrationId: string; displayName: string; startedAt: Date }) {
      const record = { migrationId: input.migrationId, displayName: input.displayName, status: "RUNNING" as const, attempts: (this.records.get(input.migrationId)?.attempts ?? 0) + 1,
        startedAt: input.startedAt, completedAt: null, summary: null, errorMessage: null, logPath: null };
      this.records.set(input.migrationId, record);
      return record;
    }
    async complete(input: { migrationId: string; displayName: string; status: "SUCCEEDED" | "FAILED" | "SUCCEEDED_WITH_WARNINGS"; completedAt: Date; summary: string; errorMessage: string | null; logPath: string | null }) {
      const previous = this.records.get(input.migrationId);
      const record = { ...input, attempts: previous?.attempts ?? 1, startedAt: previous?.startedAt ?? null };
      this.records.set(input.migrationId, record);
      return record;
    }
    async markFailed(input: { migrationId: string; displayName: string; completedAt: Date; summary: string; errorMessage: string; logPath: string | null }) {
      return this.complete({ ...input, status: "FAILED" });
    }
  }

  it("runs after the layout migrations it names, records the outcome once, and a second start does no work", async () => {
    const file = await writeManifest("agents/run_1", manifestOf(entry(1, "CODEX")));
    // The layout migration checks that the segment file a manifest names exists.
    await fs.writeFile(path.join(path.dirname(file), "raw_traces_000001.jsonl"), "", "utf-8");
    const records = new MemoryRecords();
    const registry = new AppDataMigrationRegistry([
      new RawTraceRotationLayoutMigration(memoryDir),
      new RawTraceActiveFileNameMigration(memoryDir),
      new RawTraceManifestRuntimeNamesMigration(memoryDir),
    ]);
    const runner = new AppDataMigrationRunner(registry, records, { logsDir: path.join(memoryDir, "..", `${path.basename(memoryDir)}-logs`) });

    const first = await runner.runPending();
    expect(first.map((status) => [status.migrationId, status.status])).toEqual([
      ["20260617_raw_trace_rotation_layout", "SUCCEEDED"],
      ["20260707_raw_trace_active_file_name", "SUCCEEDED"],
      [RAW_TRACE_MANIFEST_RUNTIME_NAMES_MIGRATION_ID, "SUCCEEDED"],
    ]);
    expect((await readManifest(file)).segments[0]!.runtime_kind).toBe("codex_app_server");

    // A manifest written by an older build after this point is not looked at again: completed means completed.
    await fs.writeFile(file, JSON.stringify(manifestOf(entry(1, "CODEX"))), "utf-8");
    await runner.runPending();
    expect((await readManifest(file)).segments[0]!.runtime_kind).toBe("CODEX");
    expect(records.records.get(RAW_TRACE_MANIFEST_RUNTIME_NAMES_MIGRATION_ID)?.attempts).toBe(1);
    await fs.rm(path.join(memoryDir, "..", `${path.basename(memoryDir)}-logs`), { recursive: true, force: true });
  });
});
