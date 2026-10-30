import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

// The stored runtime name of raw-trace manifests through the actual built Studio startup (`dist/app.js`):
// the registered startup migration `20261030_raw_trace_manifest_runtime_names`, the repository migration runner
// and the GraphQL status the Settings page reads (autobyteus-343: REQ-002, REQ-003, REQ-004, REQ-007; AC-002,
// AC-003, AC-004, AC-007). The data root is small and synthesized in the released shapes (compact JSON as the
// library writes it): never real data or a copy of it.
//   Journey 1 (clean): every old label, null, a missing key, already-current values, a pending segment, an entry
//     with an extra unknown key, the three families at their depths, a leftover temporary file; out of reach: a
//     Memory Sync import with its sync manifest, a manifest at the wrong depth, a legacy backup file. The record
//     ends SUCCEEDED, the layout migrations it depends on ran first, a second start changes nothing.
//   Journey 2 (warnings): unusable manifests (unknown value, invalid JSON, no segment list, non-text value, an entry
//     that is not an object) next to a convertible one: SUCCEEDED_WITH_WARNINGS, the others converted, the
//     unusable ones byte-identical and named with their reason in the migration's log; the server is available.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
// Command: pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/raw-trace-manifest-runtime-names-startup.e2e.test.ts --no-watch
const MIGRATION_ID = "20261030_raw_trace_manifest_runtime_names";
const LAYOUT_IDS = ["20260617_raw_trace_rotation_layout", "20260707_raw_trace_active_file_name"];
const MANIFEST = "raw_traces_manifest.json";
const LABELS: Record<string, string> = {
  CODEX: "codex_app_server", CLAUDE: "claude_agent_sdk", ANTIGRAVITY: "antigravity_cli", GROK_BUILD: "grok_build", AUTOBYTEUS: "autobyteus",
};

let root = "";
const children: ChildProcess[] = [];
const logs: string[] = [];

const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-4000)}`);
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try { await exited; } finally { clearTimeout(force); }
};
const memory = (...parts: string[]) => path.join(root, "memory", ...parts);
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);

/** Only this test-owned root: private HOME and database; no inherited AUTOBYTEUS_* or provider values. */
const environment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
    .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" });
};

type Entry = Record<string, unknown>;
/** One manifest entry in the released key order; `runtime` undefined leaves the key out. */
const entry = (index: number, runtime: unknown, extra: Entry = {}): Entry => ({
  index, file_name: `raw_traces_${String(index).padStart(6, "0")}.jsonl`, boundary_type: "provider_compaction_boundary",
  boundary_key: `boundary-${index}`, boundary_trace_id: `trace-${index}`, ...(runtime === undefined ? {} : { runtime_kind: runtime }),
  source_event: "synthetic.compaction", archived_at: 1_790_000_000 + index, first_trace_id: `a-${index}`, last_trace_id: `b-${index}`,
  first_ts: 1, last_ts: 2, record_count: 3, status: "complete", ...extra,
});
const manifest = (...entries: Entry[]) => ({ schema_version: 1, next_segment_index: entries.length + 1, segments: entries });
const compact = (value: unknown) => JSON.stringify(value);
/** What the migration must write: the same manifest with each old label replaced, nothing else touched. */
const converted = (value: ReturnType<typeof manifest>) => ({
  ...value, segments: value.segments.map(item => typeof item.runtime_kind === "string" && item.runtime_kind in LABELS
    ? { ...item, runtime_kind: LABELS[item.runtime_kind] } : item),
});

const rawTrace = (id: string, text: string) =>
  `${JSON.stringify({ id, turn_id: "turn_1", seq: 1, ts: 1790000000, trace_type: "user", content: text })}\n`;

/** A run folder with its active file, one segment file per manifest entry and the manifest text. */
const writeRun = async (relative: string, manifestText: string | null, segments = 1) => {
  const dir = memory(...relative.split("/"));
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, "raw_traces_active.jsonl"), rawTrace(`rt_${path.basename(dir)}`, "active"));
  for (let index = 1; index <= segments; index += 1) {
    await fs.writeFile(path.join(dir, `raw_traces_${String(index).padStart(6, "0")}.jsonl`), rawTrace(`rt_${path.basename(dir)}_${index}`, "segment"));
  }
  if (manifestText !== null) await fs.writeFile(path.join(dir, MANIFEST), manifestText);
  return dir;
};

/** Relative path → sha256 for every file under `dir`. */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const item of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, item.name);
      if (item.isDirectory()) await walk(full);
      else out[path.relative(dir, full)] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(dir);
  return out;
};

const studio = async () => {
  await fs.access(path.resolve("dist/app.js"));
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: environment(), stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Studio startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness");
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const gql = async (query: string) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query }) });
    const body = await response.json() as { errors?: unknown; data: any };
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data;
  };
  const records = async (): Promise<Array<Record<string, any>>> =>
    (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath startedAt completedAt requiredOnStartup}}")).getAppDataMigrations;
  const migration = async () => (await records()).find(item => item.migrationId === MIGRATION_ID);
  return { child, migration, records };
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = "";
});

const newRoot = async (prefix: string) => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), prefix));
  await fs.mkdir(path.join(root, "home"));
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
};

describe("Stored runtime names of raw-trace manifests on startup (built Studio)", () => {
  it("converts this node's own manifests once, keeps everything else byte-identical, and does nothing on the next start", async () => {
    await newRoot("runtime-names-startup-e2e-");
    // Convertible: one run per label, a mixed manifest, a pending segment, an extra unknown key, the other two families.
    const convertible: Record<string, ReturnType<typeof manifest>> = {
      "agents/run_codex": manifest(entry(1, "CODEX"), entry(2, "CODEX")),
      "agents/run_claude": manifest(entry(1, "CLAUDE")),
      "agents/run_agy": manifest(entry(1, "ANTIGRAVITY")),
      "agents/run_native": manifest(entry(1, "AUTOBYTEUS")),
      "agents/run_grok": manifest(entry(1, "GROK_BUILD")),
      "agents/run_mixed": manifest(entry(1, null), entry(2, undefined), entry(3, "claude_agent_sdk"), entry(4, "CODEX", { x_future: { nested: [1, 2] } })),
      "agents/run_pending": manifest(entry(1, "CODEX", { status: "pending" })),
      "agent_teams/team_one/member_one": manifest(entry(1, "CODEX")),
      "agent_orgs/org_one/team_one/member_one": manifest(entry(1, "CLAUDE")),
    };
    for (const [relative, value] of Object.entries(convertible)) await writeRun(relative, compact(value), value.segments.length);
    // Nothing to convert: all current, only null. Kept byte-identical, not rewritten.
    const current = { "agents/run_current": manifest(entry(1, "codex_app_server"), entry(2, "autobyteus")), "agents/run_null_only": manifest(entry(1, null)) };
    for (const [relative, value] of Object.entries(current)) await writeRun(relative, compact(value), value.segments.length);
    await writeRun("agents/run_no_archive", null, 0);
    // A leftover temporary file of an interrupted attempt next to a convertible manifest.
    await fs.writeFile(memory("agents", "run_codex", `${MANIFEST}.tmp`), "{\"partial\":");
    // ...and next to a manifest that needs no conversion (there the rename does not consume it, so only the cleanup removes it).
    await fs.writeFile(memory("agents", "run_current", `${MANIFEST}.tmp`), "{\"partial\":");
    // Out of reach of the migration: a Memory Sync import (with its sync manifest), a manifest at the wrong depth, a legacy backup.
    await writeRun("imports/other_node/agents/run_imported", compact(manifest(entry(1, "CODEX"))));
    await fs.writeFile(memory("imports", "other_node", "sync-manifest.json"), compact({ memorySyncSourceId: "other_node", files: {} }));
    await writeRun("agent_teams/team_one", compact(manifest(entry(1, "CODEX"))), 1);
    await fs.writeFile(memory("agents", "run_codex", "raw_traces_archive_manifest.json.backup-20260101"), compact(manifest(entry(1, "CODEX"))));

    const before = await snapshot(memory());
    const beforeStat = await fs.stat(memory("agents", "run_current", MANIFEST));

    const first = await studio();
    const record = await first.migration();
    expect(record, "migration registered").toBeTruthy();
    expect(record).toMatchObject({ status: "SUCCEEDED", errorMessage: null, requiredOnStartup: true, attempts: 1 });
    expect(record!.summary).toBe("Scanned 11; migrated 9; skipped 2; failed 0.");
    // The two layout migrations it depends on ran first, to completion, on this modern layout.
    const all = await first.records();
    for (const id of LAYOUT_IDS) {
      const layout = all.find(item => item.migrationId === id);
      expect(layout, id).toMatchObject({ status: expect.stringMatching(/^SUCCEEDED/) });
      expect(Date.parse(layout!.completedAt), id).toBeLessThanOrEqual(Date.parse(record!.startedAt));
    }

    // Converted: exactly the labels replaced; every other key (unknown ones too), the order and the compact form kept.
    for (const [relative, value] of Object.entries(convertible)) {
      expect(await fs.readFile(memory(...relative.split("/"), MANIFEST), "utf8"), relative).toBe(compact(converted(value)));
    }
    expect(JSON.parse(await fs.readFile(memory("agents", "run_mixed", MANIFEST), "utf8")).segments.map((item: Entry) => item.runtime_kind))
      .toEqual([null, undefined, "claude_agent_sdk", "codex_app_server"]);
    // Everything else is byte-identical: current manifests, imports and their sync manifest, wrong depth, backup, traces.
    const after = await snapshot(memory());
    const changed = Object.keys(convertible).map(relative => path.join(...relative.split("/"), MANIFEST));
    const expected = Object.fromEntries(Object.entries(before).filter(([rel]) => !changed.includes(rel) && !rel.endsWith(`${MANIFEST}.tmp`)));
    expect(Object.fromEntries(Object.entries(after).filter(([rel]) => rel in expected))).toEqual(expected);
    expect(Object.keys(after).filter(rel => rel.endsWith(".tmp")), "no temporary file left").toEqual([]);
    expect((await fs.stat(memory("agents", "run_current", MANIFEST))).mtimeMs, "a current manifest is not rewritten").toBe(beforeStat.mtimeMs);
    const convertedStats = Object.fromEntries(await Promise.all(changed.map(async rel => [rel, (await fs.stat(memory(rel))).mtimeMs] as const)));
    await stop(first.child);

    // A second start: not run again (attempts unchanged), no file changes, no new temporary file.
    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 1, summary: record!.summary });
    expect(await snapshot(memory())).toEqual(after);
    for (const rel of changed) expect((await fs.stat(memory(rel))).mtimeMs, rel).toBe(convertedStats[rel]);
  }, 240_000);

  it("keeps an unusable manifest as it is and says why, converts the rest, and ends with warnings", async () => {
    await newRoot("runtime-names-warnings-e2e-");
    const good = manifest(entry(1, "CODEX"));
    await writeRun("agents/run_good", compact(good));
    const unusable: Record<string, string> = {
      "agents/run_unknown_value": compact(manifest(entry(1, "OPENAI"))),
      "agents/run_bad_json": "{\"schema_version\":1,\"segments\":[",
      "agents/run_no_segments": compact({ schema_version: 1, next_segment_index: 1 }),
      "agents/run_number_value": compact(manifest(entry(1, 7))),
      "agent_teams/team_one/member_bad_entry": compact({ schema_version: 1, next_segment_index: 2, segments: ["not an entry"] }),
    };
    for (const [relative, text] of Object.entries(unusable)) await writeRun(relative, text);
    const before = await snapshot(memory());

    const first = await studio();
    const record = await first.migration();
    expect(record).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", errorMessage: null, attempts: 1 });
    expect(record!.summary).toBe("Scanned 6; migrated 1; skipped 5; failed 0.");
    expect(await fs.readFile(memory("agents", "run_good", MANIFEST), "utf8")).toBe(compact(converted(good)));
    const after = await snapshot(memory());
    for (const relative of Object.keys(unusable)) {
      const rel = path.join(...relative.split("/"), MANIFEST);
      expect(after[rel], `${relative} byte-identical`).toBe(before[rel]);
    }
    // Each exclusion is named with its run and reason in the migration's log.
    const log = await fs.readFile(record!.logPath, "utf8");
    for (const [run, reason] of [
      ["agents/run_unknown_value", "unknown runtime_kind value"], ["agents/run_bad_json", "not valid JSON"],
      ["agents/run_no_segments", "no segment list"], ["agents/run_number_value", "not text"],
      ["agent_teams/team_one/member_bad_entry", "is not an object"],
    ] as const) {
      expect(log, `${run}: ${reason}`).toMatch(new RegExp(`"itemId":"${run}"[^\\n]*${reason}`));
    }
    await stop(first.child);

    // Terminal: the next start does not run it again and changes nothing.
    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    expect(await snapshot(memory())).toEqual(after);
  }, 240_000);
});
