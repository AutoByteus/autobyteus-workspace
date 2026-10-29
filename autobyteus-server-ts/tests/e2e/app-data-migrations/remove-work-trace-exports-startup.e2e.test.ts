import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";

// The retired work-trace exports through the actual built Studio startup (`dist/app.js`): the registered
// startup migration `20261019_remove_work_trace_exports`, the repository migration runner and GraphQL
// (DS-005, BEH-W6, DEC-W10). The data root is small and synthesized in the released shapes:
//   (a) agents/<run>/work_traces/        (b) agents/<run>/self_evolution/work_traces/
//   (c) agents/<run>/skill_improvement/work_traces/   and a team member's <team>/<member>/work_traces/
// plus a decoy `work_traces` folder without the export manifest and a `work_traces` symlink to an
// export outside the memory folder. Raw traces and every other file must be untouched; a second start
// must change nothing. No model, no runtime CLI.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
const MIGRATION_ID = "20261019_remove_work_trace_exports";

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
const exists = (target: string) => fs.lstat(target).then(() => true, () => false);
const memory = (...parts: string[]) => path.join(root, "memory", ...parts);

/** Only this test-owned root: private HOME and database; no inherited AUTOBYTEUS_* or provider values. */
const environment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
    .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" });
};

/** A released export: `work_traces_manifest.json` (schema 3) plus rendered `work_trace_*.md` files. */
const writeExport = async (dir: string, memoryDir: string, files: string[]) => {
  await fs.mkdir(dir, { recursive: true });
  for (const file of files) await fs.writeFile(path.join(dir, file), `# Work trace\n\n- user: hello from ${file}\n`);
  await fs.writeFile(path.join(dir, "work_traces_manifest.json"), `${JSON.stringify({
    schemaVersion: 3,
    target: { kind: "agent_run", runId: path.basename(memoryDir) },
    targetDisplayName: "Daily Assistant",
    generatedAt: "2026-09-20T10:00:00.000Z",
    workTraceRootPath: dir,
    manifestPath: path.join(dir, "work_traces_manifest.json"),
    files: files.map(fileName => ({ sourceId: fileName.replace("work_trace_", "raw_traces_").replace(".md", ".jsonl"),
      sourceKind: fileName.includes("active") ? "active" : "archive", sourceDisplayName: fileName, fileName,
      filePath: path.join(dir, fileName), recordCount: 2, firstTimestamp: null, lastTimestamp: null,
      generatedAt: "2026-09-20T10:00:00.000Z" })),
  }, null, 2)}\n`);
};
const rawTrace = (id: string, text: string) =>
  `${JSON.stringify({ id, turn_id: "turn_1", seq: 1, ts: 1790000000, trace_type: "user", content: text })}\n`;

/** Relative path → sha256 for every file under `dir` (symlinks recorded by their target). */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name), rel = path.relative(dir, full);
      if (entry.isSymbolicLink()) out[rel] = `link→${await fs.readlink(full)}`;
      else if (entry.isDirectory()) { out[`${rel}/`] = "dir"; await walk(full); }
      else out[rel] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(dir);
  return out;
};

const setupRoot = async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "work-trace-exports-startup-e2e-"));
  await fs.mkdir(path.join(root, "home"));
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
  // (a) a standalone run with its export.
  const runA = memory("agents", "daily_assistant_aaaa");
  await fs.mkdir(runA, { recursive: true });
  await fs.writeFile(path.join(runA, "raw_traces_active.jsonl"), rawTrace("rt_a1", "hello a"));
  await writeExport(path.join(runA, "work_traces"), runA, ["work_trace_active.md"]);
  // (b) a run with the older self-evolution export.
  const runB = memory("agents", "daily_assistant_bbbb");
  await fs.mkdir(path.join(runB, "self_evolution"), { recursive: true });
  await fs.writeFile(path.join(runB, "raw_traces_active.jsonl"), rawTrace("rt_b1", "hello b"));
  await fs.writeFile(path.join(runB, "self_evolution", "evolver_session.json"), "{\"kept\":true}\n");
  await writeExport(path.join(runB, "self_evolution", "work_traces"), runB, ["work_trace_000001.md", "work_trace_active.md"]);
  // (c) the skill-improvement location.
  const runC = memory("agents", "daily_assistant_cccc");
  await fs.mkdir(path.join(runC, "skill_improvement"), { recursive: true });
  await fs.writeFile(path.join(runC, "raw_traces_active.jsonl"), rawTrace("rt_c1", "hello c"));
  await writeExport(path.join(runC, "skill_improvement", "work_traces"), runC, ["work_trace_active.md"]);
  // A team member's export, next to its compaction segments.
  const member = memory("agent_teams", "article_team_tttt", "article_writer_mmmm");
  await fs.mkdir(member, { recursive: true });
  await fs.writeFile(path.join(member, "raw_traces_000001.jsonl"), rawTrace("rt_m1", "segment"));
  await fs.writeFile(path.join(member, "raw_traces_active.jsonl"), rawTrace("rt_m2", "active"));
  await writeExport(path.join(member, "work_traces"), member, ["work_trace_000001.md", "work_trace_active.md"]);
  // A decoy: a folder named work_traces that is not an export (no manifest); kept.
  const decoy = memory("agents", "daily_assistant_dddd", "work_traces");
  await fs.mkdir(decoy, { recursive: true });
  await fs.writeFile(path.join(decoy, "notes.md"), "my own notes\n");
  // A symlink named work_traces pointing at an export outside the memory folder; not followed.
  const outside = path.join(root, "outside-export");
  await writeExport(outside, outside, ["work_trace_active.md"]);
  const runE = memory("agents", "daily_assistant_eeee");
  await fs.mkdir(runE, { recursive: true });
  await fs.symlink(outside, path.join(runE, "work_traces"));
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
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  return { child, migration };
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true });
  root = "";
});

describe("Removal of retired work-trace exports on startup (built Studio)", () => {
  it("removes recognized exports at every released location once, keeps everything else, and is idempotent", async () => {
    await setupRoot();
    const exportDirs = [
      memory("agents", "daily_assistant_aaaa", "work_traces"),
      memory("agents", "daily_assistant_bbbb", "self_evolution", "work_traces"),
      memory("agents", "daily_assistant_cccc", "skill_improvement", "work_traces"),
      memory("agent_teams", "article_team_tttt", "article_writer_mmmm", "work_traces"),
    ];
    const before = await snapshot(memory());
    const outsideBefore = await snapshot(path.join(root, "outside-export"));

    const first = await studio();
    const record = await first.migration();
    expect(record, "migration registered").toBeTruthy();
    expect(record).toMatchObject({ status: "SUCCEEDED", errorMessage: null });
    for (const dir of exportDirs) expect(await exists(dir), dir).toBe(false);
    // The decoy, the symlink and its target are kept.
    expect(await fs.readFile(memory("agents", "daily_assistant_dddd", "work_traces", "notes.md"), "utf8")).toBe("my own notes\n");
    expect((await fs.lstat(memory("agents", "daily_assistant_eeee", "work_traces"))).isSymbolicLink()).toBe(true);
    expect(await snapshot(path.join(root, "outside-export"))).toEqual(outsideBefore);
    // Everything outside the removed exports is byte-identical (raw traces, decoy). The same start also runs the
    // later-registered 20261020_remove_skill_improvement_data, which deletes the old self-evolution session folder.
    const sessionDirs = [memory("agents", "daily_assistant_bbbb", "self_evolution")];
    expect(await exists(sessionDirs[0]!)).toBe(false);
    const removed = (rel: string) => [...exportDirs, ...sessionDirs].some(dir => path.join(memory(), rel).startsWith(dir));
    const after = await snapshot(memory());
    const expected = Object.fromEntries(Object.entries(before).filter(([rel]) => !removed(rel)));
    expect(Object.fromEntries(Object.entries(after).filter(([rel]) => rel in expected))).toEqual(expected);
    const summary = String(record.summary ?? "");
    const recordAttempts = record.attempts;
    await stop(first.child);

    // A second start: the migration is not run again and nothing changes.
    const second = await studio();
    const again = await second.migration();
    expect(again).toMatchObject({ status: "SUCCEEDED", attempts: recordAttempts });
    const afterSecond = await snapshot(memory());
    expect(Object.fromEntries(Object.entries(afterSecond).filter(([rel]) => rel in expected))).toEqual(expected);
    for (const dir of exportDirs) expect(await exists(dir)).toBe(false);
    console.info(`work-trace export migration summary: ${summary}`);
  }, 180_000);
});
